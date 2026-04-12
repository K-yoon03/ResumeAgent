package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Capability.CapabilityCode;
import com.kyoon.resumeagent.Capability.CapabilityLevel;
import com.kyoon.resumeagent.Capability.JobCapabilityProfile;
import com.kyoon.resumeagent.Capability.PromptPathResolver;
import com.kyoon.resumeagent.Capability.VectorSimilarityService;
import com.kyoon.resumeagent.Capability.VectorSimilarityService.UserCapability;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.Job;
import com.kyoon.resumeagent.Entity.InterviewData;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.InterviewDataRepository;
import com.kyoon.resumeagent.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DepthInterviewService {

    private final ChatModel chatModel;
    private final JobRepository jobRepository;
    private final AssessmentRepository assessmentRepository;
    private final InterviewDataRepository interviewDataRepository;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final VectorSimilarityService vectorSimilarityService;
    private final RagAnchorService ragAnchorService;

    /**
     * 심층 질문 생성
     */
    /**
     * 최종 점수 계산
     */
    @Transactional
    public Assessment calculateFinalScore(Long assessmentId) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        // DB에서 완료된 경험 데이터 읽기
        List<InterviewData> interviewDataList =
                interviewDataRepository.findByAssessmentIdOrderByCreatedAtAsc(assessmentId);

        List<Map<String, Object>> depthAnswers = interviewDataList.stream()
                .map(d -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("itemName", d.getItemName());
                    try {
                        item.put("qna", objectMapper.readValue(d.getRawQna(), List.class));
                    } catch (Exception e) {
                        item.put("qna", List.of());
                    }
                    return item;
                })
                .collect(java.util.stream.Collectors.toList());

        Job job = jobRepository.findByGroupCode(assessment.getEvaluatedJobCode())
                .orElseThrow(() -> new RuntimeException("Job not found"));

        String jobCode = assessment.getEvaluatedJobCode();
        String interviewAnalyzerPath = PromptPathResolver.interviewAnalyzer(jobCode);

        String depthAnswersText = buildDepthAnswersText(depthAnswers);

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).build())
                .build();

        // Step 1 - InterviewAnalyzer: capability별 evidence 추출 + 레벨 판정
        Resource analyzerPrompt = resourceLoader.getResource(interviewAnalyzerPath);
        PromptTemplate analyzerTemplate = new PromptTemplate(analyzerPrompt);

        String rawCodesForAnalyzer = JobCapabilityProfile.getRelevantCodeNames(jobCode);
        List<String> relevantCodesForAnalyzer = Arrays.stream(rawCodesForAnalyzer.split(",\\s*"))
                .map(s -> s.contains("(") ? s.substring(0, s.indexOf("(")).trim() : s.trim())
                .filter(s -> !s.isEmpty())
                .collect(java.util.stream.Collectors.toList());
        String anchorContext = ragAnchorService.getAnchorContextForCodes(relevantCodesForAnalyzer);
        String userInput = assessment.getExperience() != null ? assessment.getExperience() : "";

        Prompt analyzerPromptObj = analyzerTemplate.create(Map.of(
                "jobName", job.getGroupName(),
                "jobCode", jobCode,
                "capabilityList", rawCodesForAnalyzer,
                "userInput", userInput,
                "qnaText", depthAnswersText,
                "anchorContext", anchorContext
        ));

        String analyzerResponse = client.prompt(analyzerPromptObj).call().content();
        String analyzerJson = analyzerResponse.trim().replaceAll("```json", "").replaceAll("```", "").trim();
        JsonNode analyzerNode = objectMapper.readTree(analyzerJson);

        System.out.println("=== InterviewAnalyzer 원문 ===");
        System.out.println(analyzerResponse);

        // Step 2 - capabilities 파싱 → covered/not-covered 분리
        Map<String, Map<String, Object>> capabilityLevels = new LinkedHashMap<>();
        Map<CapabilityCode, UserCapability> userCapabilityMap = new LinkedHashMap<>();
        Map<CapabilityCode, Double> weights = getWeightsFromProfile(job.getGroupCode());

        JsonNode capabilitiesNode = analyzerNode.get("capabilities");
        if (capabilitiesNode != null) {
            capabilitiesNode.fields().forEachRemaining(entry -> {
                String codeName = entry.getKey();
                JsonNode val = entry.getValue();

                boolean covered = val.has("covered") && val.get("covered").asBoolean(false);
                int rawScore = val.has("score") ? val.get("score").asInt(0) : 0;
                String levelStr = val.has("level") ? val.get("level").asText("") : "";

                // evidence 기반 레벨 하향 보정
                if (covered && !levelStr.isEmpty()) {
                    levelStr = adjustLevelByEvidence(levelStr, val);
                    rawScore = clampScoreToLevel(rawScore, levelStr);
                }

                Map<String, Object> levelData = new LinkedHashMap<>();
                levelData.put("covered", covered);
                levelData.put("score", rawScore / 100.0);
                if (!levelStr.isEmpty()) levelData.put("level", levelStr);
                capabilityLevels.put(codeName, levelData);

                if (covered && rawScore > 0 && !levelStr.isEmpty()) {
                    try {
                        CapabilityCode code = CapabilityCode.valueOf(codeName);
                        CapabilityLevel level = CapabilityLevel.valueOf(levelStr);
                        userCapabilityMap.put(code, new UserCapability(rawScore / 100.0, level));
                    } catch (IllegalArgumentException ignored) {}
                }
            });
        }

        // Step 3 - grade 판정 (L3 이상 비율 50% 이상이면 PROFESSIONER)
        long advancedCount = userCapabilityMap.values().stream()
                .filter(uc -> uc.level() == CapabilityLevel.L3 || uc.level() == CapabilityLevel.L4)
                .count();
        long totalCount = userCapabilityMap.values().stream()
                .filter(uc -> uc.score() > 0)
                .count();
        String grade = (totalCount > 0 && (double) advancedCount / totalCount >= 0.5)
                ? "PROFESSIONER" : "TECHNICIAN";
        assessment.setGrade(grade);

        // Step 4 - 직군 매칭 점수 계산
        Map<String, Double> jobRanking = vectorSimilarityService.rankJobs(userCapabilityMap);

        // Step 5 - Depth Score / Coverage 계산 (분리된 2축)
        List<Map<String, Object>> competencyScores = new ArrayList<>();
        double coveredWeightSum = 0.0;   // coverage 분자
        double totalWeightSum = 0.0;     // coverage 분모
        double weightedScoreSum = 0.0;   // depthScore 분자

        // 전체 weight 합산 (분모)
        for (Map.Entry<CapabilityCode, Double> wEntry : weights.entrySet()) {
            totalWeightSum += wEntry.getValue();
        }

        for (Map.Entry<CapabilityCode, UserCapability> entry : userCapabilityMap.entrySet()) {
            CapabilityCode code = entry.getKey();
            UserCapability uc = entry.getValue();
            if (!weights.containsKey(code)) continue;

            double weight = weights.get(code);
            double scoreScaled = uc.score() * 100.0;

            coveredWeightSum += weight;
            weightedScoreSum += uc.score() * weight;

            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("capCode", code.name());
            detail.put("name", code.getDescription());
            detail.put("score", (int) Math.round(scoreScaled));
            detail.put("weight", weight);
            detail.put("level", uc.level().name());
            detail.put("isCore", JobCapabilityProfile.JOB_PROFILES
                    .getOrDefault(assessment.getEvaluatedJobCode(), Map.of())
                    .getOrDefault(code, new com.kyoon.resumeagent.Capability.CapabilityWeight(0, null, false))
                    .isCore());
            competencyScores.add(detail);
        }

        // depthScore = Σ(score × weight) / Σ(covered weight) — 언급된 역량 내 깊이
        int depthScore = coveredWeightSum > 0
                ? (int) Math.min(Math.round(weightedScoreSum / coveredWeightSum * 100), 100)
                : 0;

        // coverage = Σ(covered weight) / Σ(total weight) — 역량 범위 커버율
        double coverage = totalWeightSum > 0
                ? Math.round(coveredWeightSum / totalWeightSum * 100.0) / 100.0
                : 0.0;

        // Step 5.5 - coverage 가중치 반영
        // totalScore = depthScore × (0.7 + coverage × 0.3)
        // coverage 1.0 → depthScore 그대로, coverage 0.0 → depthScore × 0.7
        int totalScore = (int) Math.min(Math.round(depthScore * (0.7 + coverage * 0.3)), 100);

        // Step 6 - strengths/weakFields 파싱
        List<String> strengths = new ArrayList<>();
        List<String> improvements = new ArrayList<>();
        JsonNode weakReasonsNode = analyzerNode.get("weakReasons");
        if (weakReasonsNode != null) {
            weakReasonsNode.fields().forEachRemaining(e -> {
                String capName;
                try {
                    capName = CapabilityCode.valueOf(e.getKey()).getDescription();
                } catch (IllegalArgumentException ex) {
                    capName = e.getKey();
                }
                improvements.add(capName + ": " + e.getValue().asText());
            });
        }
        userCapabilityMap.entrySet().stream()
                .filter(e -> e.getValue().level() == CapabilityLevel.L3 || e.getValue().level() == CapabilityLevel.L4)
                .forEach(e -> strengths.add(e.getKey().getDescription() + " 심화 역량 보유"));

        // Step 7 - scoreData 구성 및 저장
        Map<String, Object> newScoreData = new LinkedHashMap<>();
        newScoreData.put("depthScore", depthScore);   // 언급된 역량 내 깊이 (0~100)
        newScoreData.put("coverage", coverage);        // 역량 커버율 (0.0~1.0)
        newScoreData.put("totalScore", totalScore);    // depthScore × coverage 가중치
        newScoreData.put("grade", grade);
        newScoreData.put("competencyScores", competencyScores);
        newScoreData.put("isFinal", true);
        newScoreData.put("strengths", strengths);
        newScoreData.put("improvements", improvements);
        newScoreData.put("jobRanking", jobRanking);

        try {
            JsonNode existingScoreData = objectMapper.readTree(assessment.getScoreData());
            if (existingScoreData.has("experiences")) {
                newScoreData.put("experiences", existingScoreData.get("experiences"));
            }
            if (existingScoreData.has("competencyResults")) {
                newScoreData.put("competencyResults", existingScoreData.get("competencyResults"));
            }
        } catch (Exception ignored) {}

        assessment.setCapabilityLevels(capabilityLevels);
        assessment.setScoreData(objectMapper.writeValueAsString(newScoreData));

        Map<String, Double> capVector = new LinkedHashMap<>();
        userCapabilityMap.forEach((code, uc) -> capVector.put(code.name(), uc.score()));
        assessment.setCapabilityVector(capVector);

        return assessmentRepository.save(assessment);
    }

    private String getCertStatus(Assessment assessment) {
        try {
            JsonNode scoreData = objectMapper.readTree(assessment.getScoreData());
            JsonNode compResults = scoreData.get("competencyResults");
            if (compResults != null && compResults.isArray()) {
                for (JsonNode cr : compResults) {
                    if ("CERT_MATCH".equals(cr.get("capCode").asText())) {
                        return cr.get("status").asText();
                    }
                }
            }
        } catch (Exception ignored) {}
        return "empty";
    }

    private Map<CapabilityCode, Double> getWeightsFromProfile(String groupCode) {
        var profileMap = JobCapabilityProfile.JOB_PROFILES.get(groupCode);
        if (profileMap == null) return Collections.emptyMap();
        return profileMap.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().weight()
                ));
    }

    private double getCertWeight(String jobCode) {
        // 자격증 가중치: BIZ/ENG 계열은 높게, SW/INF는 낮게
        if (jobCode == null) return 0.05;
        if (jobCode.startsWith("BIZ_")) return 0.15;
        if (jobCode.startsWith("ENG_") || jobCode.startsWith("SCI_")) return 0.15;
        return 0.05; // SW_, INF_ 계열
    }

    /**
     * 단일 역량 코드 점수만 업데이트 (경험 추가 재분석용)
     * 전체 재계산 없이 해당 capCode의 점수만 교체 — 기존보다 높을 때만 반영
     */
    @Transactional
    public int updateSingleCapability(Long assessmentId, String capCode, String qnaJson) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        // 현재 scoreData 읽기
        JsonNode existingScoreData = objectMapper.readTree(assessment.getScoreData());
        int scoreBefore = existingScoreData.has("totalScore")
                ? existingScoreData.get("totalScore").asInt() : 0;

        // 가장 최근 저장된 InterviewData에서 capabilityResult 읽기 (LLM 재호출 없음)
        List<com.kyoon.resumeagent.Entity.InterviewData> dataList =
                interviewDataRepository.findByAssessmentIdOrderByCreatedAtAsc(assessmentId);

        JsonNode capNode = null;
        for (int i = dataList.size() - 1; i >= 0; i--) {
            com.kyoon.resumeagent.Entity.InterviewData d = dataList.get(i);
            if (d.getCapabilityResult() == null) continue;
            try {
                JsonNode capResult = objectMapper.readTree(d.getCapabilityResult());
                if (capResult.has(capCode)) {
                    capNode = capResult.get(capCode);
                    break;
                }
            } catch (Exception ignored) {}
        }

        if (capNode == null || !capNode.has("covered") || !capNode.get("covered").asBoolean()) {
            return scoreBefore;
        }

        int newScore = capNode.has("score") ? capNode.get("score").asInt(0) : 0;
        String newLevel = capNode.has("level") ? capNode.get("level").asText("") : "";

        // evidence 기반 레벨 하향 보정 + 클램핑
        if (!newLevel.isEmpty()) {
            newLevel = adjustLevelByEvidence(newLevel, capNode);
            newScore = clampScoreToLevel(newScore, newLevel);
        }

        // 기존 competencyScores에서 해당 capCode 찾아서 높은 값만 교체
        com.fasterxml.jackson.databind.node.ObjectNode scoreDataNode =
                (com.fasterxml.jackson.databind.node.ObjectNode) objectMapper.readTree(assessment.getScoreData());

        com.fasterxml.jackson.databind.node.ArrayNode competencyScores =
                (com.fasterxml.jackson.databind.node.ArrayNode) scoreDataNode.get("competencyScores");

        boolean updated = false;
        boolean existsInScores = false;

        if (competencyScores != null) {
            for (JsonNode scoreNode : competencyScores) {
                if (capCode.equals(scoreNode.has("capCode") ? scoreNode.get("capCode").asText() : "")) {
                    existsInScores = true;
                    int oldScore = scoreNode.get("score").asInt(0);
                    if (newScore > oldScore) {
                        ((com.fasterxml.jackson.databind.node.ObjectNode) scoreNode).put("score", newScore);
                        ((com.fasterxml.jackson.databind.node.ObjectNode) scoreNode).put("level", newLevel);
                        updated = true;
                    }
                    break;
                }
            }
        }

        // competencyScores에 없는 역량이면 새로 추가
        if (!existsInScores && competencyScores != null) {
            Map<CapabilityCode, Double> weights = getWeightsFromProfile(assessment.getEvaluatedJobCode());
            CapabilityCode code;
            try { code = CapabilityCode.valueOf(capCode); }
            catch (IllegalArgumentException e) { return scoreBefore; }

            double weight = weights.getOrDefault(code, 0.0);
            boolean isCore = JobCapabilityProfile.JOB_PROFILES
                    .getOrDefault(assessment.getEvaluatedJobCode(), Map.of())
                    .getOrDefault(code, new com.kyoon.resumeagent.Capability.CapabilityWeight(0, null, false))
                    .isCore();

            com.fasterxml.jackson.databind.node.ObjectNode newNode = objectMapper.createObjectNode();
            newNode.put("capCode", capCode);
            newNode.put("name", code.getDescription());
            newNode.put("score", newScore);
            newNode.put("weight", weight);
            newNode.put("level", newLevel);
            newNode.put("isCore", isCore);
            newNode.put("evidence", "");
            newNode.put("contribution", 0.0);
            competencyScores.add(newNode);
            updated = true;
        }

        if (!updated) return scoreBefore;

        // capabilityLevels도 업데이트
        Map<String, Map<String, Object>> capLevels = assessment.getCapabilityLevels() != null
                ? new LinkedHashMap<>(assessment.getCapabilityLevels())
                : new LinkedHashMap<>();
        Map<String, Object> capEntry = new LinkedHashMap<>();
        capEntry.put("covered", true);
        capEntry.put("score", newScore / 100.0);
        capEntry.put("level", newLevel);
        capLevels.put(capCode, capEntry);
        assessment.setCapabilityLevels(capLevels);

        // capabilityVector도 업데이트
        Map<String, Double> capVector = assessment.getCapabilityVector() != null
                ? new LinkedHashMap<>(assessment.getCapabilityVector())
                : new LinkedHashMap<>();
        capVector.put(capCode, newScore / 100.0);
        assessment.setCapabilityVector(capVector);

        // totalScore 재계산 (competencyScores 가중치 합산)
        double weightedSum = 0.0, weightSum = 0.0;
        if (competencyScores != null) {
            for (JsonNode s : competencyScores) {
                double w = s.has("weight") ? s.get("weight").asDouble(0) : 0;
                double sc = s.has("score") ? s.get("score").asDouble(0) : 0;
                weightedSum += sc * w;
                weightSum += w;
            }
        }
        int depthScore = weightSum > 0 ? (int) Math.min(Math.round(weightedSum / weightSum), 100) : scoreBefore;

        // coverage 기반 totalScore 재계산
        double coverage = existingScoreData.has("coverage") ? existingScoreData.get("coverage").asDouble(1.0) : 1.0;
        int newTotalScore = (int) Math.min(Math.round(depthScore * (0.7 + coverage * 0.3)), 100);

        // 총점도 올랐을 때만 반영
        if (newTotalScore > scoreBefore) {
            scoreDataNode.put("totalScore", newTotalScore);
            assessment.setScoreData(objectMapper.writeValueAsString(scoreDataNode));
            assessmentRepository.save(assessment);
            return newTotalScore;
        }

        // 총점은 안 올랐지만 역량 레벨/벡터는 업데이트
        assessment.setScoreData(objectMapper.writeValueAsString(scoreDataNode));
        assessmentRepository.save(assessment);
        return scoreBefore;
    }

    /**
     * 레벨에 맞게 점수 강제 클램핑
     * L1: 10~40, L2: 41~65, L3: 66~85, L4: 86~100
     */
    private int clampScoreToLevel(int score, String level) {
        return switch (level) {
            case "L1" -> Math.min(Math.max(score, 10), 40);
            case "L2" -> Math.min(Math.max(score, 41), 65);
            case "L3" -> Math.min(Math.max(score, 66), 85);
            case "L4" -> Math.min(Math.max(score, 86), 100);
            default -> score;
        };
    }

    /**
     * evidence 기반 레벨 하향 보정
     * L3: QA 소스 evidence 0개 → L2로 다운
     * L4: QA 소스 evidence 1개 이하 → L3로 다운
     */
    private String adjustLevelByEvidence(String level, JsonNode capNode) {
        if (capNode == null || !capNode.has("evidence")) return level;
        JsonNode evidence = capNode.get("evidence");
        if (!evidence.isArray()) return level;

        long qaCount = 0;
        for (JsonNode e : evidence) {
            if ("QA".equals(e.has("source") ? e.get("source").asText() : "")) qaCount++;
        }

        return switch (level) {
            case "L3" -> qaCount == 0 ? "L2" : level;
            case "L4" -> qaCount <= 1 ? "L3" : level;
            default -> level;
        };
    }

    private String buildDepthAnswersText(List<Map<String, Object>> depthAnswers) {
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> item : depthAnswers) {
            sb.append(String.format("\n[%s]\n", item.get("itemName")));
            Object qnaObj = item.get("qna");
            if (qnaObj instanceof List<?> qnaList) {
                for (Object qaObj : qnaList) {
                    if (qaObj instanceof Map<?, ?> qa) {
                        sb.append(String.format("Q: %s\nA: %s\n",
                                qa.get("question"), qa.get("answer")));
                    }
                }
            }
        }
        return sb.toString();
    }
}
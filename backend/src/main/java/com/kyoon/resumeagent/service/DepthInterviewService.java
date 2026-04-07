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
import com.kyoon.resumeagent.repository.AssessmentRepository;
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
    public Assessment calculateFinalScore(Long assessmentId, List<Map<String, Object>> depthAnswers) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        Job job = jobRepository.findByGroupCode(assessment.getEvaluatedJobCode())
                .orElseThrow(() -> new RuntimeException("Job not found"));

        String jobCode = assessment.getEvaluatedJobCode();
        String interviewAnalyzerPath = PromptPathResolver.interviewAnalyzer(jobCode);

        String depthAnswersText = buildDepthAnswersText(depthAnswers);

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).maxTokens(1500).build())
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
        newScoreData.put("totalScore", depthScore);    // 하위호환: Dashboard 등 기존 참조용
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
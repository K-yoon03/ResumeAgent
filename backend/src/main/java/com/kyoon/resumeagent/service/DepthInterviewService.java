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
    public List<String> generateQuestions(String jobCode, String jobName, String itemName, String itemType, String reason) throws Exception {
        Job job = jobRepository.findByGroupCode(jobCode)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobCode));

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.7).maxTokens(500).build())
                .build();

        String promptPath = PromptPathResolver.depth(job.getMeasureType().name());
        if (promptPath == null) {
            throw new RuntimeException("DepthInterview not supported for measureType: " + job.getMeasureType());
        }
        Resource promptResource = resourceLoader.getResource(promptPath);
        PromptTemplate template = new PromptTemplate(promptResource);

// 관련 역량 코드 추출
        String rawCodes = JobCapabilityProfile.getRelevantCodeNames(jobCode);
        List<String> relevantCodes = Arrays.stream(rawCodes.split(",\\s*"))
                .map(s -> s.contains("(") ? s.substring(0, s.indexOf("(")).trim() : s.trim())
                .collect(java.util.stream.Collectors.toList());

        System.out.println("=== 파싱된 코드 목록 ===");
        relevantCodes.forEach(System.out::println);

// 앵커 컨텍스트 조회
        String anchorContext = ragAnchorService.getAnchorContextForCodes(relevantCodes);
        String capCodesStr = rawCodes
                + (anchorContext.isEmpty() ? "" : "\n\n[역량 평가 기준]\n" + anchorContext);

        System.out.println("=== RAG 앵커 컨텍스트 ===");
        System.out.println(anchorContext.isEmpty() ? "(앵커 없음)" : anchorContext);



        Prompt prompt = template.create(Map.of(
                "jobName", jobName != null ? jobName : job.getGroupName(),
                "jobCode", jobCode,
                "itemName", itemName,
                "capCodes", capCodesStr,
                "maxQuestions", "3"
        ));

        String response = client.prompt(prompt).call().content();
        String cleanJson = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();

        JsonNode result = objectMapper.readTree(cleanJson);
        List<String> questions = new ArrayList<>();
        result.get("questions").forEach(q -> questions.add(q.asText()));
        System.out.println("=== 생성된 질문 ===");
        questions.forEach(System.out::println);
        return questions;
    }

    /**
     * 최종 점수 계산
     */
    @Transactional
    public Assessment calculateFinalScore(Long assessmentId, List<Map<String, Object>> depthAnswers) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        Job job = jobRepository.findByGroupCode(assessment.getEvaluatedJobCode())
                .orElseThrow(() -> new RuntimeException("Job not found"));

        // PORTFOLIO, CERT_ONLY는 InterviewAnalyzer 스킵
        String interviewAnalyzerPath = PromptPathResolver.interviewAnalyzer(job.getMeasureType().name());
        if (interviewAnalyzerPath == null) {
            return assessmentRepository.save(assessment);
        }

        String depthAnswersText = buildDepthAnswersText(depthAnswers);

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).maxTokens(1500).build())
                .build();

        // Step 1 - InterviewAnalyzer: 코드별 L1/L2 레벨 + 점수 판정
        Resource analyzerPrompt = resourceLoader.getResource(interviewAnalyzerPath);
        PromptTemplate analyzerTemplate = new PromptTemplate(analyzerPrompt);

        // InterviewAnalyzer에도 앵커 주입
        String rawCodesForAnalyzer = JobCapabilityProfile.getRelevantCodeNames(assessment.getEvaluatedJobCode());
        List<String> relevantCodesForAnalyzer = Arrays.stream(rawCodesForAnalyzer.split(",\\s*"))
                .map(s -> s.contains("(") ? s.substring(0, s.indexOf("(")).trim() : s.trim())
                .collect(java.util.stream.Collectors.toList());
        String anchorContext = ragAnchorService.getAnchorContextForCodes(relevantCodesForAnalyzer);
        String capCodesWithAnchor = rawCodesForAnalyzer
                + (anchorContext.isEmpty() ? "" : "\n\n[역량 레벨 판단 기준]\n" + anchorContext);

        Prompt analyzerPromptObj = analyzerTemplate.create(Map.of(
                "itemName", depthAnswers.isEmpty() ? "" : depthAnswers.get(0).getOrDefault("itemName", "").toString(),
                "jobGroup", job.getGroupCode(),
                "capabilityCodes", capCodesWithAnchor,
                "qna", depthAnswersText
        ));

        String analyzerResponse = client.prompt(analyzerPromptObj).call().content();
        String analyzerJson = analyzerResponse.trim().replaceAll("```json", "").replaceAll("```", "").trim();
        JsonNode analyzerNode = objectMapper.readTree(analyzerJson);

        System.out.println("=== InterviewAnalyzer 원문 ===");
        System.out.println(analyzerResponse);

        // Step 2 - capabilityLevels 파싱 → UserCapability 맵 생성
        Map<String, Map<String, Object>> capabilityLevels = new LinkedHashMap<>();
        Map<CapabilityCode, UserCapability> userCapabilityMap = new LinkedHashMap<>();
        Map<CapabilityCode, Double> weights = getWeightsFromProfile(job.getGroupCode());

        JsonNode levelsNode = analyzerNode.get("capabilityLevels");
        if (levelsNode != null) {
            levelsNode.fields().forEachRemaining(entry -> {
                String codeName = entry.getKey();
                JsonNode val = entry.getValue();

                Map<String, Object> levelData = new LinkedHashMap<>();
                levelData.put("level", val.get("level").asText());
                levelData.put("score", val.get("score").asDouble());
                capabilityLevels.put(codeName, levelData);

                try {
                    CapabilityCode code = CapabilityCode.valueOf(codeName);
                    CapabilityLevel level = CapabilityLevel.valueOf(val.get("level").asText("UNKNOWN"));
                    double score = val.get("score").asDouble(0.0);
                    userCapabilityMap.put(code, new UserCapability(score, level));
                } catch (IllegalArgumentException ignored) {}
            });
        }

        // Step 3 - grade 판정
        long l2Count = userCapabilityMap.values().stream()
                .filter(uc -> uc.level() == CapabilityLevel.L2_ARCH)
                .count();
        long totalCount = userCapabilityMap.values().stream()
                .filter(uc -> uc.level() != CapabilityLevel.valueOf("UNKNOWN") && uc.score() > 0)
                .count();
        String grade = (totalCount > 0 && (double) l2Count / totalCount >= 0.5)
                ? "PROFESSIONER" : "TECHNICIAN";
        assessment.setGrade(grade);

        // Step 4 - 직군 매칭 점수 계산
        Map<String, Double> jobRanking = vectorSimilarityService.rankJobs(userCapabilityMap);

        // Step 5 - capabilityLevels → competencyScores + totalScore 변환
        List<Map<String, Object>> competencyScores = new ArrayList<>();
        double totalScore = 0.0;

        for (Map.Entry<CapabilityCode, UserCapability> entry : userCapabilityMap.entrySet()) {
            CapabilityCode code = entry.getKey();
            UserCapability uc = entry.getValue();
            if (uc.level() == CapabilityLevel.valueOf("UNKNOWN") || uc.score() == 0.0) {
                continue;
            }
            double weight = weights.getOrDefault(code, 0.0);
            double scoreScaled = Math.round(uc.score() * 100.0);
            double contribution = Math.round(scoreScaled * weight * 10.0) / 10.0;
            totalScore += uc.score() * weight;

            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("capCode", code.name());
            detail.put("name", code.getDescription());
            detail.put("score", (int) scoreScaled);
            detail.put("weight", weight);
            detail.put("contribution", contribution);
            detail.put("level", uc.level().name());
            detail.put("isCore", JobCapabilityProfile.JOB_PROFILES
                    .getOrDefault(assessment.getEvaluatedJobCode(), Map.of())
                    .getOrDefault(code, new com.kyoon.resumeagent.Capability.CapabilityWeight(0, null, false))
                    .isCore());
            competencyScores.add(detail);
        }

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
                .filter(e -> e.getValue().level() == CapabilityLevel.L2_ARCH)
                .forEach(e -> strengths.add(e.getKey().getDescription() + " 설계 역량 보유"));

        // Step 7 - scoreData 구성 및 저장
        Map<String, Object> newScoreData = new LinkedHashMap<>();
        double certWeight = getCertWeight(job.getMeasureType());
        String certStatus = getCertStatus(assessment);
        double relevance = "depth".equals(certStatus) ? 1.0 : "complex".equals(certStatus) ? 0.3 : 0.0;
        double certEffect = certWeight * relevance;
        int finalScore = (int) Math.min(Math.round((totalScore + certEffect) * 100), 100);
        newScoreData.put("totalScore", finalScore);
        newScoreData.put("certEffect", Math.round(certEffect * 100));
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

    private double getCertWeight(Job.MeasureType measureType) {
        return switch (measureType) {
            case TECH_STACK -> 0.05;
            case TROUBLESHOOTING, DESIGN_INTENT, KPI -> 0.15;
            case PORTFOLIO -> 0.10;
            case CERT_ONLY -> 0.40;
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
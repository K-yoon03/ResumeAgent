package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.Competency;
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

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DepthInterviewService {

    private final ChatModel chatModel;
    private final JobRepository jobRepository;
    private final AssessmentRepository assessmentRepository;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;

    /**
     * 심층 질문 생성
     */
    public List<String> generateQuestions(String jobCode, String jobName, String itemName, String itemType, String reason) throws Exception {
        Job job = jobRepository.findByJobCode(jobCode)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobCode));

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.7).maxTokens(500).build())
                .build();

        Resource promptResource = resourceLoader.getResource("classpath:prompts/DepthInterviewer.st");
        PromptTemplate template = new PromptTemplate(promptResource);

        Prompt prompt = template.create(Map.of(
                "jobName", jobName != null ? jobName : job.getJobName(),
                "jobCode", jobCode,
                "itemName", itemName,
                "itemType", itemType != null ? itemType : "experience",
                "competencies", buildCompetenciesDescription(job.getCompetencies())
        ));

        String response = client.prompt(prompt).call().content();
        String cleanJson = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();

        JsonNode result = objectMapper.readTree(cleanJson);
        List<String> questions = new ArrayList<>();
        result.get("questions").forEach(q -> questions.add(q.asText()));
        return questions;
    }

    /**
     * 최종 점수 계산
     */
    @Transactional
    public Assessment calculateFinalScore(Long assessmentId, List<Map<String, Object>> depthAnswers) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        Job job = jobRepository.findByJobCode(assessment.getEvaluatedJobCode())
                .orElseThrow(() -> new RuntimeException("Job not found"));

        List<Competency> competencies = job.getCompetencies();

        // 기존 점수 추출
        JsonNode existingScoreData = objectMapper.readTree(assessment.getScoreData());
        String initialScores = buildInitialScores(existingScoreData);
        String depthAnswersText = buildDepthAnswersText(depthAnswers);

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.2).maxTokens(2000).build())
                .build();

        Resource promptResource = resourceLoader.getResource("classpath:prompts/FinalScorer.st");
        PromptTemplate template = new PromptTemplate(promptResource);

        Prompt prompt = template.create(Map.of(
                "jobName", job.getJobName(),
                "jobCode", job.getJobCode(),
                "competencies", buildCompetenciesDescription(competencies),
                "initialScores", initialScores,
                "depthAnswers", depthAnswersText
        ));

        String response = client.prompt(prompt).call().content();
        String cleanJson = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();

        JsonNode result = objectMapper.readTree(cleanJson);
        JsonNode competencyScores = result.get("competencyScores");

        // 가중치 재계산 (기존 AssessmentService와 동일 로직)
        double totalScore = 0.0;
        List<Map<String, Object>> detailedScores = new ArrayList<>();

        for (int i = 0; i < competencies.size(); i++) {
            Competency comp = competencies.get(i);
            JsonNode scoreNode = competencyScores.get(i);

            int score = scoreNode.get("score").asInt();
            String evidence = scoreNode.get("evidence").asText();
            boolean improved = scoreNode.has("improved") && scoreNode.get("improved").asBoolean();
            BigDecimal weight = comp.getWeight();
            double contribution = score * weight.doubleValue();
            totalScore += contribution;

            Map<String, Object> detail = new HashMap<>();
            detail.put("name", comp.getName());
            detail.put("score", score);
            detail.put("weight", weight.doubleValue());
            detail.put("contribution", contribution);
            detail.put("evidence", evidence);
            detail.put("improved", improved);
            detailedScores.add(detail);
        }

        // scoreData 업데이트
        Map<String, Object> newScoreData = new HashMap<>();
        newScoreData.put("totalScore", Math.round(totalScore));
        newScoreData.put("competencyScores", detailedScores);
        newScoreData.put("strengths", result.get("strengths"));
        newScoreData.put("improvements", result.get("improvements"));
        newScoreData.put("experiences", existingScoreData.get("experiences"));
        newScoreData.put("isFinal", true);

        assessment.setScoreData(objectMapper.writeValueAsString(newScoreData));
        assessment.setAnalysis(objectMapper.writeValueAsString(Map.of(
                "strengths", result.get("strengths"),
                "improvements", result.get("improvements")
        )));

        return assessmentRepository.save(assessment);
    }

    private String buildCompetenciesDescription(List<Competency> competencies) {
        StringBuilder sb = new StringBuilder();
        for (Competency comp : competencies) {
            sb.append(String.format("- %s (가중치: %.0f%%): %s\n",
                    comp.getName(), comp.getWeight().doubleValue() * 100, comp.getMeasurement()));
        }
        return sb.toString();
    }

    private String buildInitialScores(JsonNode scoreData) {
        StringBuilder sb = new StringBuilder();
        // Analyzer가 분류기로 바뀌면서 competencyResults로 변경됨
        JsonNode results = scoreData.get("competencyResults");
        if (results != null) {
            results.forEach(comp -> {
                sb.append(String.format("- %s: %s (이유: %s)\n",
                        comp.get("name").asText(),
                        comp.get("status").asText(),
                        comp.has("reason") ? comp.get("reason").asText() : ""));
            });
        }
        return sb.toString();
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
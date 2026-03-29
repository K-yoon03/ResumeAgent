package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Capability.JobCapabilityProfile;
import com.kyoon.resumeagent.Capability.PromptPathResolver;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.Job;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.JobRepository;
import com.kyoon.resumeagent.service.score.AssessmentScoreService;
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

@Service
@RequiredArgsConstructor
public class DepthInterviewService {

    private final ChatModel chatModel;
    private final AssessmentScoreService assessmentScoreService;
    private final JobRepository jobRepository;
    private final AssessmentRepository assessmentRepository;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;

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

        Prompt prompt = template.create(Map.of(
                "jobName", jobName != null ? jobName : job.getGroupName(),
                "jobCode", jobCode,
                "itemName", itemName,
                "capCodes", JobCapabilityProfile.getRelevantCodeNames(jobCode),
                "maxQuestions", "3"
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

        Job job = jobRepository.findByGroupCode(assessment.getEvaluatedJobCode())
                .orElseThrow(() -> new RuntimeException("Job not found"));

        String depthAnswersText = buildDepthAnswersText(depthAnswers);

        // evidence 프롬프트로 사실 추출
        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).maxTokens(1000).build())
                .build();

        String promptPath = PromptPathResolver.evidence(job.getMeasureType().name());
        if (promptPath == null) {
            throw new RuntimeException("Evidence not supported for measureType: " + job.getMeasureType());
        }
        Resource promptResource = resourceLoader.getResource(promptPath);
        PromptTemplate template = new PromptTemplate(promptResource);

        Prompt prompt = template.create(Map.of(
                "capCodes", JobCapabilityProfile.getRelevantCodeNames(assessment.getEvaluatedJobCode()),
                "qna", depthAnswersText
        ));

        String response = client.prompt(prompt).call().content();
        String evidenceJson = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();

        // 서버 산출식으로 점수 계산
        return assessmentScoreService.calculateScore(assessment, job, evidenceJson);
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
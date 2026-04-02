package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.InterviewData;
import com.kyoon.resumeagent.Entity.Job;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.InterviewDataRepository;
import com.kyoon.resumeagent.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class InterviewOrchestratorService {

    private final ChatModel chatModel;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final AssessmentRepository assessmentRepository;
    private final InterviewDataRepository interviewDataRepository;
    private final JobRepository jobRepository;
    private final RagAnchorService ragAnchorService;

    /**
     * Base 3문항 생성
     */
    public List<String> generateBaseQuestions(Long assessmentId, String itemName) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));
        Job job = jobRepository.findByGroupCode(assessment.getEvaluatedJobCode()).orElse(null);

        String jobGroup = job != null ? job.getGroupName() : assessment.getEvaluatedJobCode();
        String capCodes = job != null
                ? job.getCompetencies().stream().map(c -> c.getCapCode()).reduce("", (a, b) -> a + ", " + b)
                : "";

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.4).maxTokens(500).build())
                .build();

        var prompt = new PromptTemplate(resourceLoader.getResource("classpath:prompts/BaseInterview.st"))
                .create(Map.of(
                        "jobGroup", jobGroup,
                        "capabilityCodes", capCodes,
                        "itemName", itemName,
                        "itemType", ""
                ));

        String response = client.prompt(prompt).call().content();
        String clean = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();
        JsonNode node = objectMapper.readTree(clean);

        List<String> questions = new ArrayList<>();
        node.get("questions").forEach(q -> questions.add(q.asText()));
        return questions;
    }

    /**
     * 답변 분석 → 추가 질문 필요 여부 + followUpTarget 반환
     */
    public JsonNode analyzeAnswers(Long assessmentId, String itemName, String qnaJson) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));
        Job job = jobRepository.findByGroupCode(assessment.getEvaluatedJobCode()).orElse(null);

        String jobGroup = job != null ? job.getGroupName() : assessment.getEvaluatedJobCode();
        String capCodes = job != null
                ? job.getCompetencies().stream().map(c -> c.getCapCode()).reduce("", (a, b) -> a + ", " + b)
                : "";

        // ↓ 이 부분만 수정
        String measureType = job != null ? job.getMeasureType().name() : "TECH_STACK";
        String promptPath = com.kyoon.resumeagent.Capability.PromptPathResolver.interviewAnalyzer(measureType);
        if (promptPath == null) {
            // PORTFOLIO, CERT_ONLY는 스킵
            return objectMapper.readTree("{\"needFollowUp\": false}");
        }

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).maxTokens(1000).build())
                .build();

        var prompt = new PromptTemplate(resourceLoader.getResource(promptPath))
                .create(Map.of(
                        "jobGroup", jobGroup,
                        "capabilityCodes", capCodes,
                        "itemName", itemName,
                        "qna", qnaJson
                ));

        String response = client.prompt(prompt).call().content();
        String clean = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();
        return objectMapper.readTree(clean);
    }

    /**
     * 추가 질문 1개 생성 (followUpTarget 기반)
     */
    public String generateFollowUpQuestion(String itemName, String followUpTarget, String weakReason) throws Exception {
        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.4).maxTokens(200).build())
                .build();

        String systemPrompt = String.format(
                "You are a friendly Korean career counselor. " +
                        "Generate exactly 1 follow-up question in Korean to extract better '%s' information for experience '%s'. " +
                        "Reason it's weak: %s. " +
                        "Question must be natural, conversational, and 1-2 sentences. Return just the question text, no JSON.",
                followUpTarget, itemName, weakReason
        );

        return client.prompt()
                .system(systemPrompt)
                .user("추가 질문을 생성해주세요.")
                .call().content();
    }

    /**
     * Q&A → InterviewData 추출 + 저장
     */
    public InterviewData extractAndSave(Long assessmentId, String itemName, String qnaJson) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));
        Job job = jobRepository.findByGroupCode(assessment.getEvaluatedJobCode()).orElse(null);
        String jobGroup = job != null ? job.getGroupName() : assessment.getEvaluatedJobCode();

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).maxTokens(600).build())
                .build();

        var prompt = new PromptTemplate(resourceLoader.getResource("classpath:prompts/DataExtractor.st"))
                .create(Map.of(
                        "jobGroup", jobGroup,
                        "itemName", itemName,
                        "qna", qnaJson
                ));

        String response = client.prompt(prompt).call().content();
        String clean = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();
        JsonNode node = objectMapper.readTree(clean);

        // tech 배열 → JSON 문자열
        String techJson = node.has("tech") ? objectMapper.writeValueAsString(node.get("tech")) : "[]";

        // 기존 데이터 있으면 삭제 후 재저장
        interviewDataRepository.findByAssessmentIdOrderByCreatedAtAsc(assessmentId).stream()
                .filter(d -> d.getItemName().equals(itemName))
                .forEach(d -> interviewDataRepository.delete(d));

        InterviewData data = InterviewData.builder()
                .assessment(assessment)
                .itemName(itemName)
                .role(node.has("role") && !node.get("role").isNull() ? node.get("role").asText() : null)
                .action(node.has("action") && !node.get("action").isNull() ? node.get("action").asText() : null)
                .tech(techJson)
                .result(node.has("result") && !node.get("result").isNull() ? node.get("result").asText() : null)
                .rawQna(qnaJson)
                .completenessScore(node.has("completenessScore") ? node.get("completenessScore").asDouble() : 0.0)
                .build();

        return interviewDataRepository.save(data);
    }
}
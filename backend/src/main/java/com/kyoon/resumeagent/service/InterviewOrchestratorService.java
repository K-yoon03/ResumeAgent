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
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import com.kyoon.resumeagent.Capability.JobCapabilityProfile;
import com.kyoon.resumeagent.Capability.PromptPathResolver;

import java.util.Arrays;
import java.util.stream.Collectors;
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

        String jobCode = assessment.getEvaluatedJobCode();
        Job job = jobRepository.findByGroupCode(jobCode).orElse(null);
        String jobGroup = job != null ? job.getGroupName() : jobCode;

        // RAG 앵커 주입
        String rawCodes = JobCapabilityProfile.getRelevantCodeNames(jobCode);
        List<String> relevantCodes = Arrays.stream(rawCodes.split(",\\s*"))
                .map(s -> s.contains("(") ? s.substring(0, s.indexOf("(")).trim() : s.trim())
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        String anchorContext = ragAnchorService.getAnchorContextForCodes(relevantCodes);
        String capCodesWithAnchor = rawCodes
                + (anchorContext.isEmpty() ? "" : "\n\n[역량 레벨 판단 기준]\n" + anchorContext);

        String promptPath = PromptPathResolver.baseInterview(jobCode);

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.4).maxTokens(500).build())
                .build();

        var prompt = new PromptTemplate(resourceLoader.getResource(promptPath))
                .create(Map.of(
                        "jobGroup", jobGroup,
                        "capabilityCodes", capCodesWithAnchor,
                        "itemName", itemName
                ));

        String response = client.prompt(prompt).call().content();
        String clean = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();
        JsonNode node = objectMapper.readTree(clean);

        List<String> questions = new ArrayList<>();
        node.get("questions").forEach(q -> questions.add(q.asText()));
        return questions;
    }

    /**
     * 답변 분석 → capability별 레벨 판정 + followUp 여부 반환
     * userInput: Assessment에서 가져온 원본 경험 텍스트 (evidence 보완용)
     */
    public JsonNode analyzeAnswers(Long assessmentId, String itemName, String qnaJson) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        String jobCode = assessment.getEvaluatedJobCode();
        Job job = jobRepository.findByGroupCode(jobCode).orElse(null);
        String jobName = job != null ? job.getGroupName() : jobCode;

        // capability 목록 (anchor 포함)
        String rawCodes = JobCapabilityProfile.getRelevantCodeNames(jobCode);
        List<String> relevantCodes = Arrays.stream(rawCodes.split(",\\s*"))
                .map(s -> s.contains("(") ? s.substring(0, s.indexOf("(")).trim() : s.trim())
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        String anchorContext = ragAnchorService.getAnchorContextForCodes(relevantCodes);

        // userInput: Assessment의 원본 경험 텍스트 (experience 컬럼)
        String userInput = assessment.getExperience() != null ? assessment.getExperience() : "";

        String promptPath = PromptPathResolver.interviewAnalyzer(jobCode);

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).maxTokens(1500).build())
                .build();

        var prompt = new PromptTemplate(resourceLoader.getResource(promptPath))
                .create(Map.of(
                        "jobName", jobName,
                        "jobCode", jobCode,
                        "capabilityList", rawCodes,
                        "userInput", userInput,
                        "qnaText", qnaJson,
                        "anchorContext", anchorContext
                ));

        String response = client.prompt(prompt).call().content();
        String clean = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();
        return objectMapper.readTree(clean);
    }

    /**
     * 추가 질문 1개 생성 (followUpTarget 기반)
     */
    public String generateFollowUpQuestion(String itemName, String followUpTarget, String weakReason) throws Exception {
        // 특수문자 이스케이프 (따옴표/개행이 JSON 직렬화 오류 유발)
        itemName = itemName != null
                ? itemName.replace("\"", "'")
                .replace("\r\n", " ")
                .replace("\n", " ")
                .replace("\r", "")
                : "";

        followUpTarget = followUpTarget != null
                ? followUpTarget.replace("\"", "'")
                .replace("\r\n", " ")
                .replace("\n", " ")
                .replace("\r", "")
                : "";

        weakReason = weakReason != null
                ? weakReason.replace("\"", "'")
                .replace("\r\n", " ")
                .replace("\n", " ")
                .replace("\r", "")
                : "";

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
     * 인터뷰 데이터 초기화 (final 제출 전 호출)
     */
    public void deleteInterviewDataByAssessmentId(Long assessmentId) {
        interviewDataRepository.deleteByAssessmentId(assessmentId);
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

        String techJson = node.has("tech") ? objectMapper.writeValueAsString(node.get("tech")) : "[]";

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
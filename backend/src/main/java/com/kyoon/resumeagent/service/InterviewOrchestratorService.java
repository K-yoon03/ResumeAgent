package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Capability.JobCapabilityProfile;
import com.kyoon.resumeagent.Capability.PromptPathResolver;
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

import java.util.*;
import java.util.Arrays;
import java.util.stream.Collectors;

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

    // 1. ExperienceParsed record 추가 (클래스 상단)
    private record ExperienceParsed(String career, String skills, String fullText) {}

    // 2. parseExperience 헬퍼
    private ExperienceParsed parseExperience(String raw) {
        if (raw == null) return new ExperienceParsed("", "", "");
        try {
            JsonNode node = objectMapper.readTree(raw);
            if (node.isObject() && node.has("career")) {
                String career = node.has("career") ? node.get("career").asText("") : "";
                String skills = node.has("skills") ? node.get("skills").asText("") : "";
                Map<String, String> labelMap = new LinkedHashMap<>(Map.of(
                        "age", "나이", "school", "학교", "major", "전공",
                        "career", "경력 및 경험", "certifications", "자격증",
                        "skills", "보유 직무역량", "language", "어학", "extra", "기타"
                ));
                StringBuilder sb = new StringBuilder();
                labelMap.forEach((key, label) -> {
                    if (node.has(key) && !node.get(key).asText("").isBlank())
                        sb.append(label).append(": ").append(node.get(key).asText()).append("\n");
                });
                return new ExperienceParsed(career, skills, sb.toString().trim());
            }
        } catch (Exception ignored) {}
        return new ExperienceParsed(raw, "", raw);
    }

    // 3. filterCapabilityCodesByExperience 헬퍼
    private String filterCapabilityCodesByExperience(String rawCodes, String skills, String jobCode) {
        if (skills.isBlank()) return rawCodes;

        String skillsLower = skills.toLowerCase();
        Map<com.kyoon.resumeagent.Capability.CapabilityCode,
                com.kyoon.resumeagent.Capability.CapabilityWeight> profile =
                JobCapabilityProfile.JOB_PROFILES.getOrDefault(jobCode, Map.of());

        List<String> filtered = Arrays.stream(rawCodes.split(",\\s*"))
                .map(String::trim)
                .filter(codeStr -> {
                    String codeName = codeStr.contains("(")
                            ? codeStr.substring(0, codeStr.indexOf("(")).trim() : codeStr;
                    try {
                        com.kyoon.resumeagent.Capability.CapabilityCode code =
                                com.kyoon.resumeagent.Capability.CapabilityCode.valueOf(codeName);
                        boolean isCore = profile.getOrDefault(code,
                                        new com.kyoon.resumeagent.Capability.CapabilityWeight(0, null, false))
                                .isCore();
                        if (isCore) return true;
                    } catch (IllegalArgumentException ignored) {
                        return true;
                    }
                    // non-core: skills 텍스트에 관련 키워드 있을 때만 포함
                    String codeLower = codeName.toLowerCase().replace("_", " ");
                    return Arrays.stream(codeLower.split(" "))
                            .anyMatch(token -> token.length() > 2 && skillsLower.contains(token));
                })
                .collect(Collectors.toList());

        // 필터링 결과가 너무 적으면 (core만 남는 극단적 케이스) 원본 반환
        return filtered.size() >= 2 ? String.join(", ", filtered) : rawCodes;
    }

    // 4. getResidualSkills 헬퍼
    private String getResidualSkills(String rawCodes, String filteredCodes, String skills) {
        if (skills.isBlank()) return "";
        Set<String> filteredSet = new HashSet<>(Arrays.asList(filteredCodes.split(",\\s*")));
        return Arrays.stream(rawCodes.split(",\\s*"))
                .map(String::trim)
                .filter(code -> !filteredSet.contains(code))
                .collect(Collectors.joining(", "));
    }
    /**
     * Base 3문항 생성
     */
    public List<String> generateBaseQuestions(Long assessmentId, String itemName) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        String jobCode = assessment.getEvaluatedJobCode();
        Job job = jobRepository.findByGroupCode(jobCode).orElse(null);
        String jobGroup = job != null ? job.getGroupName() : jobCode;

        ExperienceParsed exp = parseExperience(assessment.getExperience());

        String rawCodes = JobCapabilityProfile.getRelevantCodeNames(jobCode);
        String filteredCodes = filterCapabilityCodesByExperience(rawCodes, exp.skills(), jobCode);
        String residualSkills = getResidualSkills(rawCodes, filteredCodes, exp.skills());

        List<String> relevantCodes = Arrays.stream(filteredCodes.split(",\\s*"))
                .map(s -> s.contains("(") ? s.substring(0, s.indexOf("(")).trim() : s.trim())
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        String anchorContext = ragAnchorService.getAnchorContextForCodes(relevantCodes);

        String capCodesWithAnchor = filteredCodes
                + (anchorContext.isEmpty() ? "" : "\n\n[역량 레벨 판단 기준]\n" + anchorContext)
                + (residualSkills.isEmpty() ? "" :
                "\n\n[추가 확인 역량 - 보유 역량으로 명시됐으나 경험과의 연관성이 불명확함. 경험과 자연스럽게 연결 가능한 경우에만 질문할 것]\n" + residualSkills);

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.4).build())
                .build();

        var prompt = new PromptTemplate(resourceLoader.getResource(PromptPathResolver.baseInterview(jobCode)))
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
     */
    public JsonNode analyzeAnswers(Long assessmentId, String itemName, String qnaJson) throws Exception {
        return analyzeAnswersWithExtra(assessmentId, itemName, qnaJson, null);
    }

    private JsonNode analyzeAnswersWithExtra(Long assessmentId, String itemName, String qnaJson, String extraCapCode) throws Exception {
        System.out.println("=== analyzeAnswersWithExtra 호출 - itemName: " + itemName + ", extraCapCode: " + extraCapCode);
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        String jobCode = assessment.getEvaluatedJobCode();
        Job job = jobRepository.findByGroupCode(jobCode).orElse(null);
        String jobName = job != null ? job.getGroupName() : jobCode;

        String rawCodes = JobCapabilityProfile.getRelevantCodeNames(jobCode);

        // extraCapCode가 있으면 해당 역량만 단독으로 분석 (직군 외 역량 정확도 보장)
        if (extraCapCode != null && !rawCodes.contains(extraCapCode)) {
            rawCodes = extraCapCode; // 단독 분석
        }

        List<String> relevantCodes = Arrays.stream(rawCodes.split(",\\s*"))
                .map(s -> s.contains("(") ? s.substring(0, s.indexOf("(")).trim() : s.trim())
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        String anchorContext = ragAnchorService.getAnchorContextForCodes(relevantCodes);
        ExperienceParsed exp = parseExperience(assessment.getExperience());
        String userInput = exp.fullText();

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).build())
                .build();

        var prompt = new PromptTemplate(resourceLoader.getResource(PromptPathResolver.interviewAnalyzer(jobCode)))
                .create(Map.of(
                        "jobName", jobName,
                        "jobCode", jobCode,
                        "capabilityList", rawCodes,
                        "userInput", userInput,
                        "qnaText", qnaJson,
                        "anchorContext", anchorContext
                ));

        String response = client.prompt(prompt).call().content();
        System.out.println("=== ANALYZER RAW RESPONSE ===");
        System.out.println(response);
        String clean = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();

        System.out.println("=== CLEAN JSON ===");
        System.out.println(clean);
        System.out.println("=== CLEAN LENGTH: " + clean.length() + " ===");

        System.out.println("=== CLEAN BYTES (first 10) ===");
        byte[] bytes = clean.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        for (int i = 0; i < Math.min(10, bytes.length); i++) {
            System.out.printf("%02X ", bytes[i]);
        }
        System.out.println();
        System.out.println("=== CLEAN BYTES (last 10) ===");
        for (int i = Math.max(0, bytes.length - 10); i < bytes.length; i++) {
            System.out.printf("%02X ", bytes[i]);
        }
        System.out.println();

        return objectMapper.readTree(clean);
    }

    /**
     * 추가 질문 1개 생성
     */
    public String generateFollowUpQuestion(String itemName, String followUpTarget, String weakReason) throws Exception {
        itemName = itemName != null
                ? itemName.replace("\"", "'").replace("\r\n", " ").replace("\n", " ").replace("\r", "") : "";
        followUpTarget = followUpTarget != null
                ? followUpTarget.replace("\"", "'").replace("\r\n", " ").replace("\n", " ").replace("\r", "") : "";
        weakReason = weakReason != null
                ? weakReason.replace("\"", "'").replace("\r\n", " ").replace("\n", " ").replace("\r", "") : "";

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.4).build())
                .build();

        String systemPrompt = String.format(
                "You are a friendly Korean career counselor. " +
                        "Generate exactly 1 follow-up question in Korean to extract better '%s' information for experience '%s'. " +
                        "Reason it weak: %s. " +
                        "Question must be natural, conversational, and 1-2 sentences. Return just the question text, no JSON.",
                followUpTarget, itemName, weakReason
        );

        return client.prompt()
                .system(systemPrompt)
                .user("추가 질문을 생성해주세요.")
                .call().content();
    }

    public long getCompletedCount(Long assessmentId) {
        return interviewDataRepository.findByAssessmentIdOrderByCreatedAtAsc(assessmentId).size();
    }

    /**
     * 인터뷰 데이터 초기화
     */
    public void deleteInterviewDataByAssessmentId(Long assessmentId) {
        interviewDataRepository.deleteByAssessmentId(assessmentId);
    }

    /**
     * Q&A 분석 + STAR 추출 + weakReasons 저장 (통합)
     * analyzeAnswers + extractAndSave 를 하나로 합침
     * 반환값: analyzeAnswers 결과 (needsFollowUp, followUpTarget 등 프론트 사용)
     */

    public JsonNode analyzeAndSave(Long assessmentId, String itemName, String qnaJson) throws Exception {
        return analyzeAndSave(assessmentId, itemName, qnaJson, null, false);
    }

    public JsonNode analyzeAndSave(Long assessmentId, String itemName, String qnaJson, String extraCapCode) throws Exception {
        return analyzeAndSave(assessmentId, itemName, qnaJson, extraCapCode, false);
    }

    public JsonNode analyzeAndSave(Long assessmentId, String itemName, String qnaJson, String extraCapCode, boolean skipDelete) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));
        Job job = jobRepository.findByGroupCode(assessment.getEvaluatedJobCode()).orElse(null);
        String jobGroup = job != null ? job.getGroupName() : assessment.getEvaluatedJobCode();

        // Step 1
        JsonNode analyzerNode = analyzeAnswersWithExtra(assessmentId, itemName, qnaJson, extraCapCode);

        // Step 2
        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).build())
                .build();

        var prompt = new PromptTemplate(resourceLoader.getResource("classpath:prompts/DataExtractor.st"))
                .create(Map.of("jobGroup", jobGroup, "itemName", itemName, "qna", qnaJson));

        String response = client.prompt(prompt).call().content();
        System.out.println("=== DATAEXTRACTOR RAW ===");
        System.out.println(response);
        String clean = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();
        System.out.println("=== DATAEXTRACTOR CLEAN LENGTH: " + clean.length() + " ===");
        JsonNode extractorNode = objectMapper.readTree(clean);

        // Step 3
        String weakFieldsJson = analyzerNode.has("weakFields")
                ? objectMapper.writeValueAsString(analyzerNode.get("weakFields")) : "[]";
        String weakReasonsJson = analyzerNode.has("weakReasons")
                ? objectMapper.writeValueAsString(analyzerNode.get("weakReasons")) : "{}";

        // Step 4: skipDelete가 false일 때만 삭제
        if (!skipDelete) {
            interviewDataRepository.findByAssessmentIdOrderByCreatedAtAsc(assessmentId).stream()
                    .filter(d -> d.getItemName().equals(itemName))
                    .forEach(interviewDataRepository::delete);
        }

        String techJson = extractorNode.has("tech")
                ? objectMapper.writeValueAsString(extractorNode.get("tech")) : "[]";

        InterviewData data = InterviewData.builder()
                .assessment(assessment).itemName(itemName)
                .role(extractorNode.has("role") && !extractorNode.get("role").isNull()
                        ? extractorNode.get("role").asText() : null)
                .action(extractorNode.has("action") && !extractorNode.get("action").isNull()
                        ? extractorNode.get("action").asText() : null)
                .tech(techJson)
                .result(extractorNode.has("result") && !extractorNode.get("result").isNull()
                        ? extractorNode.get("result").asText() : null)
                .rawQna(qnaJson)
                .completenessScore(analyzerNode.has("completenessScore")
                        ? analyzerNode.get("completenessScore").asDouble() : 0.0)
                .weakFields(weakFieldsJson).weakReasons(weakReasonsJson)
                .capabilityResult(analyzerNode.has("capabilities")
                        ? objectMapper.writeValueAsString(analyzerNode.get("capabilities")) : null)
                .build();

        interviewDataRepository.save(data);
        return analyzerNode;
    }
}
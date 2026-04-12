package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.Competency;
import com.kyoon.resumeagent.Entity.Job;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.JobRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.kyoon.resumeagent.Capability.JobCapabilityProfile;
import com.kyoon.resumeagent.Capability.PromptPathResolver;
import java.util.Map;
import java.util.HashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final ChatModel chatModel;
    private final JobRepository jobRepository;
    private final AssessmentRepository assessmentRepository;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;

    @Transactional
    public Assessment evaluateCompetency(User user, String jobCode, String experience) throws Exception {
        Job job = jobRepository.findByGroupCode(jobCode)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobCode));

        List<Competency> competencies = job.getCompetencies(); // ✅ 여기 선언

        ChatClient analyzerClient = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder()
                        .temperature(0.0)
                        .build())
                .build();

        String promptPath = PromptPathResolver.analyzer(job.getMeasureType().name());
        Resource promptResource = resourceLoader.getResource(promptPath);
        PromptTemplate template = new PromptTemplate(promptResource);

        Prompt prompt = template.create(Map.of(
                "jobName", job.getGroupName(),
                "jobCode", job.getGroupCode(),
                "experience", experience,
                "capabilityCodes", JobCapabilityProfile.getRelevantCodeNames(jobCode)
        ));

        String response = analyzerClient.prompt(prompt).call().content();

        System.out.println("=== EXPERIENCE INPUT ===");
        System.out.println(experience);
        System.out.println("=== CAPABILITY CODES ===");
        System.out.println(JobCapabilityProfile.getRelevantCodeNames(jobCode));

        System.out.println("=== ANALYZER RAW RESPONSE ===");
        System.out.println("promptPath: " + promptPath);
        System.out.println(response);


        String cleanJson = response.trim()
                .replaceAll("```json", "")
                .replaceAll("```", "")
                .trim();

        // ⚠️ CAPABILITY_VECTOR 블록 제거 후 JSON 파싱
        System.out.println("=== CLEAN JSON ===");
        System.out.println(cleanJson);
        JsonNode result = objectMapper.readTree(cleanJson);

        List<String> depthItems = new ArrayList<>();
        List<String> emptyItems = new ArrayList<>();
        List<Map<String, String>> complexItems = new ArrayList<>();
        List<Map<String, Object>> competencyResults = new ArrayList<>();

        if (result.get("competencyResults") != null) {
            result.get("competencyResults").forEach(item -> {
                String capCode = item.has("capCode") ? item.get("capCode").asText()
                        : item.get("name").asText();
                String displayName;
                try {
                    displayName = com.kyoon.resumeagent.Capability.CapabilityCode.valueOf(capCode).getDescription();
                } catch (IllegalArgumentException e) {
                    displayName = capCode;
                }
                String status = item.get("status").asText();
                String reason = item.has("reason") ? item.get("reason").asText() : "";
                String rewriteHint = item.has("rewriteHint") ? item.get("rewriteHint").asText() : "";
                String field = item.has("field") ? item.get("field").asText() : "career";

                Map<String, Object> compResult = new HashMap<>();
                compResult.put("capCode", capCode);
                compResult.put("name", displayName);
                compResult.put("status", status);
                compResult.put("reason", reason);
                compResult.put("rewriteHint", rewriteHint);
                compResult.put("field", field);
                competencyResults.add(compResult);

                switch (status) {
                    case "depth" -> depthItems.add(displayName);
                    case "empty" -> emptyItems.add(displayName);
                    case "complex" -> {
                        Map<String, String> complexItem = new HashMap<>();
                        complexItem.put("name", displayName);
                        complexItem.put("certName", item.has("certName") ? item.get("certName").asText() : "");
                        complexItem.put("reason", reason);
                        complexItems.add(complexItem);
                    }
                }
            });
        }

        Map<String, Object> analysisData = new HashMap<>();
        analysisData.put("experiences", result.get("experiences"));
        analysisData.put("competencyResults", competencyResults);
        analysisData.put("depthItems", depthItems);
        analysisData.put("emptyItems", emptyItems);
        analysisData.put("complexItems", complexItems);
        List<String> missingSignals = new ArrayList<>();
        if (result.has("missing_signals") && result.get("missing_signals").isArray()) {
            result.get("missing_signals").forEach(s -> missingSignals.add(s.asText()));
        }
        analysisData.put("missing_signals", missingSignals);

        Map<String, Double> capabilityVector = new LinkedHashMap<>();
        JsonNode vectorNode = result.get("capabilityVector");
        if (vectorNode != null) {
            vectorNode.fields().forEachRemaining(e -> capabilityVector.put(e.getKey(), e.getValue().asDouble()));
        }

        Assessment assessment = Assessment.builder()
                .user(user)
                .evaluatedJobCode(jobCode)
                .experience(experience)
                .analysis("{}")
                .scoreData(objectMapper.writeValueAsString(analysisData))
                .capabilityVector(capabilityVector)
                .isPrimary(false)
                .build();

        Assessment saved = assessmentRepository.save(assessment);

        if (user.getPrimaryAssessment() == null) {
            user.setPrimaryAssessment(saved);
            userRepository.save(user);
        }

        return saved;
    }

    private String buildCompetenciesDescription(List<Competency> competencies) {
        StringBuilder sb = new StringBuilder();
        for (Competency comp : competencies) {
            sb.append(String.format("- %s\n", comp.getName()));
        }
        return sb.toString();
    }
    private Map<String, Double> parseCapabilityVector(String aiResponse) {
        Pattern pattern = Pattern.compile(
                "\\[CAPABILITY_VECTOR\\]\\s*(.*?)\\s*\\[/CAPABILITY_VECTOR\\]",
                Pattern.DOTALL
        );
        Matcher matcher = pattern.matcher(aiResponse);

        if (matcher.find()) {
            Map<String, Double> vector = new HashMap<>();
            String[] entries = matcher.group(1).split(",");
            for (String entry : entries) {
                String[] parts = entry.trim().split(":");
                if (parts.length == 2) {
                    try {
                        vector.put(parts[0].trim(), Double.parseDouble(parts[1].trim()));
                    } catch (NumberFormatException e) {
                        // skip
                    }
                }
            }
            return vector;
        }
        return new HashMap<>();
    }
}
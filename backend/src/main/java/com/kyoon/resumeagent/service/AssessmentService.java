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
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.kyoon.resumeagent.Capability.JobCapabilityProfile;
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
        Job job = jobRepository.findByJobCode(jobCode)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobCode));

        List<Competency> competencies = job.getCompetencies(); // ✅ 여기 선언

        ChatClient analyzerClient = ChatClient.builder(chatModel)
                .defaultOptions(OpenAiChatOptions.builder()
                        .temperature(0.0)
                        .seed(42)
                        .maxTokens(2000)
                        .build())
                .build();

        Resource promptResource = resourceLoader.getResource("classpath:prompts/Analyzer.st");
        PromptTemplate template = new PromptTemplate(promptResource); // ✅ 여기 선언

        Prompt prompt = template.create(Map.of(
                "jobName", job.getJobName(),
                "jobCode", job.getJobCode(),
                "competencies", buildCompetenciesDescription(competencies),
                "experience", experience,
                "capabilityCodes", JobCapabilityProfile.getRelevantCodeNames(jobCode) // ✅ 추가
        ));

        String response = analyzerClient.prompt(prompt).call().content();
        String cleanJson = response.trim()
                .replaceAll("```json", "")
                .replaceAll("```", "")
                .trim();

        // ⚠️ CAPABILITY_VECTOR 블록 제거 후 JSON 파싱
        String jsonOnly = cleanJson.replaceAll(
                "\\[CAPABILITY_VECTOR\\].*?\\[/CAPABILITY_VECTOR\\]", ""
        ).trim();

        JsonNode result = objectMapper.readTree(jsonOnly);

        List<String> depthItems = new ArrayList<>();
        List<String> emptyItems = new ArrayList<>();
        List<Map<String, String>> complexItems = new ArrayList<>();
        List<Map<String, Object>> competencyResults = new ArrayList<>();

        if (result.get("competencyResults") != null) {
            result.get("competencyResults").forEach(item -> {
                String name = item.get("name").asText();
                String status = item.get("status").asText();
                String reason = item.has("reason") ? item.get("reason").asText() : "";
                String rewriteHint = item.has("rewriteHint") ? item.get("rewriteHint").asText() : "";
                String field = item.has("field") ? item.get("field").asText() : "career";

                Map<String, Object> compResult = new HashMap<>();
                compResult.put("name", name);
                compResult.put("status", status);
                compResult.put("reason", reason);
                compResult.put("rewriteHint", rewriteHint);
                compResult.put("field", field);
                competencyResults.add(compResult);

                switch (status) {
                    case "depth" -> depthItems.add(name);
                    case "empty" -> emptyItems.add(name);
                    case "complex" -> {
                        Map<String, String> complexItem = new HashMap<>();
                        complexItem.put("name", name);
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

        Map<String, Double> capabilityVector = parseCapabilityVector(response);

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
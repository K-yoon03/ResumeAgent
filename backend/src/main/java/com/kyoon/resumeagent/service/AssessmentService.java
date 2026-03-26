package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.Competency;
import com.kyoon.resumeagent.Entity.Job;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.JobRepository;
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

import java.util.*;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final ChatModel chatModel;
    private final JobRepository jobRepository;
    private final AssessmentRepository assessmentRepository;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;

    @Transactional
    public Assessment evaluateCompetency(User user, String jobCode, String experience) throws Exception {
        Job job = jobRepository.findByJobCode(jobCode)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobCode));

        List<Competency> competencies = job.getCompetencies();

        ChatClient analyzerClient = ChatClient.builder(chatModel)
                .defaultOptions(OpenAiChatOptions.builder()
                        .temperature(0.0)
                        .seed(42)
                        .maxTokens(2000)
                        .build())
                .build();

        Resource promptResource = resourceLoader.getResource("classpath:prompts/Analyzer.st");
        PromptTemplate template = new PromptTemplate(promptResource);

        Prompt prompt = template.create(Map.of(
                "jobName", job.getJobName(),
                "jobCode", job.getJobCode(),
                "competencies", buildCompetenciesDescription(competencies),
                "experience", experience
        ));

        String response = analyzerClient.prompt(prompt).call().content();
        String cleanJson = response.trim()
                .replaceAll("```json", "")
                .replaceAll("```", "")
                .trim();

        JsonNode result = objectMapper.readTree(cleanJson);

        // 분류 결과 추출
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

        Assessment assessment = Assessment.builder()
                .user(user)
                .evaluatedJobCode(jobCode)
                .experience(experience)
                .analysis("{}")
                .scoreData(objectMapper.writeValueAsString(analysisData))
                .isPrimary(false)
                .build();

        return assessmentRepository.save(assessment);
    }

    private String buildCompetenciesDescription(List<Competency> competencies) {
        StringBuilder sb = new StringBuilder();
        for (Competency comp : competencies) {
            sb.append(String.format("- %s\n", comp.getName()));
        }
        return sb.toString();
    }
}
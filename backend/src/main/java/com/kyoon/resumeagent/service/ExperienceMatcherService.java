package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.Map;

@Service
@RequiredArgsConstructor
public class ExperienceMatcherService {

    private final ChatModel chatModel;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final JobRepository jobRepository;

    public record MatchResult(String jobCode, double confidence, String reason, boolean noMatch) {}

    public MatchResult matchFromExperience(String experience) throws Exception {
        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).maxTokens(300).build())
                .build();

        Resource promptResource = resourceLoader.getResource("classpath:prompts/common/ExperienceMatcher.st");
        PromptTemplate template = new PromptTemplate(promptResource);

        Prompt prompt = template.create(Map.of(
                "availableJobs", buildJobsDescription(),
                "experience", experience
        ));

        String response = client.prompt(prompt).call().content();
        System.out.println("🔍 ExperienceMatcher 응답: " + response);
        String cleanJson = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();

        JsonNode result = objectMapper.readTree(cleanJson);

        String jobCode = result.get("jobCode").asText();
        double confidence = result.get("confidence").asDouble();
        String reason = result.get("reason").asText();

        if ("NO_MATCH".equals(jobCode) || !jobRepository.existsByGroupCode(jobCode)) {
            return new MatchResult("NO_MATCH", 0.0, reason, true);
        }

        return new MatchResult(jobCode, confidence, reason, false);
    }

    private String buildJobsDescription() {
        StringBuilder sb = new StringBuilder();
        jobRepository.findAll().forEach(job ->
                sb.append(String.format("- %s (%s)%n", job.getGroupCode(), job.getGroupName()))
        );
        return sb.toString();
    }
}
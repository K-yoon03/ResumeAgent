package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.DTO.JobMatchResult;
import com.kyoon.resumeagent.DTO.JobMatchType;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class JobMatcherService {

    private final ChatModel chatModel;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final JobRepository jobRepository;

    public JobMatchResult matchJob(String userInput) throws Exception {
        ChatClient jobMatcherClient = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder()
                        .temperature(0.1)
                        .build())
                .build();

        String availableJobs = buildJobsDescription();

        Resource promptResource = resourceLoader.getResource("classpath:prompts/common/JobMatcher.st");
        PromptTemplate template = new PromptTemplate(promptResource);

        Prompt prompt = template.create(Map.of(
                "availableJobs", availableJobs,
                "userInput", userInput
        ));

        String response = jobMatcherClient.prompt(prompt).call().content();
        String cleanJson = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();

        JsonNode result = objectMapper.readTree(cleanJson);

        List<String> suggestions = new ArrayList<>();
        if (result.has("suggestions") && result.get("suggestions").isArray()) {
            result.get("suggestions").forEach(node -> suggestions.add(node.asText()));
        }

        return new JobMatchResult(
                JobMatchType.valueOf(result.get("matchType").asText()),
                result.get("jobCode").asText(),
                result.get("confidence").asDouble(),
                result.get("isTemporary").asBoolean(),
                suggestions,
                result.get("reason").asText()
        );
    }

    private String buildJobsDescription() {
        StringBuilder sb = new StringBuilder();
        jobRepository.findAll().forEach(job ->
                sb.append(String.format("- %s (%s)%n", job.getGroupCode(), job.getGroupName()))
        );
        return sb.toString();
    }
}
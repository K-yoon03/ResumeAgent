package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.DepthAnswer;
import com.kyoon.resumeagent.repository.DepthAnswerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StarExtractorService {

    private final ChatModel chatModel;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final DepthAnswerRepository depthAnswerRepository;

    public record StarResult(
            String itemName,
            String situation,
            String reason,
            String action,
            String result,
            boolean isCreative
    ) {}

    public List<StarResult> extractStars(Long assessmentId, String jobName) throws Exception {
        List<DepthAnswer> answers = depthAnswerRepository
                .findByAssessmentIdOrderByItemNameAscSequenceAsc(assessmentId);

        if (answers.isEmpty()) return List.of();

        // itemName 기준으로 그룹핑
        Map<String, List<DepthAnswer>> grouped = answers.stream()
                .collect(Collectors.groupingBy(DepthAnswer::getItemName, LinkedHashMap::new, Collectors.toList()));

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.7).maxTokens(800).build())
                .build();

        Resource promptResource = resourceLoader.getResource("classpath:prompts/StarExtractor.st");
        PromptTemplate template = new PromptTemplate(promptResource);

        List<StarResult> results = new ArrayList<>();

        for (Map.Entry<String, List<DepthAnswer>> entry : grouped.entrySet()) {
            String itemName = entry.getKey();
            String qna = entry.getValue().stream()
                    .map(a -> String.format("Q: %s\nA: %s", a.getQuestion(), a.getAnswer() != null ? a.getAnswer() : ""))
                    .collect(Collectors.joining("\n\n"));

            Prompt prompt = template.create(Map.of(
                    "itemName", itemName,
                    "jobName", jobName,
                    "qna", qna
            ));

            String response = client.prompt(prompt).call().content();
            String cleanJson = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();

            try {
                JsonNode node = objectMapper.readTree(cleanJson);
                results.add(new StarResult(
                        itemName,
                        node.has("situation") ? node.get("situation").asText() : "",
                        node.has("reason") ? node.get("reason").asText() : "",
                        node.has("action") ? node.get("action").asText() : "",
                        node.has("result") ? node.get("result").asText() : "",
                        node.has("isCreative") && node.get("isCreative").asBoolean()
                ));
            } catch (Exception e) {
                // 파싱 실패 시 빈 STAR
                results.add(new StarResult(itemName, "", "", "", "", true));
            }
        }

        return results;
    }
}
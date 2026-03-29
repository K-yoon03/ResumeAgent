package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Capability.JobCapabilityProfile;
import com.kyoon.resumeagent.DTO.JobMatchResult;
import com.kyoon.resumeagent.DTO.JobMatchType;
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

    public JobMatchResult matchJob(String userInput) throws Exception {
        ChatClient jobMatcherClient = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder()
                        .temperature(0.1)
                        .maxTokens(500)
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
        JobCapabilityProfile.JOB_PROFILES.forEach((groupCode, weights) -> {
            String groupName = switch (groupCode) {
                case "SW_WEB" -> "웹/앱 개발";
                case "SW_AI" -> "AI/데이터 엔지니어링";
                case "SW_SYSTEM" -> "시스템/임베디드/IoT";
                case "SW_GAME" -> "게임/인터랙티브 콘텐츠";
                case "SW_SPATIAL" -> "공간정보/디지털트윈";
                case "SECURITY_CLOUD" -> "보안/클라우드/네트워크";
                case "SEMI_SW" -> "반도체SW/제어";
                case "SEMI_PROCESS" -> "반도체 공정/장비";
                case "ELEC_AUTO" -> "전기/자동화";
                case "MECHANIC" -> "기계/설계";
                case "BIO_PHARMA" -> "바이오/의약";
                case "ARCHITECTURE" -> "건축/토목";
                case "AVIATION" -> "항공/모빌리티";
                case "BUSINESS" -> "경영/비즈니스";
                case "DESIGN_MEDIA" -> "디자인/미디어";
                case "SERVICE_HUMAN" -> "서비스/인문";
                default -> groupCode;
            };
            sb.append(String.format("- %s (%s)\n", groupCode, groupName));
        });
        return sb.toString();
    }
}
package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.DTO.JobMatchResult;
import com.kyoon.resumeagent.DTO.JobMatchType;
import com.kyoon.resumeagent.Entity.Job;
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

    private final ChatModel chatModel;  // 🔥 변경: ChatClient → ChatModel
    private final JobRepository jobRepository;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;

    /**
     * 사용자 입력 직무를 NCS 직무 코드로 매핑
     */
    public JobMatchResult matchJob(String userInput) throws Exception {
        // 1. JobMatcher 전용 ChatClient 생성
        ChatClient jobMatcherClient = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder()
                        .temperature(0.1)  // 🔥 일관성 최대화
                        .maxTokens(500)    // 🔥 응답 길이 제한
                        .build())
                .build();

        // 2. 전체 직무 목록 조회
        List<Job> allJobs = jobRepository.findAll();
        String availableJobs = buildJobsDescription(allJobs);

        // 3. 프롬프트 생성
        Resource promptResource = resourceLoader.getResource("classpath:prompts/JobMatcher.st");
        PromptTemplate template = new PromptTemplate(promptResource);

        Prompt prompt = template.create(Map.of(
                "availableJobs", availableJobs,
                "userInput", userInput
        ));

        // 4. LLM 호출 (전용 Client 사용)
        String response = jobMatcherClient.prompt(prompt).call().content();

        // 5. JSON 파싱
        JsonNode result = objectMapper.readTree(response);

        // 6. suggestions 파싱 (배열)
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

    /**
     * 직무 목록을 설명 문자열로 변환
     */
    private String buildJobsDescription(List<Job> jobs) {
        StringBuilder sb = new StringBuilder();
        for (Job job : jobs) {
            sb.append(String.format(
                    "- %s (%s): %s > %s%s\n",
                    job.getJobCode(),
                    job.getJobName(),
                    job.getNcsLarge(),
                    job.getNcsMedium(),
                    job.getIsTemporary() ? " [범용]" : ""
            ));
        }
        return sb.toString();
    }
}
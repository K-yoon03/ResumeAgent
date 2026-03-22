package com.kyoon.resumeagent.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
public class ResumeGeneratorService {

    private final ChatClient chatClient;

    @Value("classpath:/prompts/ResumeGenerator.st")
    private Resource prompt;

    public ResumeGeneratorService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public Flux<String> generate(String profile, String analysis, String jobPosting, String additionalInfo) {

        String finalJobPosting = (jobPosting == null || jobPosting.isBlank())
                ? "회사명 : 00회사\n우대사항: 없음\n회사 비전: 성장하는 스타트업"
                : jobPosting;

        String finalAdditionalInfo = (additionalInfo == null || additionalInfo.isBlank())
                ? "없음"
                : additionalInfo;

        return chatClient.prompt()
                .system(s -> s.text(prompt)
                        .param("profile", profile)
                        .param("analysis", analysis)
                        .param("jobPosting", finalJobPosting)
                        .param("additionalInfo", finalAdditionalInfo))
                .user("자기소개서를 작성하세요.")
                .stream()
                .content();
    }
}
package com.kyoon.resumeagent.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
public class AnalyzerService {

    private final ChatClient chatClient;

    @Value("classpath:/prompts/Analyzer.st")
    private Resource analyzerPromptResource;

    public AnalyzerService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public Flux<String> analyzeExperienceStream(String experience) {
        return chatClient.prompt()
                .system(s -> s.text(analyzerPromptResource).param("experience", experience))
                .user("분석을 시작해줘.")
                .stream()
                .content()
                // 줄 단위로 버퍼링 - 토큰이 쪼개져도 한 줄씩 완성해서 전송
                .bufferUntil(token -> token.contains("\n"))
                .map(tokens -> String.join("", tokens));
    }
}
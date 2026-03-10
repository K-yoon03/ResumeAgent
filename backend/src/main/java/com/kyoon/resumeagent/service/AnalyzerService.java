package com.kyoon.resumeagent.service;


import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
public class AnalyzerService {

    private final ChatClient chatClient;
    private final InputCleanerService cleanerService;

    @Value("classpath:/prompts/Analyzer.st")
    private Resource analyzerPromptResource;

    public AnalyzerService(ChatClient.Builder builder,
                           InputCleanerService cleanerService) {
        this.chatClient = builder.build();
        this.cleanerService = cleanerService;
    }

    public Flux<String> analyzeExperienceStream(String experience) {

        String cleaned = cleanerService.clean(experience);

        return chatClient.prompt()
                .system(s -> s.text(analyzerPromptResource)
                        .param("experience", cleaned))
                .user("데이터를 기반으로 역량을 분석하세요.")
                .stream()
                .content()
                .bufferUntil(token -> token.contains("\n"))
                .map(tokens -> String.join("", tokens));
    }
}
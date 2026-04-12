package com.kyoon.resumeagent.service;


import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.List;

@Service
public class AnalyzerService {

    public record ScoreResponse(
            int overall,
            int jobFit,
            int growth,
            int communication,
            int execution,
            int diversity,
            List<String> strengths,
            List<String> improvements
    ) {}

    private final ChatClient chatClient;

    @Value("classpath:/prompts/analyzer/Analyzer.st")
    private Resource analyzerPromptResource;

    public AnalyzerService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String extractProjects(String experience) {
        String result = chatClient.prompt()
                .user("""
            아래 경험에서 프로젝트/활동을 추출하세요.
            반드시 JSON만 반환하세요.
            {
              "projects": [
                {"name": "프로젝트명", "techStack": "기술스택", "period": "기간"}
              ]
            }
            경험: """ + experience)
                .call()
                .content();
        try {
            return result.trim().replaceAll("```json","").replaceAll("```","").trim();
        } catch (Exception e) {
            return "{\"projects\": []}";
        }
    }
}
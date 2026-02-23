package com.kyoon.resumeagent.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.ChatOptions; // 공통 옵션 인터페이스
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import org.springframework.beans.factory.annotation.Value; // @Value를 위한 임포트
import org.springframework.core.io.Resource;               // Resource를 위한 임포트

@Service
public class WriterService {

    private final ChatClient chatClient;

    @Value("classpath:/prompts/Writer.st")
    private Resource writerPromptResource;

    public WriterService(ChatClient.Builder builder) {
        this.chatClient = builder
                .defaultOptions(ChatOptions.builder()
                        .temperature(0.8)
                        .build())
                .build();
    }

    // 매개변수 이름을 프롬프트의 {experience}, {analysis}와 일치시킵니다.
    public Flux<String> writeResumeStream(String experience, String analysis, String userRequest) {
        return chatClient.prompt()
                .system(s -> s.text(writerPromptResource)
                        .param("experience", experience)
                        .param("analysis", analysis)
                        .param("userRequest", userRequest)) // 추가 요청 데이터 주입
                .user("사용자의 추가 요청을 반영하여 최종 자소서 초안을 완성해줘.")
                .stream()
                .content();
    }
}
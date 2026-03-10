package com.kyoon.resumeagent.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

@Service
public class InputCleanerService {

    private final ChatClient chatClient;

    @Value("classpath:/prompts/InputCleaner.st")
    private Resource cleanerPrompt;

    public InputCleanerService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String clean(String experience) {

        return chatClient.prompt()
                .system(s -> s.text(cleanerPrompt).param("experience", experience))
                .user("사용자 데이터를 정리하세요.")
                .call()
                .content();
    }
}
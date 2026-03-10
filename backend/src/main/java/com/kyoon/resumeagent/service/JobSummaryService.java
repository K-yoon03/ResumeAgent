package com.kyoon.resumeagent.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class JobSummaryService {

    private final ChatClient chatClient;

    public JobSummaryService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    public String summarize(String jobPosting) {
        return chatClient.prompt()
                .system("""
                        채용공고 텍스트를 분석해서 아래 형식으로 정리해줘.
                        반드시 마크다운 형식으로 출력해.
                        
                        ## 🏢 회사명
                        ## 📋 직무
                        ## 📌 주요 업무
                        ## ✅ 자격 요건
                        ## ⭐ 우대 사항
                        ## 💡 회사 비전/문화
                        
                        없는 항목은 '정보 없음'으로 표시해.
                        """)
                .user(jobPosting)
                .call()
                .content();
    }
}
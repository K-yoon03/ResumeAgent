package com.kyoon.resumeagent.service;


import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
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
    private final InputCleanerService cleanerService;

    @Value("classpath:/prompts/Analyzer.st")
    private Resource analyzerPromptResource;

    public AnalyzerService(ChatClient.Builder builder,
                           InputCleanerService cleanerService) {
        this.chatClient = builder.build();
        this.cleanerService = cleanerService;
    }

    public Flux<String> analyzeExperienceStream(String experience) {
        return chatClient.prompt()
                .system(s -> s.text(analyzerPromptResource)
                        .param("experience", experience))
                .user("데이터를 기반으로 역량을 분석하세요.")
                .stream()
                .content()
                .bufferUntil(token -> token.contains("\n"))
                .map(tokens -> String.join("", tokens));
    }
    @Cacheable(value = "scoreCache", key = "#experience.hashCode()")
    public ScoreResponse score(String experience) {
        String result = chatClient.prompt()
                .user("""
            당신은 채용 전문가입니다. 지원자의 경험을 분석하여 아래 형식의 JSON만 반환하세요.
            절대 다른 텍스트 없이 JSON만 반환하세요. 마크다운 코드블록도 사용하지 마세요.
            
            {
              "overall": 전체 점수 (0-100),
              "jobFit": 직무 적합도 (0-100),
              "growth": 성장 가능성 (0-100),
              "communication": 협업/소통 능력 (0-100),
              "execution": 실행력/추진력 (0-100),
              "diversity": 경험 다양성 (0-100),
              "strengths": ["강점1", "강점2", "강점3"],
              "improvements": ["개선점1", "개선점2"]
            }
            
            점수 기준: 90이상=매우뛰어남, 70-89=우수, 50-69=보통, 49이하=부족
            
            경험 데이터:
            """ + experience)
                .call()
                .content();

        try {
            // 혹시 ```json 블록으로 감싸져 있으면 제거
            String clean = result.trim()
                    .replaceAll("```json", "")
                    .replaceAll("```", "")
                    .trim();
            return new ObjectMapper().readValue(clean, ScoreResponse.class);
        } catch (Exception e) {
            return new ScoreResponse(50, 50, 50, 50, 50, 50,
                    List.of("분석 중 오류가 발생했습니다."),
                    List.of("다시 시도해주세요."));
        }
    }
}
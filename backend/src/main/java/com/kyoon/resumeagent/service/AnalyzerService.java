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
    public String generateFollowUpQuestions(String experience, String analysis) {
        String result = chatClient.prompt()
                .user("""
            아래는 취준생의 경험과 역량 분석 결과입니다.
            자기소개서 작성에 도움이 될 구체적인 질문을 생성하세요.
            
            규칙:
            - 경험 개수가 3개 미만이면 경험 개수만큼만 질문 생성
            - 경험 개수가 3개 이상이면 자기소개서에 가장 임팩트 있을 경험 3개 선택
            - 각 질문은 STAR 기법(상황/행동/결과)을 유도하는 방식으로 작성
            - 목표 직무가 있다면 해당 직무 관점에서 질문 생성
            
            반드시 아래 JSON 형식으로만 반환하세요. 다른 텍스트 없이 JSON만 반환하세요.
            {
              "questions": [
                {"id": 1, "experience": "관련 경험명", "question": "구체적인 질문"},
                {"id": 2, "experience": "관련 경험명", "question": "구체적인 질문"}
              ]
            }
            
            경험: """ + experience + """
            
            분석 결과: """ + analysis
                )
                .call()
                .content();

        // JSON 파싱 안전하게 처리
        try {
            String clean = result.trim()
                    .replaceAll("```json", "")
                    .replaceAll("```", "")
                    .trim();
            return clean;
        } catch (Exception e) {
            return "{\"questions\": []}";
        }
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
package com.kyoon.resumeagent.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

@Service
public class InterviewService {

    private final ChatClient chatClient;

    public InterviewService(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    // 1. 면접 질문 생성 (1:1 대화형)
    public Flux<String> generateQuestion(String resume, String jobPosting, String history, int questionNumber, int totalQuestions) {
        return chatClient.prompt()
                .system("""
                        당신은 채용 담당 면접관입니다.
                        지원자의 자기소개서와 채용공고를 바탕으로 면접 질문을 1개만 생성하세요.
                        이전 대화 내용을 참고하여 자연스럽게 이어지는 질문을 해주세요.
                        질문만 출력하고 다른 말은 하지 마세요.
                        
                        채용공고:
                        """ + jobPosting + """
                        
                        자기소개서:
                        """ + resume + """
                        
                        이전 대화:
                        """ + history + """
                        
                        현재 """ + questionNumber + "/" + totalQuestions + "번째 질문입니다.")
                .user("다음 면접 질문을 해주세요.")
                .stream()
                .content()
                .bufferUntil(token -> token.contains("\n"))
                .map(tokens -> String.join("", tokens));
    }

    // 2. 답변 피드백
    public Flux<String> feedback(String resume, String jobPosting, String question, String answer) {
        return chatClient.prompt()
                .system("""
                    당신은 냉철하고 엄격한 채용 면접관입니다.
                    지원자의 답변을 객관적으로 평가하세요.
                    
                    규칙:
                    - 답변이 불성실하거나 짧으면 반드시 지적하세요
                    - 욕설, 비속어, 무관한 내용이 포함되면 강하게 경고하세요
                    - 과도한 칭찬 금지. 잘한 점이 없으면 없다고 하세요
                    - 구체적인 근거 없이 칭찬하지 마세요
                    
                    ## 💬 답변 평가
                    ## ✅ 잘한 점 (없으면 "없음"으로 표시)
                    ## ⚠️ 문제점
                    ## 💡 개선 방향
                    
                    채용공고: """ + jobPosting + """
                    자기소개서: """ + resume + """
                    질문: """ + question + """
                    답변: """ + answer)
                .user("답변을 평가해주세요.")
                .stream()
                .content()
                .bufferUntil(token -> token.contains("\n"))
                .map(tokens -> String.join("", tokens));
    }

    // 3. 종합 총평 생성 (🔥 신규!)
    public Flux<String> generateSummary(String resume, String jobPosting, String questionsAndAnswers) {
        return chatClient.prompt()
                .system("""
                    당신은 냉철하고 엄격한 채용 면접관입니다.
                    면접 전체를 종합하여 최종 평가를 내리세요.
                    
                    규칙:
                    - 한 줄 요약은 30자 이내로 핵심만 담으세요
                    - 채용 여부를 판단할 만한 명확한 기준을 제시하세요
                    - 불성실한 답변이 하나라도 있으면 합격 가능성은 "하"입니다
                    - 과도한 칭찬 절대 금지
                    - 잘한 점이 없으면 "없음"으로 표시하세요
                    - 개선 방향은 구체적이고 실행 가능해야 합니다
                    
                    ## 🎯 한 줄 요약
                    (30자 이내로 핵심만)
                    
                    ## 📊 종합 평가
                    
                    ## ✅ 강점
                    (답변 기준, 없으면 "없음")
                    
                    ## ⚠️ 약점
                    (명확하게 지적)
                    
                    ## 💡 개선 방향
                    (구체적인 실행 방안)
                    
                    ## 🏆 합격 가능성
                    상/중/하 중 하나 선택하고 한 줄로 이유 설명
                    
                    채용공고:
                    """ + jobPosting + """
                    
                    자기소개서:
                    """ + resume + """
                    
                    면접 내용:
                    """ + questionsAndAnswers)
                .user("면접 전체를 종합 평가해주세요.")
                .stream()
                .content()
                .bufferUntil(token -> token.contains("\n"))
                .map(tokens -> String.join("", tokens));
    }
}
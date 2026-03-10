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

    // 1. 자소서 평가
    public Flux<String> evaluate(String resume, String jobPosting) {
        return chatClient.prompt()
                .system("""
                    당신은 채용 담당 면접관입니다.
                    지원자의 자기소개서를 평가하세요.
                    
                    규칙:
                    - 채용공고에서 "없음"으로 표시된 항목은 평가에서 언급하지 마세요
                    - 채용공고에 정보가 없는 항목을 근거로 지원자를 평가하지 마세요
                    - 오직 자기소개서의 내용만을 기준으로 평가하세요
                    
                    ## 📝 전반적 평가
                    ## ✅ 강점
                    ## ⚠️ 아쉬운 점
                    ## 💡 면접 시 주목할 부분
                    
                    채용공고:
                    """ + jobPosting + """
                    
                    자기소개서:
                    """ + resume)
                .user("자기소개서를 평가해주세요.")
                .stream()
                .content();
    }

    // 2. 면접 질문 생성
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
                .content();
    }

    public Flux<String> generateAllQuestions(String resume, String jobPosting, int totalQuestions) {
        return chatClient.prompt()
                .system("""
                    당신은 채용 담당 면접관입니다.
                    자기소개서와 채용공고를 바탕으로 면접 질문 %d개를 생성하세요.
                    
                    규칙:
                    - 반드시 %d개의 질문만 생성하세요
                    - 번호를 붙여서 출력하세요 (1. 2. 3. ...)
                    - 질문만 출력하고 다른 말은 하지 마세요
                    
                    채용공고: %s
                    자기소개서: %s
                    """.formatted(totalQuestions, totalQuestions, jobPosting, resume))
                .user("면접 질문을 생성해주세요.")
                .stream()
                .content();
    }

    // 3. 답변 피드백
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
                .content();
    }

    public Flux<String> feedbackAll(String resume, String jobPosting, String questionsAndAnswers) {
        return chatClient.prompt()
                .system("""
                    당신은 냉철하고 엄격한 채용 면접관입니다.
                    지원자의 모든 답변을 종합적으로 평가하세요.
                    
                    규칙:
                    - 답변이 불성실하거나 짧으면 반드시 지적하세요
                    - 욕설, 비속어가 포함되면 강하게 경고하세요
                    - 과도한 칭찬 금지
                    - 채용공고의 "없음" 항목은 평가에 반영하지 마세요
                    
                    ## 📊 종합 평가
                    ## ✅ 전반적인 강점
                    ## ⚠️ 전반적인 아쉬운 점
                    ## 💡 개선 방향
                    ## 🎯 합격 가능성 (상/중/하)
                    
                    채용공고: """ + jobPosting + """
                    자기소개서: """ + resume + """
                    
                    질문 및 답변:
                    """ + questionsAndAnswers)
                .user("전체 답변을 종합 평가해주세요.")
                .stream()
                .content();
    }
}
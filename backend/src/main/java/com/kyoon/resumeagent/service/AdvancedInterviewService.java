package com.kyoon.resumeagent.service;

import com.kyoon.resumeagent.Entity.*;
import com.kyoon.resumeagent.repository.InterviewResultRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
public class AdvancedInterviewService {

    private final ChatClient chatClient;
    private final InterviewResultRepository repository;
    private final UserRepository userRepository;

    // 🔥 최적화 상수
    private static final int MAX_RESUME_LENGTH = 1000;
    private static final int MAX_JOB_POSTING_LENGTH = 500;
    private static final int MAX_ANSWER_LENGTH = 400;

    /**
     * 1. 면접 세션 시작
     */
    @Transactional
    public InterviewResult startSession(String userEmail, String resume, String jobPosting, int totalQuestions) {
        User user = userRepository.findByEmail(userEmail).orElseThrow();

        InterviewResult session = InterviewResult.builder()
                .sessionId(UUID.randomUUID().toString())
                .user(user)
                .mode("advanced")
                .resumeContent(resume)
                .totalQuestions(totalQuestions)
                .currentIndex(0)
                .isCompleted(false)
                .totalFollowUpCount(0) // 🔥 전체 제한
                .build();

        // 질문 생성
        List<String> questions = generateQuestions(resume, jobPosting, totalQuestions);

        for (String q : questions) {
            InterviewQuestion question = InterviewQuestion.builder()
                    .questionText(q)
                    .needsFollowUp(false)
                    .followUpCount(0)
                    .build();
            session.addQuestion(question);
        }

        return repository.save(session);
    }

    /**
     * 2. 질문 생성 (프롬프트 유지, 길이만 제한)
     */
    private List<String> generateQuestions(String resume, String jobPosting, int totalQuestions) {
        String prompt = String.format("""
            당신은 채용 면접관입니다.
            자기소개서와 채용공고를 바탕으로 면접 질문 %d개를 생성하세요.
            
            규칙:
            - 반드시 %d개의 질문만 생성
            - 각 질문은 한 줄로 작성
            - 번호 없이 질문만 출력
            - 단순 질문 금지 ("자기소개 해주세요" 같은 것 금지)
            - 경험 검증 질문 포함 (구체적인 역할, 결과, 어려움)
            - 기술 질문 포함 (사용한 기술의 이유, 트레이드오프, 대안)
            - 최소 2개는 꼬리 질문으로 파고들 수 있는 질문
            
            예시:
            - "프로젝트에서 Redis를 선택한 이유는 무엇인가요? 다른 대안은 없었나요?"
            - "팀원과의 갈등 상황에서 어떻게 해결하셨나요? 결과는 어땠나요?"
            
            자기소개서:
            %s
            
            채용공고:
            %s
            """, totalQuestions, totalQuestions,
                smartTruncate(resume, MAX_RESUME_LENGTH),  // 🔥 길이만 제한
                smartTruncate(jobPosting, MAX_JOB_POSTING_LENGTH));

        String response = chatClient.prompt()
                .user(prompt)
                .call()
                .content();

        return List.of(response.split("\n"))
                .stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty() && !s.matches("^\\d+\\..*"))
                .limit(totalQuestions)
                .toList();
    }

    /**
     * 3. 답변 평가 (프롬프트 유지, 자소서/채용공고만 제거)
     */
    @Transactional
    public Flux<String> evaluateAnswer(String sessionId, String answer) {
        InterviewResult session = repository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        InterviewQuestion currentQ = session.getCurrentQuestion();
        if (currentQ == null) {
            return Flux.error(new RuntimeException("No current question"));
        }

        currentQ.setAnswer(answer);

        AtomicReference<String> fullEvaluation = new AtomicReference<>("");
        AtomicReference<Boolean> needsFollowUp = new AtomicReference<>(false);

        // 🔥 최적화: 자소서/채용공고 제거 (이미 질문에 반영됨)
        return chatClient.prompt()
                .system("""
                    당신은 냉정한 채용 면접관입니다.
                    답변을 평가하고, 꼬리 질문이 필요한지 판단하세요.
                    
                    평가 기준:
                    - 답변의 구체성 (모호한 표현 금지)
                    - 기술적 깊이 (단순 나열 금지)
                    - 경험의 진정성 (과장 의심)
                    - 정량적 지표 유무
                    
                    출력 형식:
                    [EVALUATION]
                    (평가 내용)
                    
                    [NEEDS_FOLLOW_UP]
                    true 또는 false
                    
                    NEEDS_FOLLOW_UP 판단 기준:
                    - 답변이 모호하거나 짧으면: true
                    - 기술 질문인데 "왜"에 대한 답이 없으면: true
                    - 숫자 없이 "개선했다"만 있으면: true
                    - "Redis를 사용했다"만 있고 이유가 없으면: true
                    - 충분히 구체적이고 깊이있으면: false
                    """)
                .user(String.format("""
                    질문: %s
                    답변: %s
                    """, currentQ.getQuestionText(),
                        smartTruncate(answer, MAX_ANSWER_LENGTH))) // 🔥 답변만 제한
                .stream()
                .content()
                .doOnNext(chunk -> {
                    String current = fullEvaluation.get() + chunk;
                    fullEvaluation.set(current);

                    if (current.contains("[NEEDS_FOLLOW_UP]")) {
                        String afterTag = current.substring(current.indexOf("[NEEDS_FOLLOW_UP]") + 17).trim();
                        needsFollowUp.set(afterTag.toLowerCase().startsWith("true"));
                    }
                })
                .doOnComplete(() -> {
                    String eval = fullEvaluation.get();
                    if (eval.contains("[EVALUATION]")) {
                        int start = eval.indexOf("[EVALUATION]") + 12;
                        int end = eval.contains("[NEEDS_FOLLOW_UP]")
                                ? eval.indexOf("[NEEDS_FOLLOW_UP]")
                                : eval.length();
                        currentQ.setEvaluation(eval.substring(start, end).trim());
                    } else {
                        currentQ.setEvaluation(eval);
                    }

                    // 🔥 전체 제한 체크
                    boolean canAdd = needsFollowUp.get() && session.canAddMoreFollowUps();
                    currentQ.setNeedsFollowUp(canAdd);

                    repository.save(session);
                });
    }

    /**
     * 4. 꼬리 질문 생성 (프롬프트 유지, 답변만 제한)
     */
    @Transactional
    public Flux<String> generateFollowUp(String sessionId) {
        InterviewResult session = repository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        InterviewQuestion currentQ = session.getCurrentQuestion();
        if (currentQ == null || !currentQ.canAddFollowUp() || !session.canAddMoreFollowUps()) {
            return Flux.error(new RuntimeException("Cannot add follow-up"));
        }

        AtomicReference<String> fullQuestion = new AtomicReference<>("");

        return chatClient.prompt()
                .system("""
                    당신은 채용 면접관입니다.
                    답변의 부족한 부분을 파고드는 꼬리 질문을 생성하세요.
                    
                    규칙:
                    - 반드시 "답변 기반"으로 질문
                    - 모호한 부분을 구체화하도록 유도
                    - 기술 질문이면 더 깊이 파고들 것
                    - 숫자나 지표를 요구할 것
                    - 질문만 출력, 다른 말 금지
                    
                    예시:
                    Q: "Redis를 사용했습니다"
                    → "Redis를 선택한 구체적인 이유는 무엇인가요? 다른 캐시 솔루션과 비교하셨나요?"
                    
                    Q: "성능을 개선했습니다"
                    → "구체적으로 어떤 지표가 얼마나 개선되었나요? 측정 방법은요?"
                    """)
                .user(String.format("""
                    원래 질문: %s
                    사용자 답변: %s
                    
                    꼬리 질문을 생성하세요.
                    """, currentQ.getQuestionText(),
                        smartTruncate(currentQ.getAnswer(), MAX_ANSWER_LENGTH)))
                .stream()
                .content()
                .doOnNext(chunk -> fullQuestion.set(fullQuestion.get() + chunk))
                .doOnComplete(() -> {
                    FollowUpQuestion followUp = FollowUpQuestion.builder()
                            .questionText(fullQuestion.get().trim())
                            .build();
                    currentQ.addFollowUp(followUp);
                    session.incrementFollowUpCount(); // 🔥 전체 카운터 증가
                    repository.save(session);
                });
    }

    /**
     * 5. 꼬리 질문 평가 (프롬프트 유지, 답변만 제한)
     */
    @Transactional
    public Flux<String> evaluateFollowUp(String sessionId, String answer) {
        InterviewResult session = repository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        InterviewQuestion currentQ = session.getCurrentQuestion();
        if (currentQ == null) {
            return Flux.error(new RuntimeException("No current question"));
        }

        FollowUpQuestion lastFollowUp = currentQ.getLastFollowUp();
        if (lastFollowUp == null) {
            return Flux.error(new RuntimeException("No follow-up to evaluate"));
        }

        lastFollowUp.setAnswer(answer);

        AtomicReference<String> fullEval = new AtomicReference<>("");

        return chatClient.prompt()
                .system("""
                    당신은 채용 면접관입니다.
                    꼬리 질문에 대한 답변을 평가하세요.
                    
                    평가 기준:
                    - 이전 답변보다 구체적인가?
                    - 기술적 깊이가 있는가?
                    - 실제 경험에서 나온 답변인가?
                    - 숫자/지표가 포함되었는가?
                    
                    짧고 명확하게 평가하세요.
                    """)
                .user(String.format("""
                    원래 질문: %s
                    원래 답변: %s
                    꼬리 질문: %s
                    꼬리 답변: %s
                    """, currentQ.getQuestionText(),
                        smartTruncate(currentQ.getAnswer(), MAX_ANSWER_LENGTH),
                        lastFollowUp.getQuestionText(),
                        smartTruncate(answer, MAX_ANSWER_LENGTH)))
                .stream()
                .content()
                .doOnNext(chunk -> fullEval.set(fullEval.get() + chunk))
                .doOnComplete(() -> {
                    lastFollowUp.setEvaluation(fullEval.get().trim());
                    repository.save(session);
                });
    }

    /**
     * 6. 다음 질문으로 이동
     */
    @Transactional
    public InterviewResult moveToNext(String sessionId) {
        InterviewResult session = repository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        session.moveToNext();
        return repository.save(session);
    }

    /**
     * 7. 세션 조회
     */
    public InterviewResult getSession(String sessionId) {
        return repository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
    }

    // 🔥 Helper: 스마트 텍스트 자르기 (문장 단위)
    private String smartTruncate(String text, int maxLength) {
        if (text == null || text.length() <= maxLength) return text;

        // 문장 단위로 자르기 시도
        String truncated = text.substring(0, maxLength);
        int lastPeriod = truncated.lastIndexOf('.');
        int lastNewline = truncated.lastIndexOf('\n');
        int cutPoint = Math.max(lastPeriod, lastNewline);

        if (cutPoint > maxLength * 0.7) { // 70% 이상 활용 시
            return text.substring(0, cutPoint + 1);
        }

        return truncated + "...";
    }
}
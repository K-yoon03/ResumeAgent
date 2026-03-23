package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.Entity.*;
import com.kyoon.resumeagent.DTO.AdvancedInterviewDTOs.*;
import com.kyoon.resumeagent.service.AdvancedInterviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/interview/advanced")
@RequiredArgsConstructor
public class AdvancedInterviewController {

    private final AdvancedInterviewService service;

    /**
     * 1. 면접 세션 시작
     */
    @PostMapping("/start")
    public ResponseEntity<StartResponse> startSession(
            @RequestBody StartRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        InterviewResult session = service.startSession(
                userDetails.getUsername(),
                request.resume(),
                request.jobPosting(),
                request.totalQuestions()
        );

        InterviewQuestion firstQuestion = session.getCurrentQuestion();

        return ResponseEntity.ok(new StartResponse(
                session.getSessionId(),
                session.getTotalQuestions(),
                firstQuestion != null ? firstQuestion.getQuestionText() : null
        ));
    }

    /**
     * 2. 답변 제출 + 평가 (SSE)
     */
    @PostMapping(value = "/answer", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> submitAnswer(@RequestBody SubmitAnswerRequest request) {
        return service.evaluateAnswer(request.sessionId(), request.answer())
                .map(chunk -> "data:" + chunk + "\n\n");
    }

    /**
     * 3. 답변 평가 완료 후 상태 확인
     */
    @PostMapping("/answer/result")
    public ResponseEntity<EvaluationResult> getAnswerResult(
            @RequestParam String sessionId) {

        InterviewResult session = service.getSession(sessionId);
        InterviewQuestion currentQ = session.getCurrentQuestion();

        if (currentQ == null) {
            return ResponseEntity.badRequest().build();
        }

        boolean hasNext = session.getCurrentIndex() < session.getTotalQuestions() - 1;

        return ResponseEntity.ok(new EvaluationResult(
                currentQ.getEvaluation(),
                currentQ.isNeedsFollowUp(),
                currentQ.canAddFollowUp(),
                hasNext
        ));
    }

    /**
     * 4. 꼬리 질문 생성 (SSE)
     */
    @PostMapping(value = "/follow-up/generate", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> generateFollowUp(@RequestParam String sessionId) {
        return service.generateFollowUp(sessionId)
                .map(chunk -> "data:" + chunk + "\n\n");
    }

    /**
     * 5. 꼬리 질문 답변 제출 + 평가 (SSE)
     */
    @PostMapping(value = "/follow-up/answer", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> submitFollowUpAnswer(@RequestBody SubmitAnswerRequest request) {
        return service.evaluateFollowUp(request.sessionId(), request.answer())
                .map(chunk -> "data:" + chunk + "\n\n");
    }

    /**
     * 6. 다음 질문으로 이동
     */
    @PostMapping("/next")
    public ResponseEntity<Progress> moveToNext(@RequestParam String sessionId) {
        InterviewResult session = service.moveToNext(sessionId);
        return ResponseEntity.ok(toProgressResponse(session));
    }

    /**
     * 7. 현재 진행 상태 조회
     */
    @GetMapping("/progress")
    public ResponseEntity<Progress> getProgress(@RequestParam String sessionId) {
        InterviewResult session = service.getSession(sessionId);
        return ResponseEntity.ok(toProgressResponse(session));
    }

    /**
     * 8. 면접 완료 + 전체 요약
     */
    @GetMapping("/complete")
    public ResponseEntity<Complete> complete(@RequestParam String sessionId) {
        InterviewResult session = service.getSession(sessionId);

        if (!session.getIsCompleted()) {
            return ResponseEntity.badRequest().build();
        }

        var summaries = session.getQuestions().stream()
                .map(q -> new QuestionSummary(
                        q.getQuestionOrder(),
                        q.getQuestionText(),
                        q.getAnswer(),
                        q.getEvaluation(),
                        q.getFollowUps().stream()
                                .map(f -> new FollowUpDetail(
                                        f.getDepth(),
                                        f.getQuestionText(),
                                        f.getAnswer(),
                                        f.getEvaluation()
                                ))
                                .collect(Collectors.toList())
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(new Complete(
                session.getSessionId(),
                "전체 피드백 (TODO: AI 생성)",
                summaries
        ));
    }

    // Helper
    private Progress toProgressResponse(InterviewResult session) {
        InterviewQuestion currentQ = session.getCurrentQuestion();
        return new Progress(
                session.getSessionId(),
                session.getCurrentIndex(),
                session.getTotalQuestions(),
                session.getIsCompleted(),
                currentQ != null ? toQuestionDetail(currentQ) : null
        );
    }

    private QuestionDetail toQuestionDetail(InterviewQuestion q) {
        return new QuestionDetail(
                q.getQuestionText(),
                q.getAnswer(),
                q.getEvaluation(),
                q.getFollowUps().stream()
                        .map(f -> new FollowUpDetail(
                                f.getDepth(),
                                f.getQuestionText(),
                                f.getAnswer(),
                                f.getEvaluation()
                        ))
                        .collect(Collectors.toList()),
                q.getFollowUpCount(),
                q.canAddFollowUp()
        );
    }
}
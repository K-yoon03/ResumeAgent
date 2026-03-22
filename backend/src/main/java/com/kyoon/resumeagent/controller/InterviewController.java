package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.service.InterviewService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import com.kyoon.resumeagent.Entity.InterviewResult;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.InterviewResultRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;


@RestController
@RequestMapping("/api/interview")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;
    private final InterviewResultRepository interviewResultRepository; // 추가
    private final UserRepository userRepository;

    record EvaluateRequest(String resume, String jobPosting) {}
    record QuestionRequest(String resume, String jobPosting, String history, int questionNumber, int totalQuestions) {}
    record FeedbackRequest(String resume, String jobPosting, String question, String answer) {}
    record AllQuestionsRequest(String resume, String jobPosting, int totalQuestions) {}
    record FeedbackAllRequest(String resume, String jobPosting, String questionsAndAnswers) {}
    record SaveInterviewRequest(
            String mode,
            String resumeContent,
            String questionsAndAnswers,
            String feedback,
            int totalQuestions
    ) {}

    record InterviewResultResponse(
            Long id,
            String mode,
            String resumeContent,
            String questionsAndAnswers,
            String feedback,
            int totalQuestions,
            LocalDateTime createdAt
    ) {}

    @PostMapping(value = "/evaluate", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> evaluate(@RequestBody EvaluateRequest request) {
        return interviewService.evaluate(request.resume(), request.jobPosting());
    }

    @PostMapping(value = "/question", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> question(@RequestBody QuestionRequest request) {
        return interviewService.generateQuestion(
                request.resume(), request.jobPosting(),
                request.history(), request.questionNumber(), request.totalQuestions());
    }

    @PostMapping(value = "/feedback", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> feedback(@RequestBody FeedbackRequest request) {
        return interviewService.feedback(
                request.resume(), request.jobPosting(),
                request.question(), request.answer());
    }

    @PostMapping(value = "/questions-all", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> allQuestions(@RequestBody AllQuestionsRequest request) {
        return interviewService.generateAllQuestions(
                request.resume(), request.jobPosting(), request.totalQuestions());
    }

    @PostMapping(value = "/feedback-all", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> feedbackAll(@RequestBody FeedbackAllRequest request) {
        return interviewService.feedbackAll(
                request.resume(), request.jobPosting(), request.questionsAndAnswers());
    }

    @PostMapping("/save")
    public ResponseEntity<InterviewResultResponse> save(
            @RequestBody SaveInterviewRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();

        InterviewResult result = InterviewResult.builder()
                .user(user)
                .mode(req.mode())
                .resumeContent(req.resumeContent())
                .questionsAndAnswers(req.questionsAndAnswers())
                .feedback(req.feedback())
                .totalQuestions(req.totalQuestions())
                .build();

        InterviewResult saved = interviewResultRepository.save(result);

        return ResponseEntity.ok(new InterviewResultResponse(
                saved.getId(),
                saved.getMode(),
                saved.getResumeContent(),
                saved.getQuestionsAndAnswers(),
                saved.getFeedback(),
                saved.getTotalQuestions(),
                saved.getCreatedAt()
        ));
    }

    @GetMapping
    public ResponseEntity<List<InterviewResultResponse>> getMyInterviews(
            @AuthenticationPrincipal UserDetails userDetails) {

        List<InterviewResult> results = interviewResultRepository
                .findByUserEmailOrderByCreatedAtDesc(userDetails.getUsername());

        List<InterviewResultResponse> response = results.stream()
                .map(r -> new InterviewResultResponse(
                        r.getId(),
                        r.getMode(),
                        r.getResumeContent(),
                        r.getQuestionsAndAnswers(),
                        r.getFeedback(),
                        r.getTotalQuestions(),
                        r.getCreatedAt()
                )).toList();

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        InterviewResult result = interviewResultRepository.findById(id).orElseThrow();

        if (!result.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        interviewResultRepository.delete(result);
        return ResponseEntity.ok().build();
    }
}
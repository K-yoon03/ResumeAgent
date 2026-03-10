package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.service.InterviewService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/interview")
public class InterviewController {

    private final InterviewService interviewService;

    public InterviewController(InterviewService interviewService) {
        this.interviewService = interviewService;
    }

    record EvaluateRequest(String resume, String jobPosting) {}
    record QuestionRequest(String resume, String jobPosting, String history, int questionNumber, int totalQuestions) {}
    record FeedbackRequest(String resume, String jobPosting, String question, String answer) {}
    record AllQuestionsRequest(String resume, String jobPosting, int totalQuestions) {}
    record FeedbackAllRequest(String resume, String jobPosting, String questionsAndAnswers) {}


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
}
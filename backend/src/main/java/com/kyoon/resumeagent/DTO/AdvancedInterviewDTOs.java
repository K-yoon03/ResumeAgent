package com.kyoon.resumeagent.DTO;

import java.util.List;

/**
 * Advanced Interview DTOs
 * 꼬리 질문 기반 심화 면접 시스템
 */
public class AdvancedInterviewDTOs {

    // 세션 시작
    public record StartRequest(
            String resume,
            String jobPosting,
            int totalQuestions
    ) {}

    public record StartResponse(
            String sessionId,
            int totalQuestions,
            String firstQuestion
    ) {}

    // 답변 제출
    public record SubmitAnswerRequest(
            String sessionId,
            String answer
    ) {}

    // 답변 평가 결과
    public record EvaluationResult(
            String evaluation,
            boolean needsFollowUp,
            boolean canAddFollowUp,
            boolean hasNextQuestion
    ) {}

    // 진행 상태
    public record Progress(
            String sessionId,
            int currentIndex,
            int totalQuestions,
            boolean isCompleted,
            QuestionDetail currentQuestion
    ) {}

    // 질문 상세
    public record QuestionDetail(
            String questionText,
            String answer,
            String evaluation,
            List<FollowUpDetail> followUps,
            int followUpCount,
            boolean canAddFollowUp
    ) {}

    // 꼬리 질문 상세
    public record FollowUpDetail(
            int depth,
            String questionText,
            String answer,
            String evaluation
    ) {}

    // 완료
    public record Complete(
            String sessionId,
            String overallFeedback,
            List<QuestionSummary> questionSummaries
    ) {}

    public record QuestionSummary(
            int order,
            String question,
            String answer,
            String evaluation,
            List<FollowUpDetail> followUps
    ) {}
}
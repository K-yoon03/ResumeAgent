package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.service.DepthInterviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assessments")
@RequiredArgsConstructor
public class DepthInterviewController {

    private final DepthInterviewService depthInterviewService;

    public record QuestionsRequest(
            Long assessmentId,
            String itemName,
            String itemType,
            String reason,
            String jobCode,
            String jobName
    ) {}

    public record QuestionsResponse(
            List<String> questions
    ) {}

    public record FinalRequest(
            List<Map<String, Object>> depthAnswers
    ) {}

    public record FinalResponse(
            Long id,
            String evaluatedJobCode,
            String scoreData,
            Boolean isPrimary
    ) {}

    /**
     * 심층 질문 생성
     * POST /api/assessments/depth/questions
     */
    @PostMapping("/depth/questions")
    public ResponseEntity<QuestionsResponse> generateQuestions(
            @RequestBody QuestionsRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<String> questions = depthInterviewService.generateQuestions(
                    request.jobCode(),
                    request.jobName(),
                    request.itemName(),
                    request.itemType(),
                    request.reason()
            );
            return ResponseEntity.ok(new QuestionsResponse(questions));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 최종 점수 계산
     * POST /api/assessments/{id}/final
     */
    @PostMapping("/{id}/final")
    public ResponseEntity<FinalResponse> calculateFinal(
            @PathVariable Long id,
            @RequestBody FinalRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            Assessment assessment = depthInterviewService.calculateFinalScore(id, request.depthAnswers());
            return ResponseEntity.ok(new FinalResponse(
                    assessment.getId(),
                    assessment.getEvaluatedJobCode(),
                    assessment.getScoreData(),
                    assessment.getIsPrimary()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(new FinalResponse(null, null, e.getMessage(), null));
        }
    }
}
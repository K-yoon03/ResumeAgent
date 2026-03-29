package com.kyoon.resumeagent.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.InterviewData;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.InterviewDataRepository;
import com.kyoon.resumeagent.service.DepthInterviewService;
import com.kyoon.resumeagent.service.InterviewOrchestratorService;
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

    private final InterviewOrchestratorService orchestratorService;
    private final DepthInterviewService depthInterviewService;
    private final AssessmentRepository assessmentRepository;
    private final InterviewDataRepository interviewDataRepository;
    private final ObjectMapper objectMapper;

    // ── 기본 3문항 생성 ──
    public record BaseQuestionsRequest(String itemName) {}
    public record BaseQuestionsResponse(List<String> questions) {}

    @PostMapping("/{id}/interview/questions")
    public ResponseEntity<?> generateBaseQuestions(
            @PathVariable Long id,
            @RequestBody BaseQuestionsRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<String> questions = orchestratorService.generateBaseQuestions(id, request.itemName());
            return ResponseEntity.ok(new BaseQuestionsResponse(questions));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── 답변 분석 → 추가 질문 필요 여부 ──
    public record AnalyzeRequest(String itemName, List<Map<String, String>> qna) {}

    @PostMapping("/{id}/interview/analyze")
    public ResponseEntity<?> analyzeAnswers(
            @PathVariable Long id,
            @RequestBody AnalyzeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String qnaJson = objectMapper.writeValueAsString(request.qna());
            JsonNode result = orchestratorService.analyzeAnswers(id, request.itemName(), qnaJson);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── 추가 질문 1개 생성 ──
    public record FollowUpRequest(String itemName, String followUpTarget, String weakReason) {}
    public record FollowUpResponse(String question) {}

    @PostMapping("/{id}/interview/followup")
    public ResponseEntity<?> generateFollowUp(
            @PathVariable Long id,
            @RequestBody FollowUpRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String question = orchestratorService.generateFollowUpQuestion(
                    request.itemName(), request.followUpTarget(), request.weakReason());
            return ResponseEntity.ok(new FollowUpResponse(question));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── 인터뷰 완료 → 데이터 추출 + 저장 + 점수 계산 ──
    public record FinalRequest(List<Map<String, Object>> items) {}
    public record FinalResponse(Long id, String evaluatedJobCode, String scoreData, Boolean isPrimary) {}

    @PostMapping("/{id}/interview/final")
    public ResponseEntity<?> submitFinal(
            @PathVariable Long id,
            @RequestBody FinalRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            // 1. 각 항목별 InterviewData 추출 + 저장
            interviewDataRepository.deleteByAssessmentId(id);
            for (Map<String, Object> item : request.items()) {
                String itemName = (String) item.get("itemName");
                Object qnaObj = item.get("qna");
                String qnaJson = objectMapper.writeValueAsString(qnaObj);
                orchestratorService.extractAndSave(id, itemName, qnaJson);
            }

            // 2. 기존 FinalScorer로 점수 계산 (depthAnswers 형식으로 변환)
            Assessment assessment = depthInterviewService.calculateFinalScore(id, request.items());
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

    // ── 기존 호환 엔드포인트 (depth/questions) 유지 ──
    public record LegacyQuestionsRequest(
            Long assessmentId, String itemName, String itemType,
            String reason, String jobCode, String jobName) {}
    public record LegacyQuestionsResponse(List<String> questions) {}

    @PostMapping("/depth/questions")
    public ResponseEntity<?> legacyGenerateQuestions(
            @RequestBody LegacyQuestionsRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            List<String> questions = depthInterviewService.generateQuestions(
                    request.jobCode(), request.jobName(),
                    request.itemName(), request.itemType(), request.reason());
            return ResponseEntity.ok(new LegacyQuestionsResponse(questions));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── 기존 호환 엔드포인트 ({id}/final) 유지 ──
    public record LegacyFinalRequest(List<Map<String, Object>> depthAnswers) {}

    @PostMapping("/{id}/final")
    public ResponseEntity<?> legacyFinal(
            @PathVariable Long id,
            @RequestBody LegacyFinalRequest request,
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
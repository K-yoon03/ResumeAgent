package com.kyoon.resumeagent.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.service.DepthInterviewService;
import com.kyoon.resumeagent.service.InterviewOrchestratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assessments")
@RequiredArgsConstructor
public class DepthInterviewController {

    private final InterviewOrchestratorService orchestratorService;
    private final DepthInterviewService depthInterviewService;
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

    // ── 답변 분석 → 추가 질문 필요 여부 (followUp 판단용, 저장 없음) ──
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

    // ── 인터뷰 완료 → 분석 + 저장 + 점수 계산 ──
    public record FinalRequest(List<Map<String, Object>> items) {}
    public record FinalResponse(Long id, String evaluatedJobCode, String scoreData, Boolean isPrimary, String grade) {}

    @Transactional
    @PostMapping("/{id}/interview/final")
    public ResponseEntity<?> submitFinal(
            @PathVariable Long id,
            @RequestBody FinalRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            // 1. 기존 데이터 초기화
            orchestratorService.deleteInterviewDataByAssessmentId(id);

            // 2. 각 항목별 분석(InterviewAnalyzer) + STAR 추출(DataExtractor) + 저장
            for (Map<String, Object> item : request.items()) {
                String itemName = (String) item.get("itemName");
                String qnaJson = objectMapper.writeValueAsString(item.get("qna"));
                orchestratorService.analyzeAndSave(id, itemName, qnaJson);
            }

            // 3. FinalScorer로 점수 계산
            Assessment assessment = depthInterviewService.calculateFinalScore(id, request.items());
            return ResponseEntity.ok(new FinalResponse(
                    assessment.getId(),
                    assessment.getEvaluatedJobCode(),
                    assessment.getScoreData(),
                    assessment.getIsPrimary(),
                    assessment.getGrade()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(new FinalResponse(null, null, e.getMessage(), null, null));
        }
    }
}
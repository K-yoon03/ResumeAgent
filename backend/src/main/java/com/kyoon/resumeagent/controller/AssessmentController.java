package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import com.kyoon.resumeagent.repository.ResumeRepository;
import com.kyoon.resumeagent.DTO.JobMatchResult;
import com.kyoon.resumeagent.service.AssessmentService;
import com.kyoon.resumeagent.service.JobMatcherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/assessments")
@RequiredArgsConstructor
public class AssessmentController {

    private final AssessmentRepository assessmentRepository;
    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;
    private final AssessmentService assessmentService;
    private final JobMatcherService jobMatcherService;

    // ========================================
    // Request/Response DTOs
    // ========================================

    public record EvaluateRequest(
            String jobCode,
            String overrideJobText,
            String experience
    ) {}

    public record EvaluateResponse(
            Long id,
            String evaluatedJobCode,
            String scoreData,
            Boolean isPrimary,
            LocalDateTime createdAt
    ) {}

    public record AssessmentResponse(
            Long id,
            String evaluatedJobCode,
            String experience,
            String analysis,
            String scoreData,
            Boolean isPrimary,
            LocalDateTime createdAt,
            List<ResumeController.ResumeResponse> resumes
    ) {}

    public record SetPrimaryResponse(
            Long assessmentId,
            String message
    ) {}

    // ========================================
    // API Endpoints
    // ========================================

    /**
     * 역량 평가 생성 (GPT + Gemini 공식)
     * POST /api/assessments/evaluate
     */
    @PostMapping("/evaluate")
    public ResponseEntity<EvaluateResponse> evaluate(
            @RequestBody EvaluateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        try {
            // jobCode 결정: 명시된 jobCode > overrideJobText 매핑 > user.mappedJobCode > TEMP_IT
            String resolvedJobCode = request.jobCode();

            if ((resolvedJobCode == null || resolvedJobCode.isBlank())
                    && request.overrideJobText() != null && !request.overrideJobText().isBlank()) {
                try {
                    JobMatchResult matchResult = jobMatcherService.matchJob(request.overrideJobText());
                    resolvedJobCode = matchResult.jobCode();
                } catch (Exception e) {
                    resolvedJobCode = "TEMP_IT";
                }
            }

            if (resolvedJobCode == null || resolvedJobCode.isBlank()) {
                resolvedJobCode = user.getMappedJobCode() != null ? user.getMappedJobCode() : "TEMP_IT";
            }

            Assessment assessment = assessmentService.evaluateCompetency(
                    user,
                    resolvedJobCode,
                    request.experience()
            );

            return ResponseEntity.ok(new EvaluateResponse(
                    assessment.getId(),
                    assessment.getEvaluatedJobCode(),
                    assessment.getScoreData(),
                    assessment.getIsPrimary(),
                    assessment.getCreatedAt()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 내 평가 목록 조회
     * GET /api/assessments
     */
    @GetMapping
    public ResponseEntity<List<AssessmentResponse>> getMyAssessments(
            @AuthenticationPrincipal UserDetails userDetails) {

        List<Assessment> assessments = assessmentRepository
                .findByUserEmailOrderByCreatedAtDesc(userDetails.getUsername());

        List<AssessmentResponse> response = assessments.stream()
                .map(a -> {
                    List<ResumeController.ResumeResponse> resumes = resumeRepository
                            .findByAssessmentId(a.getId())
                            .stream()
                            .map(r -> new ResumeController.ResumeResponse(
                                    r.getId(),
                                    r.getContent(),
                                    r.getTitle(),
                                    r.getStatus(),
                                    r.getEvaluation(),
                                    r.getAssessment() != null ? r.getAssessment().getId() : null,
                                    r.getJobPosting() != null ? r.getJobPosting().getId() : null,
                                    r.getCreatedAt(),
                                    r.getUpdatedAt()
                            )).toList();

                    return new AssessmentResponse(
                            a.getId(),
                            a.getEvaluatedJobCode(),
                            a.getExperience(),
                            a.getAnalysis(),
                            a.getScoreData(),
                            a.getIsPrimary(),
                            a.getCreatedAt(),
                            resumes
                    );
                }).toList();

        return ResponseEntity.ok(response);
    }

    /**
     * 주 역량 설정
     * PUT /api/assessments/{id}/primary
     */
    @PutMapping("/{id}/primary")
    public ResponseEntity<SetPrimaryResponse> setPrimaryAssessment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        if (!assessment.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(
                    new SetPrimaryResponse(null, "본인의 평가만 선택할 수 있습니다.")
            );
        }

        // 기존 주 역량 해제
        if (user.getPrimaryAssessment() != null) {
            Assessment oldPrimary = user.getPrimaryAssessment();
            oldPrimary.setIsPrimary(false);
            assessmentRepository.save(oldPrimary);
        }

        // 새 주 역량 설정
        assessment.setIsPrimary(true);
        user.setPrimaryAssessment(assessment);

        assessmentRepository.save(assessment);
        userRepository.save(user);

        return ResponseEntity.ok(new SetPrimaryResponse(
                id,
                "주 역량으로 설정되었습니다."
        ));
    }

    /**
     * 주 역량 해제
     * DELETE /api/assessments/primary
     */
    @DeleteMapping("/primary")
    public ResponseEntity<String> removePrimaryAssessment(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getPrimaryAssessment() == null) {
            return ResponseEntity.ok("이미 주 역량이 없습니다.");
        }

        Assessment oldPrimary = user.getPrimaryAssessment();
        oldPrimary.setIsPrimary(false);
        assessmentRepository.save(oldPrimary);

        user.setPrimaryAssessment(null);
        userRepository.save(user);

        return ResponseEntity.ok("주 역량이 해제되었습니다.");
    }

    /**
     * 평가 삭제
     * DELETE /api/assessments/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAssessment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        if (!assessment.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("본인의 평가만 삭제할 수 있습니다.");
        }

        assessmentRepository.delete(assessment);
        return ResponseEntity.ok("평가가 삭제되었습니다.");
    }
}
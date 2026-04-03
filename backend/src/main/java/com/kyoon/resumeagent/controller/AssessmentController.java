package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.JobRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import com.kyoon.resumeagent.repository.ResumeRepository;
import com.kyoon.resumeagent.DTO.JobMatchResult;
import com.kyoon.resumeagent.service.AssessmentService;
import com.kyoon.resumeagent.service.ExperienceMatcherService;
import com.kyoon.resumeagent.service.JobMatcherService;
import com.kyoon.resumeagent.service.StarGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/assessments")
@RequiredArgsConstructor
public class AssessmentController {

    private final AssessmentRepository assessmentRepository;
    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;
    private final JobRepository jobRepository;
    private final com.kyoon.resumeagent.repository.DepthAnswerRepository depthAnswerRepository;
    private final com.kyoon.resumeagent.repository.StarRepository starRepository;
    private final AssessmentService assessmentService;
    private final JobMatcherService jobMatcherService;
    private final ExperienceMatcherService experienceMatcherService;
    private final StarGeneratorService starGeneratorService;

    // ========================================
    // Request/Response DTOs
    // ========================================

    public record EvaluateRequest(
            String jobCode,
            String overrideJobText,
            String experience
    ) {}

    public record MatchJobRequest(String experience) {}

    public record MatchJobResponse(
            String jobCode,
            String jobName,
            String matchType,
            double confidence,
            boolean isTemporary,
            boolean noMatch,
            String reason
    ) {}

    // ========================================
    // JobMatcher - 경험 기반 직무 자동 추론
    // ========================================

    @PostMapping("/match-job")
    public ResponseEntity<MatchJobResponse> matchJob(
            @RequestBody MatchJobRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            ExperienceMatcherService.MatchResult result = experienceMatcherService.matchFromExperience(request.experience());
            String jobName = jobRepository.findByGroupCode(result.jobCode())
                    .map(job -> job.getGroupName())
                    .orElse(result.jobCode());
            return ResponseEntity.ok(new MatchJobResponse(
                    result.jobCode(),
                    jobName,
                    "AUTO",
                    result.confidence(),
                    false,
                    result.noMatch(),
                    result.reason()
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(new MatchJobResponse(
                    "SW_WEB", "SW_WEB", "FALLBACK", 0.5, false, false, ""
            ));
        }
    }

    public record EvaluateResponse(
            Long id,
            String evaluatedJobCode,
            String scoreData,
            Boolean isPrimary,
            LocalDateTime createdAt,
            Map<String, Double> capabilityVector
    ) {}

    public record AssessmentResponse(
            Long id,
            String evaluatedJobCode,
            String experience,
            String analysis,
            String scoreData,
            Boolean isPrimary,
            LocalDateTime createdAt,
            List<ResumeController.ResumeResponse> resumes,
            Map<String, Double> capabilityVector  // 🔥 추가
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
            String resolvedJobCode = (request.jobCode() != null && !request.jobCode().isBlank())
                    ? request.jobCode()
                    : user.getMappedJobCode() != null ? user.getMappedJobCode() : "SW_WEB";

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
                    assessment.getCreatedAt(),
                    assessment.getCapabilityVector()
            ));
        } catch (Exception e) {
            System.err.println("❌ evaluate 실패: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * DepthAnswer 목록 조회
     * GET /api/assessments/{id}/depth-answers
     */
    @GetMapping("/{id}/depth-answers")
    public ResponseEntity<?> getDepthAnswers(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        com.kyoon.resumeagent.Entity.Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));
        if (!assessment.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }
        var answers = depthAnswerRepository.findByAssessmentIdOrderByItemNameAscSequenceAsc(id);
        // itemName별로 그룹핑해서 반환
        var grouped = answers.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        com.kyoon.resumeagent.Entity.DepthAnswer::getItemName,
                        java.util.LinkedHashMap::new,
                        java.util.stream.Collectors.toList()
                ));
        var result = grouped.entrySet().stream().map(e -> java.util.Map.of(
                "itemName", e.getKey(),
                "questionCount", e.getValue().size(),
                "firstQuestion", e.getValue().get(0).getQuestion()
        )).toList();
        return ResponseEntity.ok(result);
    }

    /**
     * STAR 필드 업데이트 (개선하기 저장)
     * PUT /api/assessments/{id}/star/{itemName}
     */
    @PutMapping("/{id}/star/{itemName}")
    public ResponseEntity<?> updateStarField(
            @PathVariable Long id,
            @PathVariable String itemName,
            @RequestBody java.util.Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            com.kyoon.resumeagent.Entity.Assessment assessment = assessmentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Assessment not found"));
            if (!assessment.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }
            starGeneratorService.updateStarField(id, itemName, body.get("field"), body.get("value"));
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * STAR 재생성 (기존 삭제 후 다시 생성)
     * DELETE /api/assessments/{id}/star/{itemName}
     */
    @DeleteMapping("/{id}/star/{itemName}")
    public ResponseEntity<?> deleteStar(
            @PathVariable Long id,
            @PathVariable String itemName,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            com.kyoon.resumeagent.Entity.Assessment assessment = assessmentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Assessment not found"));
            if (!assessment.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }
            starRepository.findByAssessmentIdAndItemName(id, itemName)
                    .ifPresent(starRepository::delete);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * STAR 생성 (InterviewData 기반)
     * POST /api/assessments/{id}/extract-star
     */
    @PostMapping("/{id}/extract-star")
    public ResponseEntity<?> extractStar(
            @PathVariable Long id,
            @RequestParam(required = false) String jobContext,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            com.kyoon.resumeagent.Entity.Assessment assessment = assessmentRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Assessment not found"));
            if (!assessment.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }
            java.util.List<StarGeneratorService.StarResult> stars = starGeneratorService.generateStars(
                    id, assessment.getEvaluatedJobCode(), jobContext);
            return ResponseEntity.ok(stars);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 평가 단건 조회
     * GET /api/assessments/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<AssessmentResponse> getAssessment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        if (!assessment.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        List<ResumeController.ResumeResponse> resumes = resumeRepository
                .findByAssessmentId(assessment.getId())
                .stream()
                .map(r -> new ResumeController.ResumeResponse(
                        r.getId(), r.getContent(), r.getTitle(), r.getStatus(),
                        r.getEvaluation(),
                        r.getAssessment() != null ? r.getAssessment().getId() : null,
                        r.getJobPosting() != null ? r.getJobPosting().getId() : null,
                        r.getCreatedAt(), r.getUpdatedAt()
                )).toList();

        return ResponseEntity.ok(new AssessmentResponse(
                assessment.getId(),
                assessment.getEvaluatedJobCode(),
                assessment.getExperience(),
                assessment.getAnalysis(),
                assessment.getScoreData(),
                assessment.getIsPrimary(),
                assessment.getCreatedAt(),
                resumes,
                assessment.getCapabilityVector()
        ));
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
                            resumes,
                            a.getCapabilityVector()
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
package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import com.kyoon.resumeagent.repository.ResumeRepository;
import com.kyoon.resumeagent.service.AssessmentService;  // 🔥 추가
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
    private final AssessmentService assessmentService;  // 🔥 추가

    // 🔥 Request DTO 변경
    record AssessmentRequest(String jobCode, String experience) {}
    record SetPrimaryResponse(Long assessmentId, String message) {}

    /**
     * 🔥 역량 평가 생성 (새 로직)
     * POST /api/assessments
     */
    @PostMapping
    public ResponseEntity<AssessmentResponse> createAssessment(
            @RequestBody AssessmentRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            User user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // AssessmentService 호출 (GPT + Gemini 공식)
            Assessment assessment = assessmentService.evaluateCompetency(
                    user,
                    req.jobCode(),
                    req.experience()
            );

            return ResponseEntity.ok(new AssessmentResponse(
                    assessment.getId(),
                    assessment.getEvaluatedJobCode(),  // 🔥 추가
                    assessment.getExperience(),
                    assessment.getAnalysis(),
                    assessment.getScoreData(),
                    assessment.getIsPrimary(),  // 🔥 추가
                    assessment.getCreatedAt(),
                    List.of()  // 저장 직후엔 연관 자소서 없음
            ));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(null);
        }
    }

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
                            a.getEvaluatedJobCode(),  // 🔥 추가
                            a.getExperience(),
                            a.getAnalysis(),
                            a.getScoreData(),
                            a.getIsPrimary(),  // 🔥 추가
                            a.getCreatedAt(),
                            resumes
                    );
                }).toList();

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        Assessment assessment = assessmentRepository.findById(id).orElseThrow();

        if (!assessment.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        assessmentRepository.delete(assessment);
        return ResponseEntity.ok().build();
    }

    // 🔥 AssessmentResponse DTO 수정
    record AssessmentResponse(
            Long id,
            String evaluatedJobCode,  // 🔥 추가
            String experience,
            String analysis,
            String scoreData,
            Boolean isPrimary,  // 🔥 추가
            LocalDateTime createdAt,
            List<ResumeController.ResumeResponse> resumes
    ) {}

    @PutMapping("/{id}/set-primary")
    public ResponseEntity<?> setPrimaryAssessment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Assessment assessment = assessmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        if (!assessment.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body("본인의 평가만 선택할 수 있습니다.");
        }

        if (user.getPrimaryAssessment() != null) {
            Assessment oldPrimary = user.getPrimaryAssessment();
            oldPrimary.setIsPrimary(false);
            assessmentRepository.save(oldPrimary);
        }

        assessment.setIsPrimary(true);
        user.setPrimaryAssessment(assessment);

        assessmentRepository.save(assessment);
        userRepository.save(user);

        return ResponseEntity.ok(new SetPrimaryResponse(
                id,
                "주 역량으로 설정되었습니다."
        ));
    }

    @DeleteMapping("/primary")
    public ResponseEntity<?> removePrimaryAssessment(
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
}
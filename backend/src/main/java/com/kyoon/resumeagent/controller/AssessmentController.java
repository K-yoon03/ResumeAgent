package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import com.kyoon.resumeagent.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/assessments")
@RequiredArgsConstructor
public class AssessmentController {

    private final AssessmentRepository assessmentRepository;
    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;

    record AssessmentRequest(String experience, String analysis, String scoreData) {}

    @PostMapping
    public ResponseEntity<AssessmentResponse> save(
            @RequestBody AssessmentRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow();

        Optional<Assessment> existing = assessmentRepository
                .findByUserEmailAndExperienceAndAnalysis(
                        userDetails.getUsername(), req.experience(), req.analysis());
        if (existing.isPresent()) {
            Assessment a = existing.get();
            return ResponseEntity.ok(new AssessmentResponse(
                    a.getId(), a.getExperience(), a.getAnalysis(),
                    a.getScoreData(), a.getCreatedAt(), List.of()
            ));
        }

        Assessment assessment = Assessment.builder()
                .user(user)
                .experience(req.experience())
                .analysis(req.analysis())
                .scoreData(req.scoreData())
                .build();

        Assessment saved = assessmentRepository.save(assessment);

        return ResponseEntity.ok(new AssessmentResponse(
                saved.getId(),
                saved.getExperience(),
                saved.getAnalysis(),
                saved.getScoreData(),
                saved.getCreatedAt(),
                List.of()  // 저장 직후엔 연관 자소서 없음
        ));
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
                            // 기존 (잘못된 버전)
                            .map(r -> new ResumeController.ResumeResponse(
                                    r.getId(),
                                    r.getContent(),
                                    r.getTitle(),
                                    r.getStatus(),  // ← 추가!
                                    r.getEvaluation(),  // ← 추가!
                                    r.getAssessment() != null ? r.getAssessment().getId() : null,
                                    r.getJobPosting() != null ? r.getJobPosting().getId() : null,
                                    r.getCreatedAt(),
                                    r.getUpdatedAt()  // ← 추가!
                            )).toList();

                    return new AssessmentResponse(
                            a.getId(), a.getExperience(), a.getAnalysis(),
                            a.getScoreData(), a.getCreatedAt(), resumes);
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

    record AssessmentResponse(
            Long id,
            String experience,
            String analysis,
            String scoreData,
            LocalDateTime createdAt,
            List<ResumeController.ResumeResponse> resumes  // 연관 자소서
    ) {}
}
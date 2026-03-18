package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.UserRepository;
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

    record AssessmentRequest(String experience, String analysis, String scoreData) {}

    @PostMapping
    public ResponseEntity<?> save(
            @RequestBody AssessmentRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow();

        Assessment assessment = Assessment.builder()
                .user(user)
                .experience(req.experience())
                .analysis(req.analysis())
                .scoreData(req.scoreData())
                .build();

        assessmentRepository.save(assessment);
        return ResponseEntity.ok().build();
    }
    @GetMapping
    public ResponseEntity<List<AssessmentResponse>> getMyAssessments(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        List<Assessment> assessments = assessmentRepository
                .findByUserOrderByCreatedAtDesc(user);

        List<AssessmentResponse> response = assessments.stream()
                .map(a -> new AssessmentResponse(
                        a.getId(),
                        a.getExperience(),
                        a.getAnalysis(),
                        a.getScoreData(),
                        a.getCreatedAt()
                )).toList();

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
            LocalDateTime createdAt
    ) {}
}
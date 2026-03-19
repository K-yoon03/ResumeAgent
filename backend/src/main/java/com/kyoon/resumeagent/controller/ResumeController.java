package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.JobPosting;
import com.kyoon.resumeagent.Entity.Resume;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.JobPostingRepository;
import com.kyoon.resumeagent.repository.ResumeRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import com.kyoon.resumeagent.service.ResumeGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/resume")
@RequiredArgsConstructor
public class ResumeController {

    private final ResumeGeneratorService resumeGeneratorService;
    private final ResumeRepository resumeRepository;
    private final AssessmentRepository assessmentRepository;
    private final JobPostingRepository jobPostingRepository;
    private final UserRepository userRepository;

    // 자소서 생성 (SSE 스트리밍) - 기존 유지
    record GenerateRequest(String experience, String analysis, String jobPosting) {}

    @PostMapping(value = "/generate", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> generate(@RequestBody GenerateRequest request) {
        return resumeGeneratorService.generate(
                request.experience(), request.analysis(), request.jobPosting());
    }

    // 자소서 저장
    record SaveResumeRequest(
            String content,
            String title,
            Long assessmentId,
            Long jobPostingId
    ) {}

    record ResumeResponse(
            Long id,
            String content,
            String title,
            Long assessmentId,
            Long jobPostingId,
            LocalDateTime createdAt
    ) {}

    @PostMapping("/save")
    public ResponseEntity<ResumeResponse> save(
            @RequestBody SaveResumeRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        resumeRepository.findByUserEmailAndContent(userDetails.getUsername(), req.content())
                .ifPresent(existing -> {
                    // 이미 있으면 그냥 기존 거 반환 (저장 안 함)
                });
        Optional<Resume> existing = resumeRepository
                .findByUserEmailAndContent(userDetails.getUsername(), req.content());
        if (existing.isPresent()) {
            Resume r = existing.get();
            return ResponseEntity.ok(new ResumeResponse(
                    r.getId(), r.getContent(), r.getTitle(),
                    r.getAssessment() != null ? r.getAssessment().getId() : null,
                    r.getJobPosting() != null ? r.getJobPosting().getId() : null,
                    r.getCreatedAt()
            ));
        }

        Assessment assessment = req.assessmentId() != null
                ? assessmentRepository.findById(req.assessmentId()).orElse(null)
                : null;

        JobPosting jobPosting = req.jobPostingId() != null
                ? jobPostingRepository.findById(req.jobPostingId()).orElse(null)
                : null;

        // title 자동 생성 (없으면 회사명 + 직무)
        String title = req.title();
        if ((title == null || title.isBlank()) && jobPosting != null) {
            title = (jobPosting.getCompanyName() != null ? jobPosting.getCompanyName() : "")
                    + (jobPosting.getPosition() != null ? " · " + jobPosting.getPosition() : "");
        }

        Resume resume = Resume.builder()
                .user(user)
                .assessment(assessment)
                .jobPosting(jobPosting)
                .content(req.content())
                .title(title)
                .build();

        Resume saved = resumeRepository.save(resume);

        return ResponseEntity.ok(new ResumeResponse(
                saved.getId(),
                saved.getContent(),
                saved.getTitle(),
                assessment != null ? assessment.getId() : null,
                jobPosting != null ? jobPosting.getId() : null,
                saved.getCreatedAt()
        ));
    }

    // 내 자소서 목록 조회
    @GetMapping
    public ResponseEntity<List<ResumeResponse>> getMyResumes(
            @AuthenticationPrincipal UserDetails userDetails) {

        List<Resume> resumes = resumeRepository
                .findByUserEmailOrderByCreatedAtDesc(userDetails.getUsername());

        List<ResumeResponse> response = resumes.stream()
                .map(r -> new ResumeResponse(
                        r.getId(),
                        r.getContent(),
                        r.getTitle(),
                        r.getAssessment() != null ? r.getAssessment().getId() : null,
                        r.getJobPosting() != null ? r.getJobPosting().getId() : null,
                        r.getCreatedAt()
                )).toList();

        return ResponseEntity.ok(response);
    }

    // 자소서 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        Resume resume = resumeRepository.findById(id).orElseThrow();

        if (!resume.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        resumeRepository.delete(resume);
        return ResponseEntity.ok().build();
    }
}
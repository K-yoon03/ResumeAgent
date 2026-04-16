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
import com.kyoon.resumeagent.service.AgentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
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
    private final AgentService agentService;

    record GenerateRequest(String experience, String analysis, String jobPosting, String additionalInfo) {}

    @PostMapping(value = "/generate", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> generate(@RequestBody GenerateRequest request) {
        return resumeGeneratorService.generate(
                request.experience(), request.analysis(), request.jobPosting(), request.additionalInfo());
    }

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
            String status,
            String evaluation,
            Long assessmentId,
            Long jobPostingId,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    @PostMapping("/save")
    public ResponseEntity<ResumeResponse> save(
            @RequestBody SaveResumeRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();

        Optional<Resume> existing = resumeRepository
                .findByUserEmailAndContent(userDetails.getUsername(), req.content());
        if (existing.isPresent()) {
            Resume r = existing.get();
            return ResponseEntity.ok(new ResumeResponse(
                    r.getId(), r.getContent(), r.getTitle(),
                    r.getStatus(), r.getEvaluation(),
                    r.getAssessment() != null ? r.getAssessment().getId() : null,
                    r.getJobPosting() != null ? r.getJobPosting().getId() : null,
                    r.getCreatedAt(), r.getUpdatedAt()
            ));
        }

        Assessment assessment = req.assessmentId() != null
                ? assessmentRepository.findById(req.assessmentId()).orElse(null)
                : null;

        JobPosting jobPosting = req.jobPostingId() != null
                ? jobPostingRepository.findById(req.jobPostingId()).orElse(null)
                : null;

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
                saved.getStatus(),
                saved.getEvaluation(),
                assessment != null ? assessment.getId() : null,
                jobPosting != null ? jobPosting.getId() : null,
                saved.getCreatedAt(),
                saved.getUpdatedAt()
        ));
    }

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
                        r.getStatus(),
                        r.getEvaluation(),
                        r.getAssessment() != null ? r.getAssessment().getId() : null,
                        r.getJobPosting() != null ? r.getJobPosting().getId() : null,
                        r.getCreatedAt(),
                        r.getUpdatedAt()
                )).toList();

        return ResponseEntity.ok(response);
    }

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

    @PutMapping("/{id}")
    public ResponseEntity<ResumeResponse> updateResume(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        Resume resume = resumeRepository.findById(id).orElseThrow();

        if (!resume.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        String content = request.get("content");
        String title = request.get("title");

        if (content != null) resume.setContent(content);
        if (title != null) resume.setTitle(title);

        resume.setStatus("DRAFT");
        resume.setEvaluation(null);
        resume.setUpdatedAt(LocalDateTime.now());

        Resume saved = resumeRepository.save(resume);

        return ResponseEntity.ok(new ResumeResponse(
                saved.getId(),
                saved.getContent(),
                saved.getTitle(),
                saved.getStatus(),
                saved.getEvaluation(),
                saved.getAssessment() != null ? saved.getAssessment().getId() : null,
                saved.getJobPosting() != null ? saved.getJobPosting().getId() : null,
                saved.getCreatedAt(),
                saved.getUpdatedAt()
        ));
    }

    @PutMapping("/{id}/confirm")
    public ResponseEntity<ResumeResponse> confirmResume(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        Resume resume = resumeRepository.findById(id).orElseThrow();

        if (!resume.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        resume.setStatus("CONFIRMED");
        resume.setUpdatedAt(LocalDateTime.now());

        Resume saved = resumeRepository.save(resume);

        return ResponseEntity.ok(new ResumeResponse(
                saved.getId(),
                saved.getContent(),
                saved.getTitle(),
                saved.getStatus(),
                saved.getEvaluation(),
                saved.getAssessment() != null ? saved.getAssessment().getId() : null,
                saved.getJobPosting() != null ? saved.getJobPosting().getId() : null,
                saved.getCreatedAt(),
                saved.getUpdatedAt()
        ));
    }

    /**
     * 자소서 평가 - 크레딧 차감은 CreditInterceptor에서 처리 (1 cr)
     * 이미 평가된 경우 캐시 반환 (인터셉터 통과 전에 캐시 확인 불가 → 서비스 레이어에서 처리)
     */
    @PostMapping("/{id}/evaluate")
    public ResponseEntity<ResumeResponse> evaluateResume(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        Resume resume = resumeRepository.findById(id).orElseThrow();

        if (!resume.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        // 이미 평가된 경우 재사용 (크레딧은 인터셉터에서 이미 차감됨 — 캐시 히트 시 환불 불가 구조 주의)
        if (resume.getEvaluation() != null && !resume.getEvaluation().isBlank()) {
            return ResponseEntity.ok(new ResumeResponse(
                    resume.getId(),
                    resume.getContent(),
                    resume.getTitle(),
                    resume.getStatus(),
                    resume.getEvaluation(),
                    resume.getAssessment() != null ? resume.getAssessment().getId() : null,
                    resume.getJobPosting() != null ? resume.getJobPosting().getId() : null,
                    resume.getCreatedAt(),
                    resume.getUpdatedAt()
            ));
        }

        String evaluation = agentService.evaluateResume(resume.getContent());

        resume.setEvaluation(evaluation);
        resume.setStatus("EVALUATED");
        resume.setUpdatedAt(LocalDateTime.now());

        Resume saved = resumeRepository.save(resume);

        return ResponseEntity.ok(new ResumeResponse(
                saved.getId(),
                saved.getContent(),
                saved.getTitle(),
                saved.getStatus(),
                saved.getEvaluation(),
                saved.getAssessment() != null ? saved.getAssessment().getId() : null,
                saved.getJobPosting() != null ? saved.getJobPosting().getId() : null,
                saved.getCreatedAt(),
                saved.getUpdatedAt()
        ));
    }
}
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
    private final AgentService agentService;  // 추가!

    // 자소서 생성 (SSE 스트리밍) - 기존 유지
    record GenerateRequest(String experience, String analysis, String jobPosting, String additionalInfo) {}

    @PostMapping(value = "/generate", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> generate(@RequestBody GenerateRequest request) {
        return resumeGeneratorService.generate(
                request.experience(), request.analysis(), request.jobPosting(), request.additionalInfo());
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
                saved.getStatus(),
                saved.getEvaluation(),
                assessment != null ? assessment.getId() : null,
                jobPosting != null ? jobPosting.getId() : null,
                saved.getCreatedAt(),
                saved.getUpdatedAt()
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
                        r.getStatus(),
                        r.getEvaluation(),
                        r.getAssessment() != null ? r.getAssessment().getId() : null,
                        r.getJobPosting() != null ? r.getJobPosting().getId() : null,
                        r.getCreatedAt(),
                        r.getUpdatedAt()
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

    // ========== 수정/확정/평가 엔드포인트 ==========

    /**
     * 자소서 수정 - 수정 시 DRAFT로 복귀
     */
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

        // 수정 시 상태를 DRAFT로 변경 (재확정 필요)
        resume.setStatus("DRAFT");
        resume.setEvaluation(null);  // 평가 초기화
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
     * 자소서 확정
     */
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
     * 자소서 평가 - AgentService 연동 (캐싱 지원)
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

        // 이미 평가된 경우 재사용 (크레딧 차감 X)
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

        // 🔥 AI 호출 전 크레딧 체크 및 차감
        if (!user.hasEnoughCredits(1)) {
            return ResponseEntity.status(402).build(); // Payment Required
        }
        user.useCredits(1);
        userRepository.save(user);

        // AgentService를 통한 AI 평가
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
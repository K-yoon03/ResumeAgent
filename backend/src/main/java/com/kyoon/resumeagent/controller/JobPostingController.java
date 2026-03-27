package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.Entity.JobPosting;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.JobPostingRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import com.kyoon.resumeagent.service.AgentService;
import java.util.Map;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/job-postings")
@RequiredArgsConstructor
public class JobPostingController {

    private final AgentService agentService;
    private final JobPostingRepository jobPostingRepository;
    private final UserRepository userRepository;

    record SaveRequest(
            String companyName,
            String position,
            String mainTasks,
            String requirements,
            String preferred,
            String techStack,
            String workPlace,
            String employmentType,
            String vision
    ) {}

    record JobPostingResponse(
            Long id,
            String companyName,
            String position,
            String mainTasks,
            String requirements,
            String preferred,
            String techStack,
            String workPlace,
            String employmentType,
            String vision,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    /**
     * 공고 저장
     */
    @PostMapping
    public ResponseEntity<JobPostingResponse> save(
            @RequestBody SaveRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();

        JobPosting jobPosting = JobPosting.builder()
                .user(user)
                .companyName(req.companyName())
                .position(req.position())
                .mainTasks(req.mainTasks())
                .requirements(req.requirements())
                .preferred(req.preferred())
                .techStack(req.techStack())
                .workPlace(req.workPlace())
                .employmentType(req.employmentType())
                .vision(req.vision())
                .capabilityVector(agentService.extractCapabilityVector(  // ← 추가
                        String.join("\n", req.mainTasks(), req.requirements(), req.preferred(), req.techStack())
                ))
                .build();

        JobPosting saved = jobPostingRepository.save(jobPosting);

        return ResponseEntity.ok(new JobPostingResponse(
                saved.getId(),
                saved.getCompanyName(),
                saved.getPosition(),
                saved.getMainTasks(),
                saved.getRequirements(),
                saved.getPreferred(),
                saved.getTechStack(),
                saved.getWorkPlace(),
                saved.getEmploymentType(),
                saved.getVision(),
                saved.getCreatedAt(),
                saved.getUpdatedAt()
        ));
    }

    /**
     * 내 공고 목록 조회
     */
    @GetMapping
    public ResponseEntity<List<JobPostingResponse>> getMyJobPostings(
            @AuthenticationPrincipal UserDetails userDetails) {

        List<JobPosting> postings = jobPostingRepository
                .findByUserEmailOrderByCreatedAtDesc(userDetails.getUsername());

        List<JobPostingResponse> response = postings.stream()
                .map(jp -> new JobPostingResponse(
                        jp.getId(),
                        jp.getCompanyName(),
                        jp.getPosition(),
                        jp.getMainTasks(),
                        jp.getRequirements(),
                        jp.getPreferred(),
                        jp.getTechStack(),
                        jp.getWorkPlace(),
                        jp.getEmploymentType(),
                        jp.getVision(),
                        jp.getCreatedAt(),
                        jp.getUpdatedAt()
                )).toList();

        return ResponseEntity.ok(response);
    }

    /**
     * 공고 삭제
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        JobPosting jobPosting = jobPostingRepository.findById(id).orElseThrow();

        if (!jobPosting.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        jobPostingRepository.delete(jobPosting);
        return ResponseEntity.ok().build();
    }
}
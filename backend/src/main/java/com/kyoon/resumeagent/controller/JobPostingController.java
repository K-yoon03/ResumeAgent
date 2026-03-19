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
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/job-postings")
@RequiredArgsConstructor
public class JobPostingController {

    private final JobPostingRepository jobPostingRepository;
    private final UserRepository userRepository;

    record JobPostingRequest(
            String companyName, String position, String mainTasks,
            String requirements, String preferred, String techStack,
            String workPlace, String employmentType, String vision
    ) {}

    record JobPostingResponse(
            Long id, String companyName, String position, String mainTasks,
            String requirements, String preferred, String techStack,
            String workPlace, String employmentType, String vision,
            LocalDateTime createdAt
    ) {}

    // 목록 조회
    @GetMapping
    public ResponseEntity<List<JobPostingResponse>> getMyJobPostings(
            @AuthenticationPrincipal UserDetails userDetails) {

        List<JobPosting> list = jobPostingRepository
                .findByUserEmailOrderByCreatedAtDesc(userDetails.getUsername());

        return ResponseEntity.ok(list.stream().map(j -> new JobPostingResponse(
                j.getId(), j.getCompanyName(), j.getPosition(), j.getMainTasks(),
                j.getRequirements(), j.getPreferred(), j.getTechStack(),
                j.getWorkPlace(), j.getEmploymentType(), j.getVision(),
                j.getCreatedAt()
        )).toList());
    }

    // 저장
    @PostMapping
    public ResponseEntity<JobPostingResponse> save(
            @RequestBody JobPostingRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();

        JobPosting saved = jobPostingRepository.save(JobPosting.builder()
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
                .build());

        return ResponseEntity.ok(new JobPostingResponse(
                saved.getId(), saved.getCompanyName(), saved.getPosition(),
                saved.getMainTasks(), saved.getRequirements(), saved.getPreferred(),
                saved.getTechStack(), saved.getWorkPlace(), saved.getEmploymentType(),
                saved.getVision(), saved.getCreatedAt()
        ));
    }

    // 수정
    @PutMapping("/{id}")
    public ResponseEntity<JobPostingResponse> update(
            @PathVariable Long id,
            @RequestBody JobPostingRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        JobPosting jp = jobPostingRepository.findById(id).orElseThrow();

        if (!jp.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        jp.setCompanyName(req.companyName());
        jp.setPosition(req.position());
        jp.setMainTasks(req.mainTasks());
        jp.setRequirements(req.requirements());
        jp.setPreferred(req.preferred());
        jp.setTechStack(req.techStack());
        jp.setWorkPlace(req.workPlace());
        jp.setEmploymentType(req.employmentType());
        jp.setVision(req.vision());

        JobPosting updated = jobPostingRepository.save(jp);

        return ResponseEntity.ok(new JobPostingResponse(
                updated.getId(), updated.getCompanyName(), updated.getPosition(),
                updated.getMainTasks(), updated.getRequirements(), updated.getPreferred(),
                updated.getTechStack(), updated.getWorkPlace(), updated.getEmploymentType(),
                updated.getVision(), updated.getCreatedAt()
        ));
    }

    // 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        JobPosting jp = jobPostingRepository.findById(id).orElseThrow();

        if (!jp.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }

        jobPostingRepository.delete(jp);
        return ResponseEntity.ok().build();
    }
}
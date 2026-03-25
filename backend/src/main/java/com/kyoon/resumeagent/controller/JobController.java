package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.DTO.JobDTOs.*;
import com.kyoon.resumeagent.service.JobService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/jobs")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    /**
     * 전체 직무 목록 조회
     * GET /api/v1/jobs
     */
    @GetMapping
    public ResponseEntity<List<JobSummaryDTO>> getAllJobs() {
        return ResponseEntity.ok(jobService.getAllJobs());
    }

    /**
     * 직무 코드로 상세 조회
     * GET /api/v1/jobs/code/{jobCode}
     */
    @GetMapping("/code/{jobCode}")
    public ResponseEntity<JobDetailDTO> getJobByCode(@PathVariable String jobCode) {
        return ResponseEntity.ok(jobService.getJobByCode(jobCode));
    }

    /**
     * ID로 상세 조회
     * GET /api/v1/jobs/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<JobDetailDTO> getJobById(@PathVariable Long id) {
        return ResponseEntity.ok(jobService.getJobById(id));
    }

    /**
     * 카테고리별 직무 목록
     * GET /api/v1/jobs/category/{category}
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<List<JobSummaryDTO>> getJobsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(jobService.getJobsByCategory(category));
    }

    /**
     * 카테고리 목록
     * GET /api/v1/jobs/categories
     */
    @GetMapping("/categories")
    public ResponseEntity<List<String>> getAllCategories() {
        return ResponseEntity.ok(jobService.getAllCategories());
    }
}
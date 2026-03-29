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

    @GetMapping
    public ResponseEntity<List<JobGroupSummaryDTO>> getAllJobs() {
        return ResponseEntity.ok(jobService.getAllJobs());
    }

    @GetMapping("/code/{groupCode}")
    public ResponseEntity<JobGroupDetailDTO> getJobByCode(@PathVariable String groupCode) {
        return ResponseEntity.ok(jobService.getJobByCode(groupCode));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobGroupDetailDTO> getJobById(@PathVariable Long id) {
        return ResponseEntity.ok(jobService.getJobById(id));
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<JobGroupSummaryDTO>> getJobsByCategory(@PathVariable String category) {
        return ResponseEntity.ok(jobService.getJobsByCategory(category));
    }

    @GetMapping("/categories")
    public ResponseEntity<List<String>> getAllCategories() {
        return ResponseEntity.ok(jobService.getAllCategories());
    }
}
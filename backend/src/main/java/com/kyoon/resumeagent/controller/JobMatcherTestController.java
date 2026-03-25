package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.DTO.JobMatchResult;
import com.kyoon.resumeagent.service.JobMatcherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/test/job-matcher")
@RequiredArgsConstructor
public class JobMatcherTestController {

    private final JobMatcherService jobMatcherService;

    /**
     * 직무 매칭 테스트
     * GET /api/test/job-matcher?input=백엔드 개발자
     */
    @GetMapping
    public ResponseEntity<JobMatchResult> testMatch(@RequestParam String input) {
        try {
            JobMatchResult result = jobMatcherService.matchJob(input);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
}
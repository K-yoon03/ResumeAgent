package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.service.ResumeGeneratorService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/resume")
public class ResumeController {

    private final ResumeGeneratorService resumeGeneratorService;

    public ResumeController(ResumeGeneratorService resumeGeneratorService) {
        this.resumeGeneratorService = resumeGeneratorService;
    }

    record ResumeRequest(String experience, String analysis, String jobPosting) {}

    @PostMapping(value = "/generate", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> generate(@RequestBody ResumeRequest request) {
        return resumeGeneratorService.generate(request.experience(), request.analysis(), request.jobPosting());
    }
}
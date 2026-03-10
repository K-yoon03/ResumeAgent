package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.service.AnalyzerService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/v1/agent")
public class ChatController {

    private final AnalyzerService analyzerService;

    public ChatController(AnalyzerService analyzerService) {
        this.analyzerService = analyzerService;
    }

    @PostMapping(value = "/analyze", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> analyze(@RequestBody String experience) {
        return analyzerService.analyzeExperienceStream(experience);
    }

}

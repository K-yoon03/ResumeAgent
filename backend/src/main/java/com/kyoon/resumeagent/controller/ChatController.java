package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.DTO.WriterRequest;
import com.kyoon.resumeagent.service.AnalyzerService;
import com.kyoon.resumeagent.service.WriterService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/agent")
public class ChatController {

    private final AnalyzerService analyzerService;

    public ChatController(AnalyzerService analyzerService, WriterService writerService) {
        this.analyzerService = analyzerService;
    }

    @PostMapping(value = "/analyze", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> analyze(@RequestBody String experience) {
        return analyzerService.analyzeExperienceStream(experience);
    }

}

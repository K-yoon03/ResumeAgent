package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.service.WriterService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/agent")
@CrossOrigin(origins = "http://localhost:5173") // 리액트 포트 허용
public class WriterController {

    private final WriterService writerService;

    public WriterController(WriterService writerService) {
        this.writerService = writerService;
    }

    @PostMapping(value = "/write", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> writeResume(@RequestBody Map<String, String> request) {
        return writerService.writeResumeStream(
                request.get("experience"),
                request.get("analysis"),
                request.get("userRequest") // 리액트에서 보낼 키값
        );
    }
}

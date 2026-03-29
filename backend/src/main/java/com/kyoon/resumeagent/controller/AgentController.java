package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.service.AgentService;
import com.kyoon.resumeagent.service.AnalyzerService;
import com.kyoon.resumeagent.service.JobSummaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/agent")
public class AgentController {

    private final AnalyzerService analyzerService;
    private final JobSummaryService jobSummaryService;
    private final AgentService agentService;

    public AgentController(
            AnalyzerService analyzerService,
            JobSummaryService jobSummaryService,
            AgentService agentService) {
        this.analyzerService = analyzerService;
        this.jobSummaryService = jobSummaryService;
        this.agentService = agentService;
    }

    record ScoreRequest(String experience) {}
    record SummarizeRequest(String jobPosting) {}
    record FollowUpRequest(String experience, String analysis) {}
    record ParseJobPostingRequest(String rawText) {}

    @PostMapping(value = "/analyze", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> analyze(@RequestBody String experience) {
        return analyzerService.analyzeExperienceStream(experience);
    }

    @PostMapping("/score")
    public ResponseEntity<AnalyzerService.ScoreResponse> score(@RequestBody ScoreRequest req) {
        return ResponseEntity.ok(analyzerService.score(req.experience()));
    }

    @PostMapping("/summarize")
    public String summarize(@RequestBody SummarizeRequest request) {
        return jobSummaryService.summarize(request.jobPosting());
    }

    @PostMapping("/follow-up-questions")
    public ResponseEntity<String> followUpQuestions(@RequestBody FollowUpRequest req) {
        return ResponseEntity.ok(
                agentService.generateFollowUpQuestions(req.experience(), req.analysis())
        );
    }

    /**
     * 공고 매직 페이스트 파싱 (신규)
     */
    @PostMapping("/parse-job-posting")
    public ResponseEntity<String> parseJobPosting(@RequestBody ParseJobPostingRequest req) {
        if (req.rawText() == null || req.rawText().isBlank()) {
            return ResponseEntity.badRequest().body("{\"error\": \"rawText is required\"}");
        }

        String parsed = agentService.parseJobPosting(req.rawText());
        return ResponseEntity.ok(parsed);
    }
    @PostMapping("/parse-job-posting-image")
    public ResponseEntity<String> parseJobPostingImage(
            @RequestParam("image") MultipartFile image) {

        try {
            byte[] imageBytes = image.getBytes();
            String result = agentService.parseJobPostingFromImage(imageBytes);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("이미지 처리 실패: " + e.getMessage());
        }
    }

    // STAR 필드 개선
    record ImproveStarRequest(String field, String content, String type, String projectName) {}

    @PostMapping("/improve-star")
    public ResponseEntity<?> improveStarField(@RequestBody ImproveStarRequest request) {
        try {
            String result = agentService.improveStarField(
                    request.field(), request.content(), request.type(), request.projectName());
            // JSON 문자열 → Map으로 파싱해서 반환
            return ResponseEntity.ok(new com.fasterxml.jackson.databind.ObjectMapper().readValue(result, java.util.Map.class));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("개선 실패: " + e.getMessage());
        }
    }
}
package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.service.AgentService;
import com.kyoon.resumeagent.service.AnalyzerService;
import com.kyoon.resumeagent.service.JobCrawlerService;
import com.kyoon.resumeagent.service.JobSummaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/v1/agent")
public class AgentController {

    private final AnalyzerService analyzerService;
    private final JobCrawlerService jobCrawlerService;
    private final JobSummaryService jobSummaryService;
    private final AgentService agentService;

    public AgentController(
            AnalyzerService analyzerService,
            JobCrawlerService jobCrawlerService,
            JobSummaryService jobSummaryService,
            AgentService agentService) {
        this.analyzerService = analyzerService;
        this.jobCrawlerService = jobCrawlerService;
        this.jobSummaryService = jobSummaryService;
        this.agentService = agentService;
    }

    record ScoreRequest(String experience) {}
    record CrawlRequest(String url) {}
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

    @PostMapping("/crawl")
    public String crawl(@RequestBody CrawlRequest request) {
        return jobCrawlerService.crawl(request.url());
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
}
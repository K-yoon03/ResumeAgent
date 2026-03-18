package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.service.AnalyzerService;
//import com.kyoon.resumeagent.service.InputCleanerService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import com.kyoon.resumeagent.service.JobCrawlerService;
import com.kyoon.resumeagent.service.JobSummaryService;
import reactor.core.publisher.Flux;


@RestController
@RequestMapping("/api/v1/agent")
public class AgentController {

    private final AnalyzerService analyzerService;
    private final JobCrawlerService jobCrawlerService;
    private final JobSummaryService jobSummaryService;

    public AgentController(AnalyzerService analyzerService,
                           JobCrawlerService jobCrawlerService,
                           JobSummaryService jobSummaryService) {
        this.analyzerService = analyzerService;
        this.jobCrawlerService = jobCrawlerService;
        this.jobSummaryService = jobSummaryService;
    }

    record ScoreRequest(String experience) {}
    record CrawlRequest(String url) {}
    record SummarizeRequest(String jobPosting) {}

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
}
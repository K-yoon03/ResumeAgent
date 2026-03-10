package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.service.InputCleanerService;
import org.springframework.web.bind.annotation.*;
import com.kyoon.resumeagent.service.JobCrawlerService;
import com.kyoon.resumeagent.service.JobSummaryService;


@RestController
@RequestMapping("/api/v1/agent")
public class AgentController {

    private final InputCleanerService inputCleanerService;
    private final JobCrawlerService jobCrawlerService;
    private final JobSummaryService jobSummaryService;

    public AgentController(InputCleanerService inputCleanerService, JobCrawlerService jobCrawlerService, JobSummaryService jobSummaryService) {
        this.inputCleanerService = inputCleanerService;
        this.jobCrawlerService = jobCrawlerService;
        this.jobSummaryService = jobSummaryService;
    }

    record CleanRequest(String experience) {}

    @PostMapping("/clean")
    public String clean(@RequestBody CleanRequest request) {
        return inputCleanerService.clean(request.experience());
    }

    record CrawlRequest(String url) {}

    @PostMapping("/crawl")
    public String crawl(@RequestBody CrawlRequest request) {
        return jobCrawlerService.crawl(request.url());
    }

    record SummarizeRequest(String jobPosting) {}

    @PostMapping("/summarize")
    public String summarize(@RequestBody SummarizeRequest request) {
        return jobSummaryService.summarize(request.jobPosting());
    }
}
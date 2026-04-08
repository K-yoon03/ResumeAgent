package com.kyoon.resumeagent.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.CompanyJobPosting;
import com.kyoon.resumeagent.repository.CompanyJobPostingRepository;
import com.kyoon.resumeagent.service.JDAnalysisService;
import com.kyoon.resumeagent.service.JDAnalysisService.JDProfile;
import com.kyoon.resumeagent.service.JDGapAnalysisService;
import com.kyoon.resumeagent.service.JDGapAnalysisService.GapReport;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/jd")
@RequiredArgsConstructor
public class JDController {

    private final JDAnalysisService jdAnalysisService;
    private final JDGapAnalysisService jdGapAnalysisService;
    private final CompanyJobPostingRepository companyJobPostingRepository;
    private final ObjectMapper objectMapper;

    /**
     * JD 분석 → CompanyJobPosting에 결과 저장
     */
    @PostMapping("/analyze")
    public ResponseEntity<JDProfile> analyze(@RequestBody AnalyzeRequest req) throws Exception {
        JDProfile profile = jdAnalysisService.analyze(req.jdText());

        // CompanyJobPosting에 저장
        CompanyJobPosting posting = companyJobPostingRepository.findById(req.companyJobPostingId())
                .orElseThrow(() -> new RuntimeException("CompanyJobPosting not found: " + req.companyJobPostingId()));

        posting.setJdProfile(objectMapper.convertValue(profile, Map.class));
        posting.setAnalyzedJobCode(profile.jobCode());
        companyJobPostingRepository.save(posting);

        return ResponseEntity.ok(profile);
    }

    /**
     * Gap 계산 — companyJobPostingId에서 JDProfile 조회 후 assessmentId와 비교
     */
    @PostMapping("/gap")
    public ResponseEntity<GapReport> gap(@RequestBody GapRequest req) {
        CompanyJobPosting posting = companyJobPostingRepository.findById(req.companyJobPostingId())
                .orElseThrow(() -> new RuntimeException("CompanyJobPosting not found: " + req.companyJobPostingId()));

        if (posting.getJdProfile() == null) {
            throw new RuntimeException("JD analysis not done yet for posting: " + req.companyJobPostingId());
        }

        JDProfile jdProfile = objectMapper.convertValue(posting.getJdProfile(), JDProfile.class);
        GapReport report = jdGapAnalysisService.analyze(req.assessmentId(), jdProfile);
        return ResponseEntity.ok(report);
    }

    public record AnalyzeRequest(Long companyJobPostingId, String jdText) {}
    public record GapRequest(Long companyJobPostingId, Long assessmentId) {}
}
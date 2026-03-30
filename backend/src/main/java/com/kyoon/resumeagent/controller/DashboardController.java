package com.kyoon.resumeagent.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Capability.CapabilityCode;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.Company;
import com.kyoon.resumeagent.Entity.Job;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.CompanyRepository;
import com.kyoon.resumeagent.repository.JobRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import com.kyoon.resumeagent.service.JobChangeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final JobRepository jobRepository;
    private final AssessmentRepository assessmentRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final JobChangeService jobChangeService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserInfo userInfo = new UserInfo(user.getNickname(), user.getEmail());

        // 2. 희망 직무 정보
        DesiredJobInfo desiredJobInfo = null;
        if (user.getMappedJobCode() != null) {
            Job job = jobRepository.findByGroupCode(user.getMappedJobCode()).orElse(null);
            desiredJobInfo = new DesiredJobInfo(
                    user.getDesiredJobText(),
                    user.getMappedJobCode(),
                    job != null ? job.getGroupName() : null,
                    user.getIsTemporaryJob(),
                    user.getJobMatchType(),
                    user.getJobMatchConfidence(),
                    user.getJobMappedAt(),
                    jobChangeService.getRemainingChanges(user)
            );
        }

        // 3. 주 역량 평가
        PrimaryAssessmentInfo primaryAssessmentInfo = null;
        Assessment primaryCandidate = user.getPrimaryAssessment();
        if (primaryCandidate == null) {
            List<Assessment> allAssessments = assessmentRepository.findByUserOrderByCreatedAtDesc(user);
            primaryCandidate = allAssessments.stream()
                    .filter(a -> {
                        try {
                            JsonNode sd = objectMapper.readTree(a.getScoreData());
                            return sd.has("isFinal") && sd.get("isFinal").asBoolean();
                        } catch (Exception e) { return false; }
                    })
                    .findFirst().orElse(null);
        }
        if (primaryCandidate != null) {
            Job assessedJob = jobRepository.findByGroupCode(primaryCandidate.getEvaluatedJobCode()).orElse(null);
            primaryAssessmentInfo = parseAssessmentInfo(primaryCandidate, assessedJob);
        }

        // 4. 역량 평가 이력
        List<Assessment> assessments = assessmentRepository.findByUserOrderByCreatedAtDesc(user);
        List<AssessmentHistoryItem> assessmentHistory = assessments.stream()
                .map(a -> {
                    Job job = jobRepository.findByGroupCode(a.getEvaluatedJobCode()).orElse(null);
                    return new AssessmentHistoryItem(
                            a.getId(),
                            a.getEvaluatedJobCode(),
                            job != null ? job.getGroupName() : null,
                            a.getScoreData(),
                            a.getIsPrimary(),
                            a.getCreatedAt()
                    );
                })
                .toList();

        // 5. 주 희망기업
        PrimaryCompanyInfo primaryCompanyInfo = null;
        if (user.getPrimaryCompany() != null) {
            Company primaryCompany = user.getPrimaryCompany();
            primaryCompanyInfo = new PrimaryCompanyInfo(
                    primaryCompany.getId(),
                    primaryCompany.getCompanyName(),
                    primaryCompany.getIndustry(),
                    primaryCompany.getMemo(),
                    primaryCompany.getAddedAt()
            );
        }

        // 6. 희망기업 목록
        List<Company> companies = companyRepository.findByUserOrderByAddedAtDesc(user);
        List<CompanyListItem> companyList = companies.stream()
                .map(c -> new CompanyListItem(c.getId(), c.getCompanyName(), c.getIndustry(), c.getIsPrimary()))
                .toList();

        // 7. 크레딧
        CreditInfo creditInfo = new CreditInfo(
                user.getRemainingCredits(), user.getDailyCredits(), user.getUsedCredits()
        );

        return ResponseEntity.ok(new DashboardResponse(
                userInfo, desiredJobInfo, primaryAssessmentInfo,
                assessmentHistory, primaryCompanyInfo, companyList, creditInfo
        ));
    }

    private PrimaryAssessmentInfo parseAssessmentInfo(Assessment assessment, Job job) {
        int certEffect = 0;
        try {
            JsonNode scoreData = objectMapper.readTree(assessment.getScoreData());
            int totalScore = scoreData.has("totalScore") ? scoreData.get("totalScore").asInt() : 0;

            certEffect = scoreData.has("certEffect") ? scoreData.get("certEffect").asInt() : 0;

            List<CompetencyScoreDetail> competencyScores = new ArrayList<>();
            JsonNode scores = scoreData.get("competencyScores");
            if (scores != null && scores.isArray()) {
                for (JsonNode scoreNode : scores) {
                    String capCodeStr = scoreNode.has("capCode")
                            ? scoreNode.get("capCode").asText()
                            : scoreNode.has("name") ? scoreNode.get("name").asText() : "";
                    String displayName;
                    try {
                        displayName = CapabilityCode.valueOf(capCodeStr).getDescription();
                    } catch (IllegalArgumentException ex) {
                        displayName = capCodeStr;
                    }
                    competencyScores.add(new CompetencyScoreDetail(
                            capCodeStr,   // capCode 추가
                            displayName,
                            scoreNode.get("score").asInt(),
                            scoreNode.get("weight").asDouble(),
                            scoreNode.get("contribution").asDouble(),
                            scoreNode.has("evidence") ? scoreNode.get("evidence").asText() : "",
                            scoreNode.has("isCore") && scoreNode.get("isCore").asBoolean(),
                            scoreNode.has("level") ? scoreNode.get("level").asText() : "UNKNOWN"
                    ));
                }
            }

            List<String> strengths = new ArrayList<>();
            JsonNode strengthsNode = scoreData.get("strengths");
            if (strengthsNode != null && strengthsNode.isArray())
                strengthsNode.forEach(s -> strengths.add(s.asText()));

            List<String> improvements = new ArrayList<>();
            JsonNode improvementsNode = scoreData.get("improvements");
            if (improvementsNode != null && improvementsNode.isArray())
                improvementsNode.forEach(i -> improvements.add(i.asText()));

            Map<String, Double> jobRanking = new java.util.LinkedHashMap<>();
            JsonNode jobRankingNode = scoreData.get("jobRanking");
            if (jobRankingNode != null) {
                jobRankingNode.fields().forEachRemaining(e -> jobRanking.put(e.getKey(), e.getValue().asDouble()));
            }


            Set<String> commonCapCodes = Set.of(
                    "CERT_MATCH", "LANGUAGE_SCORE", "SOFT_COLLABORATION",
                    "SOFT_PROBLEM_SOLVING", "WORK_EXPERIENCE", "DOCUMENTATION"
            );

            List<CompetencyScoreDetail> coreScores = competencyScores.stream()
                    .filter(c -> c.isCore() && !c.level().equals("UNKNOWN") && c.score() > 0)
                    .toList();

            List<CompetencyScoreDetail> commonScores = new ArrayList<>();
            JsonNode compResults = scoreData.get("competencyResults");
            if (compResults != null && compResults.isArray()) {
                for (JsonNode cr : compResults) {
                    String capCode = cr.has("capCode") ? cr.get("capCode").asText() : "";
                    if (commonCapCodes.contains(capCode) && "depth".equals(cr.get("status").asText())) {
                        String displayName;
                        try {
                            displayName = CapabilityCode.valueOf(capCode).getDescription();
                        } catch (IllegalArgumentException e) {
                            displayName = capCode;
                        }
                        commonScores.add(new CompetencyScoreDetail(
                                capCode, displayName, 100, 0.0, 0.0, "", false, "L1_USAGE"
                        ));
                    }
                }
            }

            List<CompetencyScoreDetail> coreUnknownScores = competencyScores.stream()
                    .filter(c -> c.isCore() && (c.level().equals("UNKNOWN") || c.score() == 0))
                    .filter(c -> !commonCapCodes.contains(c.capCode()))
                    .toList();

            List<CompetencyScoreDetail> nonCoreScores = competencyScores.stream()
                    .filter(c -> !c.isCore() && !c.level().equals("UNKNOWN") && c.score() > 0)
                    .filter(c -> !commonCapCodes.contains(c.capCode()))
                    .toList();

            return new PrimaryAssessmentInfo(
                    assessment.getId(),
                    assessment.getEvaluatedJobCode(),
                    job != null ? job.getGroupName() : null,
                    totalScore,
                    coreScores,
                    commonScores,
                    coreUnknownScores,
                    nonCoreScores,
                    strengths,
                    improvements,
                    assessment.getCreatedAt(),
                    assessment.getCapabilityVector() != null ? assessment.getCapabilityVector() : Map.of(),
                    assessment.getGrade(),
                    jobRanking,
                    job != null ? job.getMeasureType().name() : "TECH_STACK",
                    certEffect

            );

        } catch (Exception e) {
            System.err.println("❌ parseAssessmentInfo 실패: " + e.getMessage());
            e.printStackTrace();
            return new PrimaryAssessmentInfo(
                    assessment.getId(),
                    assessment.getEvaluatedJobCode(),
                    job != null ? job.getGroupName() : null,
                    0, List.of(), List.of(), List.of(), List.of(),
                    List.of(), List.of(),
                    assessment.getCreatedAt(),
                    Map.of(), null, Map.of(),
                    job != null ? job.getMeasureType().name() : "TECH_STACK",
                    certEffect
            );
        }
    }

    // ===== DTOs =====

    record DashboardResponse(
            UserInfo user,
            DesiredJobInfo desiredJob,
            PrimaryAssessmentInfo primaryAssessment,
            List<AssessmentHistoryItem> assessmentHistory,
            PrimaryCompanyInfo primaryCompany,
            List<CompanyListItem> companyList,
            CreditInfo credits
    ) {}

    record UserInfo(String nickname, String email) {}

    record DesiredJobInfo(
            String jobText, String jobCode, String groupName,
            Boolean isTemporary, String matchType, Double confidence,
            LocalDateTime mappedAt, int remainingChanges
    ) {}

    record PrimaryAssessmentInfo(
            Long id, String evaluatedJobCode, String groupName,
            int totalScore,
            List<CompetencyScoreDetail> coreScores,
            List<CompetencyScoreDetail> commonScores,
            List<CompetencyScoreDetail> coreUnknownScores,
            List<CompetencyScoreDetail> nonCoreScores,
            List<String> strengths, List<String> improvements,
            LocalDateTime createdAt,
            Map<String, Double> capabilityVector,
            String grade,
            Map<String, Double> jobRanking,
            String measureType,
            int certEffect
    ) {}

    record CompetencyScoreDetail(
            String capCode, String name, int score, double weight,
            double contribution, String evidence, boolean isCore, String level
    ) {}

    record AssessmentHistoryItem(
            Long id, String evaluatedJobCode, String groupName,
            String scoreData, Boolean isPrimary, LocalDateTime createdAt
    ) {}

    record PrimaryCompanyInfo(
            Long id, String name, String industry, String memo, LocalDateTime addedAt
    ) {}

    record CompanyListItem(Long id, String name, String industry, Boolean isPrimary) {}

    record CreditInfo(int remaining, int daily, int used) {}
}
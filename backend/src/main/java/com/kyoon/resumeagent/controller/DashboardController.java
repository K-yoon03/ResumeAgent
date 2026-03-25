package com.kyoon.resumeagent.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final JobRepository jobRepository;
    private final AssessmentRepository assessmentRepository;
    private final CompanyRepository companyRepository;  // 🔥 추가
    private final UserRepository userRepository;
    private final JobChangeService jobChangeService;
    private final ObjectMapper objectMapper;  // 🔥 추가

    /**
     * 대시보드 데이터 조회
     * GET /api/dashboard
     */
    @GetMapping
    public ResponseEntity<DashboardResponse> getDashboard(
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found")); // 사용자 정보 추출 (UserDetails)

        UserInfo userInfo = new UserInfo(
                user.getNickname(),
                user.getEmail()
        );

        // 2. 희망 직무 정보
        DesiredJobInfo desiredJobInfo = null;
        if (user.getMappedJobCode() != null) {
            Job job = jobRepository.findByJobCode(user.getMappedJobCode()).orElse(null);
            desiredJobInfo = new DesiredJobInfo(
                    user.getDesiredJobText(),
                    user.getMappedJobCode(),
                    job != null ? job.getJobName() : null,
                    user.getIsTemporaryJob(),
                    user.getJobMatchType(),
                    user.getJobMatchConfidence(),
                    user.getJobMappedAt(),
                    jobChangeService.getRemainingChanges(user)
            );
        }

        // 3. 🔥 주 역량 평가 (scoreData 파싱)
        PrimaryAssessmentInfo primaryAssessmentInfo = null;
        if (user.getPrimaryAssessment() != null) {
            Assessment primary = user.getPrimaryAssessment();
            Job assessedJob = jobRepository.findByJobCode(primary.getEvaluatedJobCode()).orElse(null);

            primaryAssessmentInfo = parseAssessmentInfo(primary, assessedJob);
        }

        // 4. 역량 평가 이력
        List<Assessment> assessments = assessmentRepository
                .findByUserOrderByCreatedAtDesc(user);

        List<AssessmentHistoryItem> assessmentHistory = assessments.stream()
                .map(a -> {
                    Job job = jobRepository.findByJobCode(a.getEvaluatedJobCode()).orElse(null);
                    return new AssessmentHistoryItem(
                            a.getId(),
                            a.getEvaluatedJobCode(),
                            job != null ? job.getJobName() : null,
                            a.getScoreData(),
                            a.getIsPrimary(),
                            a.getCreatedAt()
                    );
                })
                .toList();

        // 5. 🔥 주 희망기업
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

        // 6. 🔥 희망기업 목록
        List<Company> companies = companyRepository.findByUserOrderByAddedAtDesc(user);
        List<CompanyListItem> companyList = companies.stream()
                .map(c -> new CompanyListItem(
                        c.getId(),
                        c.getCompanyName(),
                        c.getIndustry(),
                        c.getIsPrimary()
                ))
                .toList();

        // 7. 크레딧 정보
        CreditInfo creditInfo = new CreditInfo(
                user.getRemainingCredits(),
                user.getDailyCredits(),
                user.getUsedCredits()
        );

        // 8. 통합 응답
        DashboardResponse response = new DashboardResponse(
                userInfo,
                desiredJobInfo,
                primaryAssessmentInfo,
                assessmentHistory,
                primaryCompanyInfo,  // 🔥 추가
                companyList,         // 🔥 추가
                creditInfo
        );

        return ResponseEntity.ok(response);
    }

    /**
     * 🔥 Assessment scoreData 파싱
     */
    private PrimaryAssessmentInfo parseAssessmentInfo(Assessment assessment, Job job) {
        try {
            JsonNode scoreData = objectMapper.readTree(assessment.getScoreData());

            int totalScore = scoreData.get("totalScore").asInt();

            List<CompetencyScoreDetail> competencyScores = new ArrayList<>();
            JsonNode scores = scoreData.get("competencyScores");
            if (scores != null && scores.isArray()) {
                for (JsonNode scoreNode : scores) {
                    competencyScores.add(new CompetencyScoreDetail(
                            scoreNode.get("name").asText(),
                            scoreNode.get("score").asInt(),
                            scoreNode.get("weight").asDouble(),
                            scoreNode.get("contribution").asDouble(),
                            scoreNode.get("evidence").asText()
                    ));
                }
            }

            List<String> strengths = new ArrayList<>();
            JsonNode strengthsNode = scoreData.get("strengths");
            if (strengthsNode != null && strengthsNode.isArray()) {
                strengthsNode.forEach(s -> strengths.add(s.asText()));
            }

            List<String> improvements = new ArrayList<>();
            JsonNode improvementsNode = scoreData.get("improvements");
            if (improvementsNode != null && improvementsNode.isArray()) {
                improvementsNode.forEach(i -> improvements.add(i.asText()));
            }

            return new PrimaryAssessmentInfo(
                    assessment.getId(),
                    assessment.getEvaluatedJobCode(),
                    job != null ? job.getJobName() : null,
                    totalScore,
                    competencyScores,
                    strengths,
                    improvements,
                    assessment.getCreatedAt()
            );

        } catch (Exception e) {
            // 파싱 실패 시 기본값
            return new PrimaryAssessmentInfo(
                    assessment.getId(),
                    assessment.getEvaluatedJobCode(),
                    job != null ? job.getJobName() : null,
                    0,
                    List.of(),
                    List.of(),
                    List.of(),
                    assessment.getCreatedAt()
            );
        }
    }

    // ===== Response DTOs =====

    record DashboardResponse(
            UserInfo user,
            DesiredJobInfo desiredJob,
            PrimaryAssessmentInfo primaryAssessment,
            List<AssessmentHistoryItem> assessmentHistory,
            PrimaryCompanyInfo primaryCompany,  // 🔥 추가
            List<CompanyListItem> companyList,  // 🔥 추가
            CreditInfo credits
    ) {}

    record UserInfo(
            String nickname,
            String email
    ) {}

    record DesiredJobInfo(
            String jobText,
            String jobCode,
            String jobName,
            Boolean isTemporary,
            String matchType,
            Double confidence,
            LocalDateTime mappedAt,
            int remainingChanges
    ) {}

    // 🔥 수정: scoreData 파싱된 형태
    record PrimaryAssessmentInfo(
            Long id,
            String evaluatedJobCode,
            String jobName,
            int totalScore,
            List<CompetencyScoreDetail> competencyScores,
            List<String> strengths,
            List<String> improvements,
            LocalDateTime createdAt
    ) {}

    // 🔥 추가
    record CompetencyScoreDetail(
            String name,
            int score,
            double weight,
            double contribution,
            String evidence
    ) {}

    record AssessmentHistoryItem(
            Long id,
            String evaluatedJobCode,
            String jobName,
            String scoreData,
            Boolean isPrimary,
            LocalDateTime createdAt
    ) {}

    // 🔥 추가
    record PrimaryCompanyInfo(
            Long id,
            String name,
            String industry,
            String memo,
            LocalDateTime addedAt
    ) {}

    // 🔥 추가
    record CompanyListItem(
            Long id,
            String name,
            String industry,
            Boolean isPrimary
    ) {}

    record CreditInfo(
            int remaining,
            int daily,
            int used
    ) {}
}
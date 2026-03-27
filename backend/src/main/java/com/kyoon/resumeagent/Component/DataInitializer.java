package com.kyoon.resumeagent.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.*;
import com.kyoon.resumeagent.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.core.io.ClassPathResource;

import java.time.LocalDate;
import java.io.InputStream;
import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JobRepository jobRepository;
    private final AssessmentRepository assessmentRepository;
    private final CompanyRepository companyRepository;
    private final ObjectMapper objectMapper;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // 1. 관리자 계정 생성
        initAdminUser();

        // 2. NCS 직무 데이터 로드
        initNcsJobsData();

        // 3. 관리자 예시 데이터
        initAdminSampleData();
    }

    /**
     * 관리자 계정 초기화
     */
    private void initAdminUser() {
        if (userRepository.findByEmail("admin@careerpilot.com").isEmpty()) {
            User admin = User.builder()
                    .email("admin@careerpilot.com")
                    .password(passwordEncoder.encode("admin1234!"))
                    .nickname("CareerPilot")
                    .name("관리자")
                    .birthDate("2000-01-01")
                    .provider("LOCAL")
                    .role("ADMIN")
                    .dailyCredits(999999)
                    .usedCredits(0)
                    .lastResetDate(LocalDate.now())
                    .desiredJobText("백엔드 개발자")
                    .mappedJobCode("CP001")
                    .isTemporaryJob(false)
                    .jobChangeCount(0)
                    .build();
            userRepository.save(admin);
            System.out.println("✅ Admin 계정 생성 완료: admin@careerpilot.com / admin1234!");
        } else {
            System.out.println("ℹ️ Admin 계정 이미 존재함 - 스킵");
        }
    }

    private void initAdminSampleData() throws Exception {
        User admin = userRepository.findByEmail("admin@careerpilot.com").orElse(null);
        if (admin == null) return;

        // 이미 데이터 있으면 스킵
        if (assessmentRepository.findByUserOrderByCreatedAtDesc(admin).size() > 0) {
            System.out.println("ℹ️ Admin 예시 데이터 이미 존재함 - 스킵");
            return;
        }

        // 역량 평가 예시 데이터
        String scoreData = """
        {
          "totalScore": 70,
          "isFinal": true,
          "competencyScores": [
            {"name": "프레임워크 숙련도", "score": 90, "weight": 0.35, "contribution": 31.5, "evidence": "Spring Boot 기반의 3티어 아키텍처 설계와 API 연동 경험이 있음.", "improved": true},
            {"name": "DB 설계 및 API 최적화 능력", "score": 55, "weight": 0.30, "contribution": 16.5, "evidence": "금융감독원 API 및 OpenAI API를 활용한 프로젝트 경험이 있으나 DB 최적화 경험은 부족함.", "improved": false},
            {"name": "코드 리뷰 및 트러블슈팅 경험", "score": 75, "weight": 0.25, "contribution": 18.75, "evidence": "LLM 일관성 문제를 NCS 기반 MappingTable로 해결한 경험이 있음.", "improved": true},
            {"name": "관련 자격 및 교육", "score": 55, "weight": 0.05, "contribution": 2.75, "evidence": "SQLD 자격증 보유.", "improved": false},
            {"name": "어학 역량", "score": 0, "weight": 0.05, "contribution": 0.0, "evidence": "공인어학성적 없음.", "improved": false}
          ],
          "strengths": ["Spring Boot와 다양한 API를 활용한 실무 프로젝트 경험이 풍부함.", "LLM 기반 서비스 개발 및 운영 경험 보유.", "SQLD 자격증 보유로 데이터베이스 기초 지식 있음."],
          "improvements": ["DB 설계 및 API 최적화 경험을 더 쌓을 필요가 있음.", "공인어학성적 취득을 통해 어학 역량을 강화해야 함.", "코드 리뷰 경험을 더 구체적으로 쌓아야 함."],
          "experiences": ["CareerPilot", "Yolo v5 기반 스마트 방범 CCTV", "finporter", "Hero\'s Harvest"]
        }
        """;

        Assessment assessment = Assessment.builder()
                .user(admin)
                .evaluatedJobCode("CP001")
                .experience("경력 및 경험: LLM 기반 역량분석 서비스 CareerPilot, Yolo v5 방범 CCTV, finporter, Hero\'s Harvest\n자격증: SQLD\n보유 직무역량: Spring Boot, React, AWS, OpenStack, Linux\n어학: 없음")
                .analysis("{}")
                .scoreData(scoreData)
                .isPrimary(false)
                .build();
        assessmentRepository.save(assessment);

        // 희망기업 예시 데이터
        Company kakao = Company.builder()
                .user(admin)
                .companyName("카카오")
                .industry("IT·인터넷")
                .memo("백엔드 개발자 포지션 지원 예정")
                .isPrimary(true)
                .build();
        companyRepository.save(kakao);

        Company naver = Company.builder()
                .user(admin)
                .companyName("네이버")
                .industry("IT·인터넷")
                .memo("서버 개발 인턴십 지원 예정")
                .isPrimary(false)
                .build();
        companyRepository.save(naver);

        Company toss = Company.builder()
                .user(admin)
                .companyName("토스")
                .industry("금융·은행")
                .memo("핀테크 백엔드 개발자")
                .isPrimary(false)
                .build();
        companyRepository.save(toss);

        System.out.println("✅ Admin 예시 데이터 생성 완료!");
    }

    /**
     * NCS 직무 데이터 초기화
     */
    private void initNcsJobsData() throws Exception {
        if (jobRepository.count() == 0) {
            loadNcsJobsData();
            System.out.println("✅ NCS 직무 데이터 초기화 완료!");
        } else {
            System.out.println("ℹ️ NCS 직무 데이터 이미 존재함 - 스킵");
        }
    }

    /**
     * JSON 파일에서 NCS 직무 데이터 로드
     */
    private void loadNcsJobsData() throws Exception {
        // JSON 파일 읽기
        ClassPathResource resource = new ClassPathResource("MappingTable/careerpilot_jobs_integrated.json");
        InputStream inputStream = resource.getInputStream();

        JsonNode rootNode = objectMapper.readTree(inputStream);
        JsonNode jobsArray = rootNode.get("jobs");

        if (jobsArray == null || !jobsArray.isArray()) {
            throw new IllegalStateException("Invalid JSON structure: 'jobs' array not found");
        }

        // 각 직무 처리
        for (JsonNode jobNode : jobsArray) {
            Job job = Job.builder()
                    .jobCode(jobNode.get("jobCode").asText())
                    .ncsLarge(jobNode.get("ncsLarge").asText())
                    .ncsMedium(jobNode.get("ncsMedium").asText())
                    .jobName(jobNode.get("jobName").asText())
                    .category(jobNode.get("category").asText())
                    .description(jobNode.has("description") ? jobNode.get("description").asText() : "")
                    .measurementMethod(jobNode.get("measurementMethod").asText())
                    .source(jobNode.get("source").asText())
                    .isTemporary(jobNode.has("isTemporary") && jobNode.get("isTemporary").asBoolean())
                    .build();

            // 역량 추가
            JsonNode competenciesArray = jobNode.get("competencies");
            if (competenciesArray != null && competenciesArray.isArray()) {
                for (JsonNode compNode : competenciesArray) {
                    Competency competency = Competency.builder()
                            .compId(compNode.get("compId").asInt())
                            .name(compNode.get("name").asText())
                            .weight(new BigDecimal(compNode.get("weight").asText()))
                            .indicator(compNode.get("indicator").asText())
                            .measurement(compNode.get("measurement").asText())
                            .build();

                    job.addCompetency(competency);
                }
            }

            // 저장
            jobRepository.save(job);
        }
    }
}
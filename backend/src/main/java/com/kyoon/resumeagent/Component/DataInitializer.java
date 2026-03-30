package com.kyoon.resumeagent.Component;

import com.kyoon.resumeagent.Capability.CapabilityCode;
import com.kyoon.resumeagent.Capability.CapabilityWeight;
import com.kyoon.resumeagent.Capability.JobCapabilityProfile;
import com.kyoon.resumeagent.Entity.*;
import com.kyoon.resumeagent.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JobRepository jobRepository;
    private final AssessmentRepository assessmentRepository;
    private final CompanyRepository companyRepository;
    private final DepthAnswerRepository depthAnswerRepository;
    private final InterviewDataRepository interviewDataRepository;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        initJobGroups();
        initAdminUser();
        initAdminSampleData();
    }

    private void initJobGroups() {
        if (jobRepository.count() > 0) {
            System.out.println("ℹ️ JobGroup 데이터 이미 존재함 - 스킵");
            return;
        }
        // 1. 순회하는 Entry의 Value 타입을 CapabilityWeight 객체로 변경
        for (Map.Entry<String, Map<CapabilityCode, CapabilityWeight>> entry : JobCapabilityProfile.JOB_PROFILES.entrySet()) {
            String groupCode = entry.getKey();

            // 2. Map 타입 변경
            Map<CapabilityCode, CapabilityWeight> weights = entry.getValue();

            JobGroupMeta meta = JobGroupMeta.of(groupCode);
            Job job = Job.builder()
                    .groupCode(groupCode).groupName(meta.groupName())
                    .category(meta.category()).description(meta.description())
                    .measureType(meta.measureType()).build();

            // 3. forEach 람다에서 capWeight 객체를 받고, .weight() 로 숫자를 꺼냄
            weights.forEach((capCode, capWeight) -> {
                Competency competency = Competency.builder()
                        .capCode(capCode.name()).name(capCode.getDescription())
                        .weight(BigDecimal.valueOf(capWeight.weight())).build(); // 여기서 숫자 추출!
                job.addCompetency(competency);
            });
            jobRepository.save(job);
        }
        System.out.println("✅ JobGroup 데이터 초기화 완료! (" + JobCapabilityProfile.JOB_PROFILES.size() + "개)");
    }

    private void initAdminUser() {
        if (userRepository.findByEmail("admin@careerpilot.com").isPresent()) {
            System.out.println("ℹ️ Admin 계정 이미 존재함 - 스킵");
            return;
        }
        User admin = User.builder()
                .email("admin@careerpilot.com")
                .password(passwordEncoder.encode("admin1234!"))
                .nickname("CareerPilot").name("관리자").birthDate("2000-01-01")
                .provider("LOCAL").role("ADMIN")
                .dailyCredits(999999).usedCredits(0).lastResetDate(LocalDate.now())
                .desiredJobText("백엔드 개발자").mappedJobCode("SW_WEB")
                .isTemporaryJob(false).jobChangeCount(0).build();
        userRepository.save(admin);
        System.out.println("✅ Admin 계정 생성 완료: admin@careerpilot.com / admin1234!");
    }

    private void initAdminSampleData() {
        User admin = userRepository.findByEmail("admin@careerpilot.com").orElse(null);
        if (admin == null) return;
        if (!assessmentRepository.findByUserOrderByCreatedAtDesc(admin).isEmpty()) {
            System.out.println("ℹ️ Admin 예시 데이터 이미 존재함 - 스킵");
            return;
        }

        String scoreData = """
            {
              "totalScore": 70,
              "isFinal": true,
              "competencyResults": [
                {"capCode": "BE_FRAMEWORK", "name": "백엔드 프레임워크", "score": 90, "weight": 0.20, "contribution": 18.0, "status": "depth"},
                {"capCode": "DB_USAGE", "name": "데이터베이스 기본 활용", "score": 55, "weight": 0.10, "contribution": 5.5, "status": "depth"},
                {"capCode": "API_USAGE", "name": "REST API 연동", "score": 75, "weight": 0.10, "contribution": 7.5, "status": "depth"},
                {"capCode": "BE_LANG", "name": "백엔드 프로그래밍 언어", "score": 80, "weight": 0.20, "contribution": 16.0, "status": "depth"},
                {"capCode": "SOFT_COLLABORATION", "name": "팀 협업", "score": 85, "weight": 0.05, "contribution": 4.25, "status": "depth"}
              ],
              "strengths": ["Spring Boot 기반 실무 프로젝트 경험이 풍부함", "LLM API 연동 및 AI 서비스 개발 경험 보유"],
              "improvements": ["DB 최적화 경험을 더 쌓을 필요가 있음", "공인어학성적 취득 필요"],
              "experiences": ["CareerPilot", "Yolo v5 기반 스마트 방범 CCTV", "finporter"]
            }
            """;

        Assessment assessment = Assessment.builder()
                .user(admin).evaluatedJobCode("SW_WEB")
                .experience("경력 및 경험: LLM 기반 역량분석 서비스 CareerPilot, Yolo v5 방범 CCTV, finporter\n자격증: SQLD\n보유 직무역량: Spring Boot, React, AWS, OpenStack, Linux\n어학: 없음")
                .analysis("{}").scoreData(scoreData).isPrimary(true)
                .capabilityVector(Map.of(
                        "BE_LANG", 0.80, "BE_FRAMEWORK", 0.90, "DB_USAGE", 0.55,
                        "API_USAGE", 0.75, "FE_FRAMEWORK", 0.60, "SOFT_COLLABORATION", 0.85
                )).build();
        Assessment savedAssessment = assessmentRepository.save(assessment);

        admin.setPrimaryAssessment(savedAssessment);
        userRepository.save(admin);

        // DepthAnswer 샘플 - CareerPilot
        saveDepthAnswer(savedAssessment, "CareerPilot", "CareerPilot 프로젝트에서 어떤 역할을 맡으셨나요?", "백엔드 개발 전반을 담당했어요. Spring Boot로 API를 설계하고 OpenAI API를 연동해서 역량 분석 기능을 구현했습니다.", 0);
        saveDepthAnswer(savedAssessment, "CareerPilot", "기술적으로 가장 어려웠던 점은 무엇인가요?", "LLM 응답의 일관성 문제가 가장 힘들었어요. 같은 입력인데 매번 다른 형식으로 응답이 와서 파싱이 자주 실패했거든요.", 1);
        saveDepthAnswer(savedAssessment, "CareerPilot", "그 문제를 어떻게 해결하셨나요?", "NCS 기반 매핑 테이블을 만들어서 LLM 응답을 정규화했어요. 프롬프트에 JSON 출력 형식을 강제하고, 파싱 실패 시 재시도 로직도 추가했습니다. 덕분에 파싱 성공률이 40% 향상됐어요.", 2);

        // DepthAnswer 샘플 - finporter
        saveDepthAnswer(savedAssessment, "finporter", "finporter 프로젝트는 어떤 서비스인가요?", "금융감독원 API와 OpenAI를 활용해서 사회초년생에게 맞는 금융상품을 추천해주는 서비스예요.", 0);
        saveDepthAnswer(savedAssessment, "finporter", "DB 설계에서 고민했던 부분이 있나요?", "금융상품 데이터가 자주 바뀌어서 캐싱 전략을 고민했어요. Redis로 API 응답을 캐싱해서 응답 속도를 개선했습니다.", 1);

        companyRepository.save(Company.builder().user(admin).companyName("카카오").industry("IT·인터넷").memo("백엔드 개발자 포지션 지원 예정").isPrimary(true).build());
        companyRepository.save(Company.builder().user(admin).companyName("네이버").industry("IT·인터넷").memo("서버 개발 인턴십 지원 예정").isPrimary(false).build());

        // InterviewData 샘플 (새 구조)
        saveInterviewData(savedAssessment, "CareerPilot",
                "백엔드 개발 전반 담당. Spring Boot 기반 API 설계 및 OpenAI API 연동을 통한 역량 분석 기능 구현.",
                "LLM 응답 일관성 문제 해결을 위해 NCS 기반 매핑 테이블을 설계하고, 프롬프트에 JSON 형식을 강제했으며 파싱 실패 시 재시도 로직을 구현.",
                "[\"Spring Boot\", \"OpenAI API\", \"Java\", \"React\"]",
                "파싱 성공률 40% 향상. 사용자에게 일관된 역량 분석 결과 제공 가능.",
                0.9);

        saveInterviewData(savedAssessment, "finporter",
                "프론트엔드 개발 및 금융상품 추천 로직 구현 담당.",
                "금융상품 데이터의 빈번한 변경에 대응하기 위해 캐싱 전략을 수립하고 응답 속도 최적화.",
                "[\"React\", \"금융감독원 API\", \"OpenAI API\"]",
                "API 응답 속도 개선. 사용자에게 빠른 금융상품 추천 서비스 제공.",
                0.75);

        System.out.println("✅ Admin 예시 데이터 생성 완료!");
    }

    private void saveDepthAnswer(Assessment assessment, String itemName, String question, String answer, int sequence) {
        depthAnswerRepository.save(DepthAnswer.builder()
                .assessment(assessment).itemName(itemName)
                .question(question).answer(answer).sequence(sequence).build());
    }

    private void saveInterviewData(Assessment assessment, String itemName, String role, String action, String tech, String result, double completenessScore) {
        interviewDataRepository.save(InterviewData.builder()
                .assessment(assessment)
                .itemName(itemName)
                .role(role)
                .action(action)
                .tech(tech)
                .result(result)
                .completenessScore(completenessScore)
                .build());
    }

    private static record JobGroupMeta(String groupName, String category, String description, Job.MeasureType measureType) {
        static JobGroupMeta of(String groupCode) {
            return switch (groupCode) {
                case "SW_WEB"         -> new JobGroupMeta("웹/앱 개발", "IT", "백엔드/프론트엔드 웹 및 앱 개발", Job.MeasureType.TECH_STACK);
                case "SW_AI"          -> new JobGroupMeta("AI/데이터 엔지니어링", "IT", "머신러닝, 딥러닝, 데이터 분석", Job.MeasureType.TECH_STACK);
                case "SW_SYSTEM"      -> new JobGroupMeta("시스템/임베디드/IoT", "IT", "시스템 프로그래밍, 임베디드, IoT", Job.MeasureType.TECH_STACK);
                case "SW_GAME"        -> new JobGroupMeta("게임/인터랙티브 콘텐츠", "IT", "게임 개발, VR/AR 콘텐츠 제작", Job.MeasureType.TECH_STACK);
                case "SW_SPATIAL"     -> new JobGroupMeta("공간정보/디지털트윈", "IT", "GIS, 공간데이터, 디지털트윈", Job.MeasureType.TECH_STACK);
                case "SECURITY_CLOUD" -> new JobGroupMeta("보안/클라우드/네트워크", "IT", "사이버보안, 클라우드 인프라, 네트워크", Job.MeasureType.TECH_STACK);
                case "SEMI_SW"        -> new JobGroupMeta("반도체SW/제어", "제조", "반도체 장비SW, 디지털 제어", Job.MeasureType.TECH_STACK);
                case "SEMI_PROCESS"   -> new JobGroupMeta("반도체 공정/장비", "제조", "반도체 공정, 테스트, 장비정비", Job.MeasureType.TROUBLESHOOTING);
                case "ELEC_AUTO"      -> new JobGroupMeta("전기/자동화", "제조", "전기설비, 스마트팩토리, 자동화", Job.MeasureType.TROUBLESHOOTING);
                case "MECHANIC"       -> new JobGroupMeta("기계/설계", "제조", "기계설계, CAD/CAM, 로봇", Job.MeasureType.DESIGN_INTENT);
                case "BIO_PHARMA"     -> new JobGroupMeta("바이오/의약", "바이오", "바이오의약품, AI헬스케어, 화학생명", Job.MeasureType.TROUBLESHOOTING);
                case "ARCHITECTURE"   -> new JobGroupMeta("건축/토목", "건설", "건축설계, 실내건축, 토목", Job.MeasureType.DESIGN_INTENT);
                case "AVIATION"       -> new JobGroupMeta("항공/모빌리티", "항공", "항공정비, 객실서비스, 항공경영", Job.MeasureType.DESIGN_INTENT);
                case "BUSINESS"       -> new JobGroupMeta("경영/비즈니스", "경영", "디지털마케팅, 경영정보, 핀테크", Job.MeasureType.KPI);
                case "DESIGN_MEDIA"   -> new JobGroupMeta("디자인/미디어", "디자인", "시각디자인, 미디어콘텐츠, 산업디자인", Job.MeasureType.PORTFOLIO);
                case "SERVICE_HUMAN"  -> new JobGroupMeta("서비스/인문", "서비스", "관광, 세무회계, 사회복지", Job.MeasureType.CERT_ONLY);
                default -> new JobGroupMeta(groupCode, "기타", "", Job.MeasureType.TECH_STACK);
            };
        }
    }
}
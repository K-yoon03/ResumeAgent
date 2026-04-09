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
                .credits(999999)
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
              "depthScore": 68,
              "coverage": 0.72,
              "crossBonus": 5,
              "totalScore": 73,
              "grade": "PROFESSIONER",
              "isFinal": true,
              "competencyScores": [
                {"capCode": "BE_LANG",      "name": "백엔드 프로그래밍 언어",  "score": 80, "weight": 0.20, "level": "L3", "isCore": true},
                {"capCode": "BE_FRAMEWORK", "name": "백엔드 프레임워크",       "score": 90, "weight": 0.20, "level": "L4", "isCore": true},
                {"capCode": "DB_USAGE",     "name": "데이터베이스 기본 활용",  "score": 55, "weight": 0.10, "level": "L2", "isCore": true},
                {"capCode": "API_USAGE",    "name": "REST API 연동",          "score": 75, "weight": 0.10, "level": "L3", "isCore": true},
                {"capCode": "SOFT_COLLABORATION", "name": "팀 협업",          "score": 85, "weight": 0.05, "level": "L3", "isCore": false}
              ],
              "competencyResults": [
                {"capCode": "BE_FRAMEWORK", "status": "depth"},
                {"capCode": "BE_LANG",      "status": "depth"},
                {"capCode": "SOFT_COLLABORATION", "status": "depth"}
              ],
              "strengths": ["Spring Boot 기반 실무 프로젝트 경험이 풍부함", "LLM API 연동 및 AI 서비스 개발 경험 보유"],
              "improvements": ["백엔드 프로그래밍 언어: DB 최적화 경험을 더 쌓을 필요가 있음", "REST API 연동: 공인어학성적 취득 필요"],
              "jobRanking": {"SW_WEB_BE": 0.91, "SW_WEB_API": 0.78, "SW_AI_SERVICE": 0.62},
              "experiences": ["CareerPilot", "Yolo v5 기반 스마트 방범 CCTV", "finporter"]
            }
            """;

        Assessment assessment = Assessment.builder()
                .user(admin).evaluatedJobCode("SW_WEB_BE")
                .experience("경력 및 경험: LLM 기반 역량분석 서비스 CareerPilot, Yolo v5 방범 CCTV, finporter\n자격증: SQLD\n보유 직무역량: Spring Boot, React, AWS, OpenStack, Linux\n어학: 없음")
                .analysis("{}").scoreData(scoreData).isPrimary(true).grade("PROFESSIONER")
                .capabilityVector(Map.of(
                        "BE_LANG", 0.80, "BE_FRAMEWORK", 0.90, "DB_USAGE", 0.55,
                        "API_USAGE", 0.75, "FE_FRAMEWORK", 0.60, "SOFT_COLLABORATION", 0.85
                ))
                .capabilityLevels(Map.of(
                        "BE_LANG",      Map.of("covered", true, "score", 0.80, "level", "L3"),
                        "BE_FRAMEWORK", Map.of("covered", true, "score", 0.90, "level", "L4"),
                        "DB_USAGE",     Map.of("covered", true, "score", 0.55, "level", "L2"),
                        "API_USAGE",    Map.of("covered", true, "score", 0.75, "level", "L3"),
                        "FE_FRAMEWORK", Map.of("covered", true, "score", 0.60, "level", "L2"),
                        "SOFT_COLLABORATION", Map.of("covered", true, "score", 0.85, "level", "L3"),
                        "SW_DESIGN",      Map.of("covered", false, "score", 0.0, "level", "UNKNOWN"),
                        "SW_TEST",        Map.of("covered", false, "score", 0.0, "level", "UNKNOWN"),
                        "SW_MAINTENANCE", Map.of("covered", false, "score", 0.0, "level", "UNKNOWN")
                ))
                .build();
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
                // ── SW 웹 ───────────────────────────────────────────
                case "SW_WEB_BE"   -> new JobGroupMeta("백엔드 개발", "IT", "Spring Boot, Java 기반 서버 개발", Job.MeasureType.TECH_STACK);
                case "SW_WEB_FE"   -> new JobGroupMeta("프론트엔드 개발", "IT", "React, TypeScript 기반 UI 개발", Job.MeasureType.TECH_STACK);
                case "SW_WEB_DB"   -> new JobGroupMeta("데이터베이스 엔지니어링", "IT", "DB 설계, 쿼리 최적화, DBA", Job.MeasureType.TECH_STACK);
                case "SW_WEB_API"  -> new JobGroupMeta("API/MSA 개발", "IT", "REST/GraphQL API 설계, MSA 아키텍처", Job.MeasureType.TECH_STACK);

                // ── SW AI ───────────────────────────────────────────
                case "SW_AI_MODEL"   -> new JobGroupMeta("AI/ML 모델링", "IT", "딥러닝 모델 설계 및 학습", Job.MeasureType.TECH_STACK);
                case "SW_AI_DATA"    -> new JobGroupMeta("데이터 엔지니어링", "IT", "데이터 수집, 전처리, 파이프라인 구축", Job.MeasureType.TECH_STACK);
                case "SW_AI_SERVICE" -> new JobGroupMeta("AI 서비스 개발", "IT", "AI 모델 서빙, MLOps, API 개발", Job.MeasureType.TECH_STACK);

                // ── SW 시스템 ────────────────────────────────────────
                case "SW_SYSTEM_EMBEDDED" -> new JobGroupMeta("임베디드 SW 개발", "IT", "C/C++ 임베디드, RTOS, 드라이버 개발", Job.MeasureType.TECH_STACK);
                case "SW_SYSTEM_NETWORK"  -> new JobGroupMeta("네트워크 SW 개발", "IT", "네트워크 프로토콜, 저수준 프로그래밍", Job.MeasureType.TECH_STACK);
                case "SW_SYSTEM_OS"       -> new JobGroupMeta("시스템 SW 개발", "IT", "Linux 커널, 시스템 프로그래밍", Job.MeasureType.TECH_STACK);

                // ── SW 게임 ─────────────────────────────────────────
                case "SW_GAME_CLIENT"   -> new JobGroupMeta("게임 클라이언트 개발", "IT", "Unity/Unreal 기반 게임 클라이언트", Job.MeasureType.TECH_STACK);
                case "SW_GAME_SERVER"   -> new JobGroupMeta("게임 서버 개발", "IT", "게임 서버 아키텍처, 멀티플레이어 구현", Job.MeasureType.TECH_STACK);
                case "SW_GAME_GRAPHIC"  -> new JobGroupMeta("게임 그래픽/VR", "IT", "3D 모델링, 렌더링, VR/AR 콘텐츠", Job.MeasureType.TECH_STACK);
                case "SW_GAME_PLANNING" -> new JobGroupMeta("게임 기획", "IT", "게임 시스템 설계 및 기획", Job.MeasureType.DESIGN_INTENT);

                // ── SW 공간정보 ──────────────────────────────────────
                case "SW_SPATIAL_GIS"      -> new JobGroupMeta("GIS 개발", "IT", "GIS, 공간 데이터 처리", Job.MeasureType.TECH_STACK);
                case "SW_SPATIAL_ANALYSIS" -> new JobGroupMeta("공간정보 분석", "IT", "디지털트윈, 공간 데이터 분석", Job.MeasureType.TECH_STACK);

                // ── 인프라/보안 ──────────────────────────────────────
                case "INF_CLOUD_ARCH"      -> new JobGroupMeta("클라우드 아키텍처", "IT", "클라우드 네이티브 설계, AWS/GCP", Job.MeasureType.TECH_STACK);
                case "INF_DEVOPS"          -> new JobGroupMeta("DevOps/SRE", "IT", "CI/CD, 컨테이너, 모니터링", Job.MeasureType.TECH_STACK);
                case "INF_SECURITY_APP"    -> new JobGroupMeta("웹/앱 보안", "IT", "웹 취약점 점검, 모의해킹", Job.MeasureType.TECH_STACK);
                case "INF_SECURITY_SYSTEM" -> new JobGroupMeta("시스템 보안", "IT", "시스템 보안, 악성코드 분석", Job.MeasureType.TECH_STACK);
                case "INF_SECURITY_NETWORK"-> new JobGroupMeta("네트워크 보안", "IT", "네트워크 보안, 암호학, PKI", Job.MeasureType.TECH_STACK);

                // ── 반도체 SW ────────────────────────────────────────
                case "ENG_SEMI_FW"      -> new JobGroupMeta("반도체 장비SW", "제조", "SECS/GEM, 장비 인터페이스, 펌웨어", Job.MeasureType.TECH_STACK);
                case "ENG_SEMI_CONTROL" -> new JobGroupMeta("반도체 제어SW", "제조", "PLC, RTOS, 실시간 제어 시스템", Job.MeasureType.TECH_STACK);

                // ── 반도체 공정 ──────────────────────────────────────
                case "ENG_SEMI_PROCESS" -> new JobGroupMeta("반도체 공정", "제조", "8대 공정, 클린룸, SOP, 설비 PM", Job.MeasureType.TROUBLESHOOTING);
                case "ENG_SEMI_YIELD"   -> new JobGroupMeta("반도체 수율", "제조", "수율 분석, 불량 원인 분석 및 개선", Job.MeasureType.TROUBLESHOOTING);

                // ── 전기/자동화 ──────────────────────────────────────
                case "ENG_AUTO_CONTROL" -> new JobGroupMeta("자동화 제어", "제조", "PLC 제어, 전장 설계, SCADA", Job.MeasureType.TROUBLESHOOTING);
                case "ENG_AUTO_ROBOT"   -> new JobGroupMeta("산업용 로봇", "제조", "로봇 티칭, 자동화 라인 구축", Job.MeasureType.TROUBLESHOOTING);
                case "ENG_AUTO_PROCESS" -> new JobGroupMeta("공정 최적화", "제조", "생산 공정 최적화, 스마트팩토리", Job.MeasureType.TROUBLESHOOTING);

                // ── 기계 ────────────────────────────────────────────
                case "ENG_MECH_DESIGN"      -> new JobGroupMeta("기계 설계", "제조", "CAD 기반 기구 설계 및 도면 작성", Job.MeasureType.DESIGN_INTENT);
                case "ENG_MECH_ANALYSIS"    -> new JobGroupMeta("기계 해석", "제조", "CAE 구조/유동 해석, 공차 분석", Job.MeasureType.DESIGN_INTENT);
                case "ENG_MECH_PRODUCTION"  -> new JobGroupMeta("기계 생산/품질", "제조", "CNC 가공, 품질 관리, 공정 설계", Job.MeasureType.TROUBLESHOOTING);

                // ── 바이오/제약 ──────────────────────────────────────
                case "SCI_BIO_PROCESS"  -> new JobGroupMeta("바이오 공정", "바이오", "바이오의약품 공정 개발 및 스케일업", Job.MeasureType.TROUBLESHOOTING);
                case "SCI_BIO_QC"       -> new JobGroupMeta("바이오 품질관리", "바이오", "GMP, 품질 보증, 밸리데이션", Job.MeasureType.TROUBLESHOOTING);
                case "SCI_BIO_ANALYSIS" -> new JobGroupMeta("바이오 분석", "바이오", "바이오인포매틱스, AI 신약 개발", Job.MeasureType.TECH_STACK);

                // ── 건축 ────────────────────────────────────────────
                case "ENG_ARCH_DESIGN"      -> new JobGroupMeta("건축 설계", "건설", "건축 설계 의도 도출, 공간 기획", Job.MeasureType.DESIGN_INTENT);
                case "ENG_ARCH_BIM"         -> new JobGroupMeta("BIM 설계", "건설", "BIM 기반 통합 설계 관리", Job.MeasureType.TECH_STACK);
                case "ENG_ARCH_REGULATION"  -> new JobGroupMeta("건축 인허가", "건설", "건축법, 소방법, 인허가 대응", Job.MeasureType.TROUBLESHOOTING);

                // ── 항공 ────────────────────────────────────────────
                case "ENG_AVI_MAINT"    -> new JobGroupMeta("항공 정비", "항공", "MRO, NDT, 정비 절차 수행", Job.MeasureType.TROUBLESHOOTING);
                case "ENG_AVI_QUALITY"  -> new JobGroupMeta("항공 품질/운항", "항공", "정비 품질 보증, 항공 운항 관리", Job.MeasureType.TROUBLESHOOTING);

                // ── 비즈니스 ────────────────────────────────────────
                case "BIZ_STRATEGY"  -> new JobGroupMeta("경영 전략", "경영", "신사업 기획, 비즈니스 전략 수립", Job.MeasureType.KPI);
                case "BIZ_MARKETING" -> new JobGroupMeta("디지털 마케팅", "경영", "퍼포먼스 마케팅, SEO, 데이터 분석", Job.MeasureType.KPI);
                case "BIZ_SALES"     -> new JobGroupMeta("영업/세일즈", "경영", "B2B/B2C 영업, CRM 운영", Job.MeasureType.KPI);
                case "BIZ_DATA"      -> new JobGroupMeta("비즈니스 분석", "경영", "데이터 기반 의사결정, KPI 분석", Job.MeasureType.KPI);

                default -> new JobGroupMeta(groupCode, "기타", "", Job.MeasureType.TECH_STACK);
            };
        }
    }
}
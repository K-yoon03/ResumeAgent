package com.kyoon.resumeagent.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.Competency;
import com.kyoon.resumeagent.Entity.Job;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.JobRepository;
import com.kyoon.resumeagent.repository.UserRepository;
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
    private final ObjectMapper objectMapper;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        // 1. 관리자 계정 생성
        initAdminUser();

        // 2. NCS 직무 데이터 로드
        initNcsJobsData();
    }

    /**
     * 관리자 계정 초기화
     */
    private void initAdminUser() {
        if (userRepository.findByEmail("admin@careerpilot.com").isEmpty()) {
            User admin = User.builder()
                    .email("admin@careerpilot.com")
                    .password(passwordEncoder.encode("admin1234!"))
                    .nickname("admin")
                    .name("관리자")
                    .birthDate("2000-01-01")
                    .provider("LOCAL")
                    .role("ADMIN")
                    .dailyCredits(999999)  // 🔥 관리자는 무제한
                    .usedCredits(0)
                    .lastResetDate(LocalDate.now())
                    .desiredJobText(null)
                    .mappedJobCode(null)
                    .isTemporaryJob(false)
                    .jobChangeCount(0)
                    .build();
            userRepository.save(admin);
            System.out.println("✅ Admin 계정 생성 완료: admin@careerpilot.com / admin1234!");
        } else {
            System.out.println("ℹ️ Admin 계정 이미 존재함 - 스킵");
        }
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
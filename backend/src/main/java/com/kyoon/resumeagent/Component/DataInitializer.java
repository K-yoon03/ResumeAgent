package com.kyoon.resumeagent.Component;

import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        // 관리자 계정 생성
        if (userRepository.findByEmail("admin@careerpilot.com").isEmpty()) {
            User admin = User.builder()
                    .email("admin@careerpilot.com")
                    .password(passwordEncoder.encode("admin1234!"))
                    .nickname("admin")
                    .name("관리자")
                    .birthDate("2000-01-01")
                    .provider("local")
                    .role("ADMIN")
                    .dailyCredits(999999)  // 🔥 관리자는 무제한
                    .usedCredits(0)
                    .lastResetDate(LocalDate.now())
                    .build();
            userRepository.save(admin);
            System.out.println("✅ Admin 계정 생성 완료: admin@careerpilot.com / admin1234!");
        }
    }
}
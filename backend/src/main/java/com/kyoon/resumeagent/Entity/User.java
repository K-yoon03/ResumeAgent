package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 기본 정보
    @Column(unique = true)
    private String email;           // 소셜 로그인은 null 가능

    private String password;        // 소셜 로그인은 null

    @Column(nullable = false, unique = true)
    private String nickname;        // 중복 방지, 임시 닉네임 부여

    private String name;            // 실명
    private String birthDate;

    // 소셜 로그인
    @Column(nullable = false)
    private String provider;        // LOCAL / GOOGLE / KAKAO

    private String providerId;      // 소셜 고유 ID (LOCAL은 null)

    // 선택 정보 (나중에 수집)
    private String jobCategory;     // 희망 직무
    private String interestField;   // 관심 분야

    // 서비스 운영
    @Builder.Default
    private String role = "USER";   // USER / ADMIN / PRO

    @Builder.Default
    private boolean isActive = true;

    // 🔥 크레딧 시스템
    @Column(nullable = false)
    @Builder.Default
    private Integer dailyCredits = 50; // 일일 크레딧 (매일 0시 초기화)

    @Column(nullable = false)
    @Builder.Default
    private Integer usedCredits = 0; // 오늘 사용한 크레딧

    private LocalDate lastResetDate; // 마지막 초기화 날짜

    // 타임스탬프
    private LocalDateTime lastLoginAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // 관리자 여부 확인
    public boolean isAdmin() {
        return "ADMIN".equals(role);
    }

    // 정보 업데이트
    public void updateInfo(String nickname, String name, String birthDate) {
        if (nickname != null && !nickname.isBlank()) this.nickname = nickname;
        if (name != null && !name.isBlank()) this.name = name;
        if (birthDate != null && !birthDate.isBlank()) this.birthDate = birthDate;
    }

    // 🔥 크레딧 관련 메서드

    /**
     * 크레딧 사용 가능 여부 확인
     */
    public boolean hasEnoughCredits(int required) {
        checkAndResetDailyCredits();
        return (dailyCredits - usedCredits) >= required;
    }

    /**
     * 크레딧 차감
     */
    public void useCredits(int amount) {
        checkAndResetDailyCredits();
        this.usedCredits += amount;
    }

    /**
     * 남은 크레딧 조회
     */
    public int getRemainingCredits() {
        checkAndResetDailyCredits();
        return dailyCredits - usedCredits;
    }

    /**
     * 날짜 변경 시 크레딧 초기화
     */
    private void checkAndResetDailyCredits() {
        LocalDate today = LocalDate.now();

        if (lastResetDate == null || !lastResetDate.equals(today)) {
            this.usedCredits = 0;
            this.lastResetDate = today;
        }
    }
}
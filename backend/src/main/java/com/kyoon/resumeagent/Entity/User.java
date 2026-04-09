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
    private String email;

    private String password;

    @Column(nullable = false, unique = true)
    private String nickname;

    private String name;
    private String birthDate;

    // 소셜 로그인
    @Column(nullable = false)
    private String provider;        // LOCAL / GOOGLE / KAKAO

    private String providerId;

    // 선택 정보
    private String jobCategory;
    private String interestField;

    // 서비스 운영
    @Builder.Default
    private String role = "USER";   // USER / ADMIN / PRO

    @Builder.Default
    private boolean isActive = true;

    // 💰 크레딧 시스템 (충전형)
    @Column(nullable = false)
    @Builder.Default
    private Integer credits = 10;   // 보유 크레딧 (가입 시 10 지급)

    // 타임스탬프
    private LocalDateTime lastLoginAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // 희망직무
    @Column(name = "desired_job_text", length = 200)
    private String desiredJobText;
    @Column(name = "mapped_job_code", length = 50)
    private String mappedJobCode;
    @Column(name = "is_temporary_job")
    @Builder.Default
    private Boolean isTemporaryJob = false;
    @Column(name = "job_match_type", length = 20)
    private String jobMatchType;
    @Column(name = "job_match_confidence")
    private Double jobMatchConfidence;
    @Column(name = "job_mapped_at")
    private LocalDateTime jobMappedAt;

    // 변경 제한
    @Column(name = "job_change_count")
    @Builder.Default
    private Integer jobChangeCount = 0;

    @Column(name = "last_job_change_date")
    private LocalDate lastJobChangeDate;

    // 주 역량 평가 (대시보드용)
    @ManyToOne
    @JoinColumn(name = "primary_assessment_id")
    private Assessment primaryAssessment;

    @OneToOne
    @JoinColumn(name = "primary_company_id")
    private Company primaryCompany;

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

    // 💰 크레딧 관련 메서드

    /** 크레딧 사용 가능 여부 확인 */
    public boolean hasEnoughCredits(int required) {
        return this.credits >= required;
    }

    /** 크레딧 차감 */
    public void useCredits(int amount) {
        if (this.credits < amount) {
            throw new IllegalStateException("크레딧이 부족합니다.");
        }
        this.credits -= amount;
    }

    /** 크레딧 충전 */
    public void addCredits(int amount) {
        this.credits += amount;
    }

    /** 남은 크레딧 조회 */
    public int getRemainingCredits() {
        return this.credits;
    }
}
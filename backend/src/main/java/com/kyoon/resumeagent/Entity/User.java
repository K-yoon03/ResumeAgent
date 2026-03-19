package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@EntityListeners(AuditingEntityListener.class)
@Getter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 기본 정보
    @Column(unique = true)
    private String email;           // 소셜 로그인은 null 가능

    private String password;        // 소셜 로그인은 null

    @Column(nullable = false, unique = true)
    private String nickname;        // 중복 방지, 임시 닉네임 부여
    private String name;        // 실명
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

    private LocalDateTime lastLoginAt;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.Map;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Assessment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "evaluated_job_code", length = 50)
    private String evaluatedJobCode;

    @Column(columnDefinition = "TEXT")
    private String experience;

    @Column(columnDefinition = "TEXT")
    private String analysis;

    @Column(columnDefinition = "TEXT")
    private String scoreData;

    @Builder.Default
    @Column(name = "is_primary")
    private Boolean isPrimary = false;

    // Analyzer 결과: 코드별 기본 점수
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private Map<String, Double> capabilityVector;

    // DepthInterview 결과: 코드별 레벨(L1/L2) + 검증 점수
    // 구조: { "DB_USAGE": { "level": "L2_ARCH", "score": 0.85 }, ... }
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json", nullable = true)
    private Map<String, Map<String, Object>> capabilityLevels;

    @Column(length = 20, nullable = true)
    private String grade; // "PROFESSIONER" or "TECHNICIAN"

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
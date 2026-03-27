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

    // 🔥 추가: 평가한 직무
    @Column(name = "evaluated_job_code", length = 50)
    private String evaluatedJobCode;  // CP001, TEMP_IT 등

    // 기존 필드
    @Column(columnDefinition = "TEXT")
    private String experience;

    @Column(columnDefinition = "TEXT")
    private String analysis;

    @Column(columnDefinition = "TEXT")
    private String scoreData;

    // 🔥 추가: 주 역량 여부
    @Column(name = "is_primary")
    private Boolean isPrimary = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private Map<String, Double> capabilityVector;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
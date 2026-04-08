package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "company_job_postings")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class CompanyJobPosting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "position", length = 200)
    private String position;

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    @Column(name = "parsed_data", columnDefinition = "TEXT")
    private String parsedData;

    // JD 분석 결과
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "jd_profile", columnDefinition = "json")
    private Map<String, Object> jdProfile;

    @Column(name = "analyzed_job_code", length = 50)
    private String analyzedJobCode;

    // 주 목표 공고 여부
    @Column(name = "is_primary")
    @Builder.Default
    private Boolean isPrimary = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    @Builder.Default
    private Status status = Status.ACTIVE;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Status {
        ACTIVE,
        CLOSED,
        APPLIED
    }
}
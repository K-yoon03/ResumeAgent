package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

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

    // 직무명 (예: "백엔드 개발자", "데이터 분석가")
    @Column(name = "position", length = 200)
    private String position;

    // 원본 텍스트 (매직페이스트)
    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    // 파싱된 데이터 JSON
    // {companyName, position, mainTasks, requirements, preferred, techStack, workPlace, employmentType, vision}
    @Column(name = "parsed_data", columnDefinition = "TEXT")
    private String parsedData;

    // 역량 벡터 JSON (기업분석 확장용)
    // {"BE_FRAMEWORK": 0.9, "DB": 0.7, ...}
    @Column(name = "capability_vector", columnDefinition = "TEXT")
    private String capabilityVector;

    // 공고 상태
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
        ACTIVE,  // 진행중
        CLOSED,  // 마감
        APPLIED  // 지원완료
    }
}
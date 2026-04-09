package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "capability_roadmap")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CapabilityRoadmap {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;

    @Column(name = "cap_code", length = 50, nullable = false)
    private String capCode;

    @Column(name = "current_level", length = 10)
    private String currentLevel;

    @Column(name = "target_level", length = 10)
    private String targetLevel;

    @Column(columnDefinition = "TEXT")
    private String analysis;

    @Column(name = "specific_feedback", columnDefinition = "TEXT")
    private String specificFeedback;

    // 체크리스트 항목 (직접 실행/적용 경험만)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "json")
    private List<String> roadmap;

    @Column(name = "estimated_score_up")
    private Integer estimatedScoreUp;

    // GENERATED → 체크리스트 완료 후 COMPLETED
    @Builder.Default
    @Column(length = 20)
    private String status = "GENERATED";

    // 완료 후 점수 비교
    @Column(name = "score_before")
    private Integer scoreBefore;

    @Column(name = "score_after")
    private Integer scoreAfter;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;
}
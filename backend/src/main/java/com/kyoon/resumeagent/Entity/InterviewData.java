package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "interview_data")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    // 구조화 데이터
    @Column(name = "role", columnDefinition = "TEXT")
    private String role;

    @Column(name = "action", columnDefinition = "TEXT")
    private String action;

    @Column(name = "tech", columnDefinition = "TEXT")
    private String tech; // JSON 배열로 저장 ["Spring Boot", "Redis"]

    @Column(name = "result", columnDefinition = "TEXT")
    private String result;

    // 원본 Q&A 보관
    @Column(name = "raw_qna", columnDefinition = "TEXT")
    private String rawQna; // JSON으로 저장

    @Column(columnDefinition = "TEXT")
    private String weakFields; // JSON 배열 ["action_tech", "result"]

    @Column(columnDefinition = "TEXT")
    private String weakReasons; // JSON {"action_tech": "구현 내용만...", "result": "결과 불명확..."}

    // 완성도 점수 (0.0 ~ 1.0)
    @Column(name = "completeness_score")
    private Double completenessScore;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
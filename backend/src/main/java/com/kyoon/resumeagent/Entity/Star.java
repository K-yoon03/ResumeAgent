package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stars")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Star {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id", nullable = false)
    private Assessment assessment;

    @Column(name = "item_name", nullable = false)
    private String itemName;

    @Column(name = "situation", columnDefinition = "TEXT")
    private String situation;

    @Column(name = "task", columnDefinition = "TEXT")
    private String task;

    @Column(name = "action", columnDefinition = "TEXT")
    private String action;

    @Column(name = "result", columnDefinition = "TEXT")
    private String result;

    @Column(name = "quality", columnDefinition = "TEXT")
    private String quality; // JSON {"situation":"good","task":"good",...}

    @Column(name = "completeness_score")
    private Double completenessScore;

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
}
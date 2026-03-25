package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "jobs")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String jobCode;  // CP001, CP002, ...

    @Column(name = "is_temporary")
    private Boolean isTemporary = false;

    @Column(nullable = false, length = 50)
    private String ncsLarge;  // NCS 대분류

    @Column(nullable = false, length = 50)
    private String ncsMedium;  // NCS 중분류

    @Column(nullable = false, length = 100)
    private String jobName;  // 직무명

    @Column(nullable = false, length = 50)
    private String category;  // 카테고리 (정보통신, 경영·회계·사무 등)

    @Column(length = 500)
    private String description;  // 설명

    @Column(columnDefinition = "TEXT")
    private String measurementMethod;  // 측정 방법

    @Column(length = 20)
    private String source;  // 출처 (gemini, ncs)

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Competency> competencies = new ArrayList<>();

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // 연관관계 편의 메서드
    public void addCompetency(Competency competency) {
        competencies.add(competency);
        competency.setJob(this);
    }
}
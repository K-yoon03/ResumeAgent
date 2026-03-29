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

    @Column(name = "group_code", nullable = false, unique = true, length = 50)
    private String groupCode;  // SW_WEB, SW_AI, SECURITY_CLOUD 등

    @Column(name = "group_name", nullable = false, length = 100)
    private String groupName;  // 웹/앱 개발, AI/데이터 엔지니어링 등

    @Column(nullable = false, length = 50)
    private String category;  // IT, 제조, 경영, 바이오 등 대분류

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "measure_type", nullable = false, length = 30)
    private MeasureType measureType;

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Competency> competencies = new ArrayList<>();

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    public enum MeasureType {
        TECH_STACK,      // 기술스택 추출 (SW, 보안, 클라우드)
        TROUBLESHOOTING, // 트러블슈팅 기반 (반도체공정, 전기/자동화, 바이오)
        DESIGN_INTENT,   // 설계의도 기반 (기계, 건축, 항공)
        KPI,             // 정량적 성과 기반 (경영/비즈니스)
        PORTFOLIO,       // 포트폴리오 링크 (디자인/미디어)
        CERT_ONLY        // 자격증 매칭만 (서비스/인문)
    }

    public void addCompetency(Competency competency) {
        competencies.add(competency);
        competency.setJob(this);
    }
}
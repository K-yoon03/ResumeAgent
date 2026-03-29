package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "competencies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Competency {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(name = "cap_code", nullable = false, length = 50)
    private String capCode;  // BE_LANG, PYTHON, TROUBLESHOOTING 등

    @Column(nullable = false, length = 200)
    private String name;  // 역량 한글 설명 (예: 백엔드 언어)

    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal weight;  // 가중치 (0.000 ~ 0.999)
}
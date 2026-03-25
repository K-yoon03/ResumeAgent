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

    @Column(nullable = false)
    private Integer compId;  // 역량 순서 (1, 2, 3, ...)

    @Column(nullable = false, length = 200)
    private String name;  // 역량명

    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal weight;  // 가중치 (0.000 ~ 0.999)

    @Column(length = 200)
    private String indicator;  // 지표

    @Column(length = 200)
    private String measurement;  // 측정 방법
}
package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Company {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 200)
    private String companyName;

    @Column(length = 100)
    private String industry;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(name = "is_primary")
    @Builder.Default
    private Boolean isPrimary = false;

    // 기업 규모
    @Column(name = "company_size", length = 20)
    private String companySize; // 대기업 / 중견 / 중소 / 스타트업 / 공기업

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime addedAt;
}
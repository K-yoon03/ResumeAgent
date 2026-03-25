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
    private String companyName;  // "카카오"

    @Column(length = 100)
    private String industry;  // "IT·인터넷"

    @Column(columnDefinition = "TEXT")
    private String memo;  // "백엔드 개발자 채용 공고 지원 예정"

    @Column(name = "is_primary")
    @Builder.Default
    private Boolean isPrimary = false;  // 주 희망기업 여부

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime addedAt;
}
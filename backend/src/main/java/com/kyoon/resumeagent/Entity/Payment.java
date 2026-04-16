package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true)
    private String orderId;         // 주문 ID (UUID)

    @Column
    private String paymentKey;      // 토스 paymentKey (승인 후 저장)

    @Column(nullable = false)
    private String planId;          // plan_10 / plan_50 / plan_100

    @Column(nullable = false)
    private Integer amount;         // 결제 금액 (원)

    @Column(nullable = false)
    private Integer creditsCharged; // 지급된 크레딧

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING"; // PENDING / SUCCESS / FAIL

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime confirmedAt;
}
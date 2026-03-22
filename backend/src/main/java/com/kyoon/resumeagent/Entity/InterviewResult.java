package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Entity
@Table(name = "interview_results")
@EntityListeners(AuditingEntityListener.class)
@Getter @NoArgsConstructor @AllArgsConstructor @Builder
public class InterviewResult {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String mode;          // chat / list

    @Column(columnDefinition = "TEXT")
    private String resumeContent; // 사용한 자소서 내용

    @Column(columnDefinition = "TEXT")
    private String questionsAndAnswers; // 질문+답변 전체

    @Column(columnDefinition = "TEXT")
    private String feedback;      // 최종 피드백

    private int totalQuestions;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
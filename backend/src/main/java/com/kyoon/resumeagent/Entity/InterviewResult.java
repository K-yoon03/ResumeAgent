package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "interview_results")
public class InterviewResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String sessionId; // UUID (advanced 모드 전용)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false)
    private String mode; // "chat" (기존) or "advanced" (신규)

    @Column(columnDefinition = "TEXT")
    private String resumeContent;

    @Column(columnDefinition = "TEXT")
    private String questionsAndAnswers; // chat 모드 전용

    @Column(columnDefinition = "TEXT")
    private String feedback; // chat 모드: 마지막 피드백

    @Column(columnDefinition = "TEXT")
    private String summaryFeedback; // 종합 총평

    private int totalQuestions;

    // 🔥 Advanced 모드 전용 필드
    private Integer currentIndex; // nullable
    private Boolean isCompleted; // nullable
    private Integer totalFollowUpCount; // 전체 꼬리 질문 횟수 (최대 3)

    @OneToMany(mappedBy = "interviewResult", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("questionOrder ASC")
    @Builder.Default
    private List<InterviewQuestion> questions = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    // Advanced 모드 전용 메서드
    public void moveToNext() {
        if (currentIndex != null) {
            this.currentIndex++;
            if (this.currentIndex >= this.totalQuestions) {
                this.isCompleted = true;
            }
        }
    }

    public InterviewQuestion getCurrentQuestion() {
        if (currentIndex != null && currentIndex < questions.size()) {
            return questions.get(currentIndex);
        }
        return null;
    }

    public void addQuestion(InterviewQuestion question) {
        questions.add(question);
        question.setInterviewResult(this);
        question.setQuestionOrder(questions.size() - 1);
    }

    public boolean isAdvancedMode() {
        return "advanced".equals(mode);
    }

    // 🔥 전체 꼬리 질문 제한 체크
    public boolean canAddMoreFollowUps() {
        if (totalFollowUpCount == null) totalFollowUpCount = 0;
        return totalFollowUpCount < 3; // 세션 전체 최대 3개
    }

    public void incrementFollowUpCount() {
        if (totalFollowUpCount == null) totalFollowUpCount = 0;
        totalFollowUpCount++;
    }
}
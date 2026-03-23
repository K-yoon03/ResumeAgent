package com.kyoon.resumeagent.Entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "interview_questions")
public class InterviewQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "interview_result_id")
    private InterviewResult interviewResult;

    private int questionOrder; // 질문 순서

    @Column(columnDefinition = "TEXT")
    private String questionText;

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column(columnDefinition = "TEXT")
    private String evaluation;

    private boolean needsFollowUp; // AI가 판단
    private int followUpCount; // 현재 꼬리 질문 횟수 (최대 2)

    @OneToMany(mappedBy = "parentQuestion", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("depth ASC")
    @Builder.Default
    private List<FollowUpQuestion> followUps = new ArrayList<>();

    // 꼬리 질문 추가 가능 여부
    public boolean canAddFollowUp() {
        return needsFollowUp && followUpCount < 2;
    }

    // 꼬리 질문 추가
    public void addFollowUp(FollowUpQuestion followUp) {
        followUps.add(followUp);
        followUp.setParentQuestion(this);
        followUp.setDepth(followUpCount + 1);
        this.followUpCount++;
    }

    // 마지막 꼬리 질문 가져오기
    public FollowUpQuestion getLastFollowUp() {
        if (followUps.isEmpty()) return null;
        return followUps.get(followUps.size() - 1);
    }
}
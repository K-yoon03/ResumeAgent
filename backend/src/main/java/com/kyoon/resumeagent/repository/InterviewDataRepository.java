package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.InterviewData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InterviewDataRepository extends JpaRepository<InterviewData, Long> {
    List<InterviewData> findByAssessmentIdOrderByCreatedAtAsc(Long assessmentId);
    void deleteByAssessmentId(Long assessmentId);
}
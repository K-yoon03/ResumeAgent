package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.DepthAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DepthAnswerRepository extends JpaRepository<DepthAnswer, Long> {
    List<DepthAnswer> findByAssessmentIdOrderByItemNameAscSequenceAsc(Long assessmentId);
    void deleteByAssessmentId(Long assessmentId);
}
package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.Star;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StarRepository extends JpaRepository<Star, Long> {
    List<Star> findByAssessmentIdOrderByCreatedAtAsc(Long assessmentId);
    Optional<Star> findByAssessmentIdAndItemName(Long assessmentId, String itemName);
    void deleteByAssessmentId(Long assessmentId);
}
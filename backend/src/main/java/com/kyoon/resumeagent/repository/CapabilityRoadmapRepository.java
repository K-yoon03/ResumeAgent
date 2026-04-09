package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.CapabilityRoadmap;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CapabilityRoadmapRepository extends JpaRepository<CapabilityRoadmap, Long> {
    List<CapabilityRoadmap> findByAssessmentIdOrderByCreatedAtDesc(Long assessmentId);
    Optional<CapabilityRoadmap> findByAssessmentIdAndCapCodeAndStatus(Long assessmentId, String capCode, String status);
}
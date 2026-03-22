package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByUserEmailOrderByCreatedAtDesc(String email);
    List<Project> findByAssessmentId(Long assessmentId);
    void deleteByAssessmentId(Long assessmentId);
}
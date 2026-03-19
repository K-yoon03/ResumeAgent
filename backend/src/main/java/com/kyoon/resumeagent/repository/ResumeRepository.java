package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ResumeRepository extends JpaRepository<Resume, Long> {
    List<Resume> findByUserEmailOrderByCreatedAtDesc(String email);
    List<Resume> findByAssessmentId(Long assessmentId);
    Optional<Resume> findByUserEmailAndContent(String email, String content);
}
package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {
    List<Assessment> findByUserEmailOrderByCreatedAtDesc(String email);
    List<Assessment> findByUserOrderByCreatedAtDesc(User user);
    Optional<Assessment> findByUserEmailAndExperienceAndAnalysis(String email, String experience, String analysis);
}

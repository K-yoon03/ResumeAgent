package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.InterviewResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InterviewResultRepository extends JpaRepository<InterviewResult, Long> {
    List<InterviewResult> findByUserEmailOrderByCreatedAtDesc(String email);
}
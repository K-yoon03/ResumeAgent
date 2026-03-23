package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.InterviewResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InterviewResultRepository extends JpaRepository<InterviewResult, Long> {
    List<InterviewResult> findByUserEmailOrderByCreatedAtDesc(String email);

    // 🔥 Advanced 모드 전용
    Optional<InterviewResult> findBySessionId(String sessionId);
}
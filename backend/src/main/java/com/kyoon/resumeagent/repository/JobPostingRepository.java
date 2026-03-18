package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.JobPosting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {
    List<JobPosting> findByUserEmailOrderByCreatedAtDesc(String email);
}
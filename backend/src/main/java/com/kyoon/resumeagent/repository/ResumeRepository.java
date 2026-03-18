package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ResumeRepository extends JpaRepository<Resume, Long> {
    List<Resume> findByUserEmailOrderByCreatedAtDesc(String email);
}

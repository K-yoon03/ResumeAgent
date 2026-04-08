package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.CompanyJobPosting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompanyJobPostingRepository extends JpaRepository<CompanyJobPosting, Long> {
    List<CompanyJobPosting> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
    List<CompanyJobPosting> findByCompanyUserEmailOrderByCreatedAtDesc(String email);
    Optional<CompanyJobPosting> findByCompanyUserEmailAndIsPrimaryTrue(String email);
    void deleteByCompanyId(Long companyId);
}
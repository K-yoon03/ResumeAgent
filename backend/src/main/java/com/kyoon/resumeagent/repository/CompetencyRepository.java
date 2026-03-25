package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.Competency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompetencyRepository extends JpaRepository<Competency, Long> {

    List<Competency> findByJobId(Long jobId);
}
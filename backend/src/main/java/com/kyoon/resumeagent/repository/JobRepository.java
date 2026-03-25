package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    Optional<Job> findByJobCode(String jobCode);

    List<Job> findByCategory(String category);

    @Query("SELECT DISTINCT j.category FROM Job j ORDER BY j.category")
    List<String> findAllCategories();

    boolean existsByJobCode(String jobCode);
}
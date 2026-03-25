package com.kyoon.resumeagent.repository;

import com.kyoon.resumeagent.Entity.Company;
import com.kyoon.resumeagent.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {

    List<Company> findByUserOrderByAddedAtDesc(User user);

    Optional<Company> findByIdAndUser(Long id, User user);

    Optional<Company> findByUserAndIsPrimary(User user, Boolean isPrimary);
}
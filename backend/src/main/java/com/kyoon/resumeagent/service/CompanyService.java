package com.kyoon.resumeagent.service;

import com.kyoon.resumeagent.Entity.Company;
import com.kyoon.resumeagent.Entity.CompanyJobPosting;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.CompanyJobPostingRepository;
import com.kyoon.resumeagent.repository.CompanyRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final CompanyJobPostingRepository companyJobPostingRepository;

    @Transactional
    public Company addCompany(User user, String companyName, String industry, String memo, String companySize) {
        return companyRepository.save(Company.builder()
                .user(user)
                .companyName(companyName)
                .industry(industry)
                .memo(memo)
                .companySize(companySize)
                .isPrimary(false)
                .build());
    }

    @Transactional
    public Company updateCompany(User user, Long companyId, String industry, String memo, String companySize) {
        Company company = companyRepository.findByIdAndUser(companyId, user)
                .orElseThrow(() -> new RuntimeException("Company not found"));
        company.setIndustry(industry);
        company.setMemo(memo);
        company.setCompanySize(companySize);
        return companyRepository.save(company);
    }

    @Transactional
    public void setPrimaryCompany(User user, Long companyId) {
        Company company = companyRepository.findByIdAndUser(companyId, user)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        // 기존 primary 회사 해제 + 연결된 posting isPrimary 해제
        if (user.getPrimaryCompany() != null) {
            Company oldPrimary = user.getPrimaryCompany();
            oldPrimary.setIsPrimary(false);
            companyRepository.save(oldPrimary);
            clearPrimaryPosting(user);
        }

        company.setIsPrimary(true);
        user.setPrimaryCompany(company);
        companyRepository.save(company);
        userRepository.save(user);

        // 새 primary 회사에 공고가 1개뿐이면 자동으로 primary posting 설정
        List<CompanyJobPosting> postings = companyJobPostingRepository.findByCompanyIdOrderByCreatedAtDesc(company.getId());
        if (postings.size() == 1) {
            postings.get(0).setIsPrimary(true);
            companyJobPostingRepository.save(postings.get(0));
        }
    }

    @Transactional
    public void removePrimaryCompany(User user) {
        if (user.getPrimaryCompany() != null) {
            Company oldPrimary = user.getPrimaryCompany();
            oldPrimary.setIsPrimary(false);
            companyRepository.save(oldPrimary);
            clearPrimaryPosting(user);
            user.setPrimaryCompany(null);
            userRepository.save(user);
        }
    }

    public List<Company> getMyCompanies(User user) {
        return companyRepository.findByUserOrderByAddedAtDesc(user);
    }

    @Transactional
    public void deleteCompany(User user, Long companyId) {
        Company company = companyRepository.findByIdAndUser(companyId, user)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        if (user.getPrimaryCompany() != null && user.getPrimaryCompany().getId().equals(companyId)) {
            clearPrimaryPosting(user);
            user.setPrimaryCompany(null);
            userRepository.save(user);
        }

        companyRepository.delete(company);
    }

    // primary posting 해제 헬퍼
    private void clearPrimaryPosting(User user) {
        companyJobPostingRepository.findByCompanyUserEmailAndIsPrimaryTrue(user.getEmail())
                .ifPresent(p -> {
                    p.setIsPrimary(false);
                    companyJobPostingRepository.save(p);
                });
    }
}
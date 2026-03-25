package com.kyoon.resumeagent.service;

import com.kyoon.resumeagent.Entity.Company;
import com.kyoon.resumeagent.Entity.User;
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

    /**
     * 기업 추가
     */
    @Transactional
    public Company addCompany(User user, String companyName, String industry, String memo) {
        Company company = Company.builder()
                .user(user)
                .companyName(companyName)
                .industry(industry)
                .memo(memo)
                .isPrimary(false)
                .build();

        return companyRepository.save(company);
    }

    /**
     * 주 희망기업 설정
     */
    @Transactional
    public void setPrimaryCompany(User user, Long companyId) {
        // 1. 해당 기업 확인
        Company company = companyRepository.findByIdAndUser(companyId, user)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        // 2. 이전 주 희망기업 해제
        if (user.getPrimaryCompany() != null) {
            Company oldPrimary = user.getPrimaryCompany();
            oldPrimary.setIsPrimary(false);
            companyRepository.save(oldPrimary);
        }

        // 3. 새로운 주 희망기업 설정
        company.setIsPrimary(true);
        user.setPrimaryCompany(company);

        companyRepository.save(company);
        userRepository.save(user);
    }

    /**
     * 주 희망기업 해제
     */
    @Transactional
    public void removePrimaryCompany(User user) {
        if (user.getPrimaryCompany() != null) {
            Company oldPrimary = user.getPrimaryCompany();
            oldPrimary.setIsPrimary(false);
            companyRepository.save(oldPrimary);

            user.setPrimaryCompany(null);
            userRepository.save(user);
        }
    }

    /**
     * 내 기업 목록 조회
     */
    public List<Company> getMyCompanies(User user) {
        return companyRepository.findByUserOrderByAddedAtDesc(user);
    }

    /**
     * 기업 삭제
     */
    @Transactional
    public void deleteCompany(User user, Long companyId) {
        Company company = companyRepository.findByIdAndUser(companyId, user)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        // 주 희망기업이면 User에서도 제거
        if (user.getPrimaryCompany() != null && user.getPrimaryCompany().getId().equals(companyId)) {
            user.setPrimaryCompany(null);
            userRepository.save(user);
        }

        companyRepository.delete(company);
    }
}
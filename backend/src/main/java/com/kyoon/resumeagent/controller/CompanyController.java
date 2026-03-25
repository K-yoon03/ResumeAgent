package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.Entity.Company;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.service.CompanyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    /**
     * 기업 추가
     * POST /api/companies
     */
    @PostMapping
    public ResponseEntity<CompanyResponse> addCompany(
            @AuthenticationPrincipal User user,
            @RequestBody AddCompanyRequest request) {

        Company company = companyService.addCompany(
                user,
                request.companyName(),
                request.industry(),
                request.memo()
        );

        return ResponseEntity.ok(new CompanyResponse(
                company.getId(),
                company.getCompanyName(),
                company.getIndustry(),
                company.getMemo(),
                company.getIsPrimary(),
                company.getAddedAt()
        ));
    }

    /**
     * 내 기업 목록 조회
     * GET /api/companies
     */
    @GetMapping
    public ResponseEntity<List<CompanyResponse>> getMyCompanies(
            @AuthenticationPrincipal User user) {

        List<Company> companies = companyService.getMyCompanies(user);

        List<CompanyResponse> response = companies.stream()
                .map(c -> new CompanyResponse(
                        c.getId(),
                        c.getCompanyName(),
                        c.getIndustry(),
                        c.getMemo(),
                        c.getIsPrimary(),
                        c.getAddedAt()
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    /**
     * 주 희망기업 설정
     * PUT /api/companies/{id}/primary
     */
    @PutMapping("/{id}/primary")
    public ResponseEntity<MessageResponse> setPrimaryCompany(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        try {
            companyService.setPrimaryCompany(user, id);
            return ResponseEntity.ok(new MessageResponse("주 희망기업으로 설정되었습니다."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    /**
     * 주 희망기업 해제
     * DELETE /api/companies/primary
     */
    @DeleteMapping("/primary")
    public ResponseEntity<MessageResponse> removePrimaryCompany(
            @AuthenticationPrincipal User user) {

        companyService.removePrimaryCompany(user);
        return ResponseEntity.ok(new MessageResponse("주 희망기업이 해제되었습니다."));
    }

    /**
     * 기업 삭제
     * DELETE /api/companies/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteCompany(
            @AuthenticationPrincipal User user,
            @PathVariable Long id) {

        try {
            companyService.deleteCompany(user, id);
            return ResponseEntity.ok(new MessageResponse("기업이 삭제되었습니다."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    // DTOs
    record AddCompanyRequest(
            String companyName,
            String industry,
            String memo
    ) {}

    record CompanyResponse(
            Long id,
            String companyName,
            String industry,
            String memo,
            Boolean isPrimary,
            LocalDateTime addedAt
    ) {}

    record MessageResponse(String message) {}
}
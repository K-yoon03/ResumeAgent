package com.kyoon.resumeagent.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.Company;
import com.kyoon.resumeagent.Entity.CompanyJobPosting;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.CompanyJobPostingRepository;
import com.kyoon.resumeagent.repository.CompanyRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/companies/{companyId}/postings")
@RequiredArgsConstructor
public class CompanyJobPostingController {

    private final CompanyJobPostingRepository postingRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // 공고 목록 조회
    @GetMapping
    public ResponseEntity<List<PostingResponse>> getPostings(
            @PathVariable Long companyId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails);
        Company company = getCompany(companyId, user);
        return ResponseEntity.ok(
                postingRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
                        .stream().map(p -> toResponse(p, company)).toList()
        );
    }

    // 공고 추가 (rawText만 저장, JD 분석은 /api/jd/analyze 별도 호출)
    @PostMapping
    public ResponseEntity<?> createPosting(
            @PathVariable Long companyId,
            @RequestBody CreatePostingRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = getUser(userDetails);
            Company company = getCompany(companyId, user);

            // 신규 공고가 primary 회사의 첫 공고라면 자동으로 isPrimary 설정
            boolean isPrimary = Boolean.TRUE.equals(company.getIsPrimary())
                    && postingRepository.findByCompanyIdOrderByCreatedAtDesc(companyId).isEmpty()
                    && !postingRepository.findByCompanyUserEmailAndIsPrimaryTrue(user.getEmail()).isPresent();

            CompanyJobPosting posting = CompanyJobPosting.builder()
                    .company(company)
                    .position(request.position())
                    .rawText(request.rawText())
                    .parsedData(request.parsedData())  // 추가
                    .status(CompanyJobPosting.Status.ACTIVE)
                    .isPrimary(isPrimary)
                    .build();

            return ResponseEntity.ok(toResponse(postingRepository.save(posting), company));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("공고 저장 실패: " + e.getMessage());
        }
    }

    // 주 목표 공고 설정
    @PutMapping("/{postingId}/primary")
    public ResponseEntity<?> setPrimaryPosting(
            @PathVariable Long companyId,
            @PathVariable Long postingId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails);
        Company company = getCompany(companyId, user);

        // 기존 primary 공고 해제
        postingRepository.findByCompanyUserEmailAndIsPrimaryTrue(user.getEmail())
                .ifPresent(p -> {
                    p.setIsPrimary(false);
                    postingRepository.save(p);
                });

        // 기존 primary 회사 해제
        if (user.getPrimaryCompany() != null &&
                !user.getPrimaryCompany().getId().equals(companyId)) {
            Company oldPrimary = user.getPrimaryCompany();
            oldPrimary.setIsPrimary(false);
            companyRepository.save(oldPrimary);
        }

        // 새 공고 primary 설정
        return postingRepository.findById(postingId).map(p -> {
            p.setIsPrimary(true);
            postingRepository.save(p);

            // 해당 공고의 회사도 primary로 설정
            company.setIsPrimary(true);
            user.setPrimaryCompany(company);
            companyRepository.save(company);
            userRepository.save(user);

            return ResponseEntity.ok((Object) toResponse(p, company));
        }).orElse(ResponseEntity.notFound().build());
    }

    // 주 목표 공고 해제
    @DeleteMapping("/primary")
    public ResponseEntity<?> removePrimaryPosting(
            @PathVariable Long companyId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails);
        getCompany(companyId, user);
        postingRepository.findByCompanyUserEmailAndIsPrimaryTrue(user.getEmail())
                .ifPresent(p -> {
                    p.setIsPrimary(false);
                    postingRepository.save(p);
                });
        return ResponseEntity.ok().build();
    }

    // 공고 상태 변경
    @PatchMapping("/{postingId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long companyId,
            @PathVariable Long postingId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails);
        getCompany(companyId, user);
        return postingRepository.findById(postingId).map(p -> {
            try {
                p.setStatus(CompanyJobPosting.Status.valueOf(body.get("status")));
                return ResponseEntity.ok((Object) toResponse(postingRepository.save(p), p.getCompany()));
            } catch (Exception e) {
                return ResponseEntity.badRequest().build();
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // 공고 삭제
    @DeleteMapping("/{postingId}")
    public ResponseEntity<?> deletePosting(
            @PathVariable Long companyId,
            @PathVariable Long postingId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails);
        getCompany(companyId, user);
        postingRepository.deleteById(postingId);
        return ResponseEntity.ok().build();
    }

    private User getUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Company getCompany(Long companyId, User user) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found"));
        if (!company.getUser().getId().equals(user.getId()))
            throw new RuntimeException("Forbidden");
        return company;
    }

    private PostingResponse toResponse(CompanyJobPosting p, Company company) {
        return new PostingResponse(
                p.getId(), company.getId(), company.getCompanyName(),
                p.getPosition(), p.getRawText(), p.getParsedData(),
                p.getAnalyzedJobCode(), p.getIsPrimary(),
                p.getStatus().name(),
                p.getCreatedAt() != null ? p.getCreatedAt().toString() : null
        );
    }

    record CreatePostingRequest(String rawText, String position, String parsedData) {}

    record PostingResponse(
            Long id, Long companyId, String companyName,
            String position, String rawText, String parsedData,
            String analyzedJobCode, Boolean isPrimary,
            String status, String createdAt
    ) {}
}
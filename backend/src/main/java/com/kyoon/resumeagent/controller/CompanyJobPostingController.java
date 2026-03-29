package com.kyoon.resumeagent.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.Company;
import com.kyoon.resumeagent.Entity.CompanyJobPosting;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.CompanyJobPostingRepository;
import com.kyoon.resumeagent.repository.CompanyRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import com.kyoon.resumeagent.service.AgentService;
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
    private final AgentService agentService;
    private final ObjectMapper objectMapper;

    record CreatePostingRequest(String rawText, String position) {}

    record PostingResponse(
            Long id,
            Long companyId,
            String companyName,
            String position,
            String rawText,
            String parsedData,
            String capabilityVector,
            String status,
            String createdAt
    ) {}

    // 공고 목록 조회
    @GetMapping
    public ResponseEntity<List<PostingResponse>> getPostings(
            @PathVariable Long companyId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails);
        Company company = getCompany(companyId, user);
        List<CompanyJobPosting> postings = postingRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
        return ResponseEntity.ok(postings.stream().map(p -> toResponse(p, company)).toList());
    }

    // 공고 추가 (매직페이스트 → 파싱 → 저장)
    @PostMapping
    public ResponseEntity<?> createPosting(
            @PathVariable Long companyId,
            @RequestBody CreatePostingRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User user = getUser(userDetails);
            Company company = getCompany(companyId, user);

            // AgentService로 파싱
            String parsedJson = agentService.parseJobPosting(request.rawText());

            // capabilityVector 추출
            Map<String, Double> vector = agentService.extractCapabilityVector(request.rawText());
            String vectorJson = objectMapper.writeValueAsString(vector);

            // position 자동 추출 (없으면 파싱 결과에서 가져옴)
            String position = request.position();
            if (position == null || position.isBlank()) {
                try {
                    var parsed = objectMapper.readTree(parsedJson);
                    position = parsed.has("position") ? parsed.get("position").asText() : "";
                } catch (Exception ignored) {}
            }

            CompanyJobPosting posting = CompanyJobPosting.builder()
                    .company(company)
                    .position(position)
                    .rawText(request.rawText())
                    .parsedData(parsedJson)
                    .capabilityVector(vectorJson)
                    .status(CompanyJobPosting.Status.ACTIVE)
                    .build();

            CompanyJobPosting saved = postingRepository.save(posting);
            return ResponseEntity.ok(toResponse(saved, company));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("공고 저장 실패: " + e.getMessage());
        }
    }

    // 공고 상태 변경 (ACTIVE/CLOSED/APPLIED)
    @PatchMapping("/{postingId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long companyId,
            @PathVariable Long postingId,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = getUser(userDetails);
        getCompany(companyId, user); // 권한 확인
        return postingRepository.findById(postingId).map(p -> {
            try {
                p.setStatus(CompanyJobPosting.Status.valueOf(body.get("status")));
                return ResponseEntity.ok(toResponse(postingRepository.save(p), p.getCompany()));
            } catch (Exception e) {
                return ResponseEntity.badRequest().<PostingResponse>build();
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
        if (!company.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("Forbidden");
        }
        return company;
    }

    private PostingResponse toResponse(CompanyJobPosting p, Company company) {
        return new PostingResponse(
                p.getId(), company.getId(), company.getCompanyName(),
                p.getPosition(), p.getRawText(), p.getParsedData(),
                p.getCapabilityVector(), p.getStatus().name(),
                p.getCreatedAt() != null ? p.getCreatedAt().toString() : null
        );
    }
}
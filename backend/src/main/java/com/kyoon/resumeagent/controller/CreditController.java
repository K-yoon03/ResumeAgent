package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.service.CreditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/credits")
@RequiredArgsConstructor
public class CreditController {

    private final CreditService creditService;

    // 내 크레딧 조회
    @GetMapping
    public ResponseEntity<Map<String, Integer>> getMyCredits(
            @AuthenticationPrincipal UserDetails userDetails) {
        int remaining = creditService.getCredits(userDetails.getUsername());
        return ResponseEntity.ok(Map.of("credits", remaining));
    }

    // 관리자 - 크레딧 지급
    @PostMapping("/admin/add")
    public ResponseEntity<Map<String, Object>> adminAddCredits(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AdminCreditRequest req) {

        // 관리자 권한 체크는 Security에서 처리 (아래 참고)
        int remaining = creditService.addCredits(req.email(), req.amount());
        return ResponseEntity.ok(Map.of(
                "message", req.amount() + " 크레딧 지급 완료",
                "email", req.email(),
                "remaining", remaining
        ));
    }

    // 관리자 - 크레딧 차감
    @PostMapping("/admin/deduct")
    public ResponseEntity<Map<String, Object>> adminDeductCredits(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody AdminCreditRequest req) {

        int remaining = creditService.deductCredits(req.email(), req.amount());
        return ResponseEntity.ok(Map.of(
                "message", req.amount() + " 크레딧 차감 완료",
                "email", req.email(),
                "remaining", remaining
        ));
    }

    record AdminCreditRequest(String email, int amount) {}
}
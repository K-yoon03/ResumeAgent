package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    public record PrepareRequest(String planId, int amount) {}
    public record ConfirmRequest(String paymentId) {}

    /**
     * 결제 준비 - orderId 생성
     * POST /api/payments/prepare
     */
    @PostMapping("/prepare")
    public ResponseEntity<?> prepare(
            @RequestBody PrepareRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            PaymentService.PrepareResponse response = paymentService.prepare(
                    userDetails.getUsername(),
                    request.planId(),
                    request.amount()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "결제 준비 실패"));
        }
    }

    /**
     * 결제 승인 확인 - 포트원 단건 조회 + 크레딧 지급
     * POST /api/payments/confirm
     */
    @PostMapping("/confirm")
    public ResponseEntity<?> confirm(
            @RequestBody ConfirmRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            PaymentService.ConfirmResponse response = paymentService.confirm(
                    userDetails.getUsername(),
                    request.paymentId()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "결제 승인 실패"));
        }
    }
}
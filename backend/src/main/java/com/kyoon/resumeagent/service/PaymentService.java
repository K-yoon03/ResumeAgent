package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.Payment;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.PaymentRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Value("${portone.secret-key}")
    private String portoneSecretKey;

    private static final String PORTONE_PAYMENT_URL = "https://api.portone.io/payments/";

    // 플랜별 크레딧 정의 (amount, credits, bonus)
    private static final Map<String, int[]> PLAN_MAP = Map.of(
            "plan_10",  new int[]{ 1000,  10,  0 },
            "plan_50",  new int[]{ 5000,  50,  5 },
            "plan_100", new int[]{ 10000, 100, 10 }
    );

    public record PrepareResponse(
            String orderId,
            String orderName,
            String customerName,
            String customerEmail
    ) {}

    public record ConfirmResponse(
            int chargedCredits,
            int totalCredits
    ) {}

    /**
     * 결제 준비 - orderId 생성 + Payment PENDING 저장
     */
    @Transactional
    public PrepareResponse prepare(String email, String planId, int amount) {
        int[] planInfo = PLAN_MAP.get(planId);
        if (planInfo == null) throw new IllegalArgumentException("유효하지 않은 플랜입니다.");
        if (planInfo[0] != amount) throw new IllegalArgumentException("결제 금액이 일치하지 않습니다.");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String orderId = UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        int creditsCharged = planInfo[1] + planInfo[2];

        Payment payment = Payment.builder()
                .user(user)
                .orderId(orderId)
                .planId(planId)
                .amount(amount)
                .creditsCharged(creditsCharged)
                .status("PENDING")
                .build();
        paymentRepository.save(payment);

        return new PrepareResponse(
                orderId,
                getCreditOrderName(planId),
                user.getNickname(),
                user.getEmail()
        );
    }

    /**
     * 결제 승인 확인 - 포트원 단건 조회 후 크레딧 지급
     */
    @Transactional
    public ConfirmResponse confirm(String email, String paymentId) {
        Payment payment = paymentRepository.findByOrderId(paymentId)
                .orElseThrow(() -> new RuntimeException("주문을 찾을 수 없습니다."));

        if (!"PENDING".equals(payment.getStatus())) {
            throw new IllegalStateException("이미 처리된 주문입니다.");
        }

        // 포트원 결제 단건 조회로 검증
        JsonNode paymentData = getPortonePayment(paymentId);
        String status = paymentData.has("status") ? paymentData.get("status").asText() : "";
        int paidAmount = paymentData.has("amount")
                ? paymentData.get("amount").get("total").asInt(0) : 0;

        if (!"PAID".equals(status)) {
            throw new IllegalStateException("결제가 완료되지 않았습니다.");
        }
        if (paidAmount != payment.getAmount()) {
            throw new IllegalArgumentException("결제 금액이 일치하지 않습니다.");
        }

        // 크레딧 지급
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.addCredits(payment.getCreditsCharged());
        userRepository.save(user);

        // 결제 상태 업데이트
        payment.setPaymentKey(paymentId);
        payment.setStatus("SUCCESS");
        payment.setConfirmedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        return new ConfirmResponse(payment.getCreditsCharged(), user.getCredits());
    }

    private JsonNode getPortonePayment(String paymentId) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "PortOne " + portoneSecretKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    PORTONE_PAYMENT_URL + paymentId,
                    HttpMethod.GET,
                    request,
                    String.class
            );
            return objectMapper.readTree(response.getBody());
        } catch (Exception e) {
            throw new RuntimeException("포트원 결제 조회 실패: " + e.getMessage());
        }
    }

    private String getCreditOrderName(String planId) {
        return switch (planId) {
            case "plan_10"  -> "CareerPilot 크레딧 10cr";
            case "plan_50"  -> "CareerPilot 크레딧 55cr (50+5 보너스)";
            case "plan_100" -> "CareerPilot 크레딧 110cr (100+10 보너스)";
            default -> "CareerPilot 크레딧";
        };
    }
}
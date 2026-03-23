package com.kyoon.resumeagent.Component;

import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class CreditInterceptor implements HandlerInterceptor {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil; // 🔥 추가!

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {

        System.out.println("=================================");
        System.out.println("🔥 CreditInterceptor 실행!");
        System.out.println("📍 Request URI: " + request.getRequestURI());
        System.out.println("📍 Method: " + request.getMethod());

        // 🔥 JWT에서 이메일 추출
        String authHeader = request.getHeader("Authorization");
        System.out.println("🔑 Authorization Header: " + authHeader);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("❌ Authorization 헤더 없음 - 통과");
            System.out.println("=================================");
            return true; // 토큰 없으면 통과 (Security에서 처리)
        }

        String token = authHeader.replace("Bearer ", "");
        System.out.println("🎫 Token: " + token.substring(0, Math.min(20, token.length())) + "...");

        String email = jwtUtil.extractEmail(token);
        System.out.println("📧 Email: " + email);

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            System.out.println("❌ User not found - 통과");
            System.out.println("=================================");
            return true;
        }

        System.out.println("👤 User: " + user.getEmail());
        System.out.println("👑 Admin: " + user.isAdmin());
        System.out.println("💰 Current Credits: " + user.getRemainingCredits());

        // 관리자는 무제한
        if (user.isAdmin()) {
            System.out.println("👑 관리자 - 크레딧 차감 안 함");
            System.out.println("=================================");
            return true;
        }

        // 크레딧 확인
        if (!user.hasEnoughCredits(1)) {
            System.out.println("❌ 크레딧 부족!");
            System.out.println("=================================");
            response.setStatus(429); // Too Many Requests
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"크레딧이 부족합니다. 내일 0시에 초기화됩니다.\"}");
            return false;
        }

        // 크레딧 차감
        System.out.println("💸 크레딧 차감 시작...");
        user.useCredits(1);
        userRepository.save(user);

        System.out.println("✅ 크레딧 차감 완료! 남은 크레딧: " + user.getRemainingCredits());
        System.out.println("=================================");

        return true;
    }
}
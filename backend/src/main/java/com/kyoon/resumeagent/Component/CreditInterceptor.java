package com.kyoon.resumeagent.Component;

import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class CreditInterceptor implements HandlerInterceptor {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    // 엔드포인트별 차감 크레딧 정의
    private static final Map<String, Integer> CREDIT_COSTS = Map.of(
            "/api/v1/agent/analyze",        1,  // Analyzer
            "/api/jd/analyze",              1,  // JD 분석
            "/api/jd/gap",                  1,  // Gap 분석
            "/api/resume/generate",         2,  // 자소서 생성
            "/api/interview/question",      2,  // 면접 준비
            "/api/interview/feedback",      2,
            "/api/interview/summary",       2
    );

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {

        String uri = request.getRequestURI();
        int cost = resolveCost(uri);

        // cost가 0이면 무료 (인터셉터 등록 경로지만 무료인 경우)
        if (cost == 0) return true;

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return true; // Security에서 처리
        }

        String email = jwtUtil.extractEmail(authHeader.replace("Bearer ", ""));
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) return true;

        // 관리자 무제한
        if (user.isAdmin()) return true;

        // 크레딧 부족
        if (!user.hasEnoughCredits(cost)) {
            response.setStatus(402); // Payment Required
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                    "{\"error\":\"크레딧이 부족합니다.\",\"required\":" + cost + ",\"remaining\":" + user.getRemainingCredits() + "}"
            );
            return false;
        }

        // 차감
        user.useCredits(cost);
        userRepository.save(user);

        // 남은 크레딧 헤더에 전달 (프론트에서 즉시 반영 가능)
        response.setHeader("X-Remaining-Credits", String.valueOf(user.getRemainingCredits()));

        return true;
    }

    private int resolveCost(String uri) {
        // submit-one은 패턴 매칭 필요 (/api/assessments/{id}/interview/submit-one)
        if (uri.matches("/api/assessments/\\d+/interview/submit-one")) return 1;

        return CREDIT_COSTS.entrySet().stream()
                .filter(e -> uri.startsWith(e.getKey()))
                .mapToInt(Map.Entry::getValue)
                .findFirst()
                .orElse(0);
    }
}
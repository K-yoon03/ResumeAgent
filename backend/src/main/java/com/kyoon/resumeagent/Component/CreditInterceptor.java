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

    // 고정 경로 크레딧 비용 (패턴 매칭 불필요한 것만)
    private static final Map<String, Integer> CREDIT_COSTS = Map.of(
            "/api/jd/analyze",           1,  // JD 분석
            "/api/resume/generate",      2,  // 자소서 생성
            "/api/interview/question",   2   // 모의면접 시작
    );

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {

        String uri = request.getRequestURI();
        int cost = resolveCost(uri, request.getMethod());

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
            response.setStatus(402);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                    "{\"error\":\"크레딧이 부족합니다.\",\"required\":" + cost + ",\"remaining\":" + user.getRemainingCredits() + "}"
            );
            return false;
        }

        // 차감
        user.useCredits(cost);
        userRepository.save(user);

        // 남은 크레딧 헤더에 전달
        response.setHeader("X-Remaining-Credits", String.valueOf(user.getRemainingCredits()));

        return true;
    }

    private int resolveCost(String uri, String method) {
        // 심층면접 시작 (POST만 과금)
        if (uri.matches("/api/assessments/\\d+/interview/start") && "POST".equals(method)) return 3;

        // 역량 로드맵 생성 (POST만 과금, GET 조회는 무료)
        if (uri.equals("/api/capability/roadmap") && "POST".equals(method)) return 1;

        // 자소서 평가 (POST만 과금)
        if (uri.matches("/api/resume/\\d+/evaluate") && "POST".equals(method)) return 1;

        return CREDIT_COSTS.entrySet().stream()
                .filter(e -> uri.startsWith(e.getKey()))
                .mapToInt(Map.Entry::getValue)
                .findFirst()
                .orElse(0);
    }
}
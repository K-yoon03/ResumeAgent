package com.kyoon.resumeagent.Configuration;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.TimeUnit;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RedisTemplate<String, String> redisTemplate;

    public RateLimitInterceptor(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return true; // 비로그인 유저는 통과 (다른 곳에서 막힘)
        }

        String email = auth.getName();
        String path = request.getRequestURI();

        // 엔드포인트별 제한
        int limit = getLimit(path);
        if (limit == 0) return true; // Rate Limit 없는 엔드포인트

        String key = "rate:" + email + ":" + path;
        String count = redisTemplate.opsForValue().get(key);

        if (count == null) {
            redisTemplate.opsForValue().set(key, "1", 1, TimeUnit.HOURS);
            return true;
        }

        int current = Integer.parseInt(count);
        if (current >= limit) {
            response.setStatus(429); // Too Many Requests
            response.getWriter().write("Too many requests. Please try again later.");
            return false;
        }

        redisTemplate.opsForValue().increment(key);
        return true;
    }

    private int getLimit(String path) {
        if (path.contains("/api/v1/agent/analyze")) return 20;
        if (path.contains("/api/resume/generate")) return 30;
        if (path.contains("/api/v1/interview")) return 60;
        return 0; // 제한 없음
    }
}
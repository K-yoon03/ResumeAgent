package com.kyoon.resumeagent.global;

import com.kyoon.resumeagent.Component.CreditInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final CreditInterceptor creditInterceptor;
    private final RateLimitInterceptor rateLimitInterceptor;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("*")
                .allowedHeaders("*")
                .exposedHeaders("Content-Type");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/api/**");

        registry.addInterceptor(creditInterceptor)
                .addPathPatterns(
                        "/api/v1/agent/analyze",      // 역량 분석
                        "/api/resume/generate",       // 자소서 생성
                        "/api/interview/question",    // 면접 질문
                        "/api/interview/feedback",    // 면접 피드백
                        "/api/interview/summary",     // 종합 총평
                        "/api/interview/advanced/**"  // Advanced 면접
                )
                .excludePathPatterns(
                        "/api/auth/**",               // 인증 관련
                        "/api/v1/agent/score",
                        "/api/v1/agent/parse-job-posting",
                        "/api/v1/agent/parse-job-posting-image",
                        "/api/projects/**",
                        "/api/resume",
                        "/api/resume/*",
                        "/api/interview",
                        "/api/job-postings/**"
                );
    }
}
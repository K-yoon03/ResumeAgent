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
                .exposedHeaders("Content-Type", "X-Remaining-Credits");
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/api/**");

        registry.addInterceptor(creditInterceptor)
                .addPathPatterns(
                        "/api/v1/agent/analyze",                    // Analyzer (1 credit)
                        "/api/assessments/*/interview/submit-one",  // DepthInterview 경험 1개 (1 credit)
                        "/api/jd/analyze",                          // JD 분석 (1 credit)
                        "/api/jd/gap",                              // Gap 분석 (1 credit)
                        "/api/resume/generate",                     // 자소서 생성 (2 credit)
                        "/api/interview/question",                  // 면접 준비 (2 credit)
                        "/api/interview/feedback",
                        "/api/interview/summary"
                );
    }
}
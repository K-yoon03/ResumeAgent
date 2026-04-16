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
                        "/api/assessments/*/interview/start",  // 심층면접 시작 (3 cr)
                        "/api/capability/roadmap",             // 역량 로드맵 생성 (1 cr)
                        "/api/jd/analyze",                     // JD 분석 (1 cr)
                        "/api/resume/generate",                // 자소서 생성 (2 cr)
                        "/api/resume/*/evaluate",              // 자소서 평가 (1 cr)
                        "/api/interview/question"              // 모의면접 시작 (2 cr)
                );
    }
}
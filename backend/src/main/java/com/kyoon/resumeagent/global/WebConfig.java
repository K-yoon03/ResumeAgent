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

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("*")
                .allowedHeaders("*")
                .exposedHeaders("Content-Type"); // 스트림 전용 헤더 노출
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(creditInterceptor)
                .addPathPatterns(
                        "/api/v1/agent/analyze",      // 역량 분석
                        "/api/projects/extract",      // 🔥 STAR 프로젝트 추출
                        "/api/v1/agent/parse-job-posting-image", // 🔥 이미지 파싱도 무료!
                        "/api/resume/generate",       // 자소서 생성
                        "/api/resume/*/evaluate",     // 자소서 평가
                        "/api/interview/question",    // 면접 질문
                        "/api/interview/feedback",    // 면접 피드백
                        "/api/interview/summary",     // 종합 총평
                        "/api/interview/advanced/**"  // Advanced 면접

                )
                .excludePathPatterns(
                        "/api/auth/**",               // 인증 관련
                        "/api/v1/agent/score",        // 역량 점수
                        "/api/v1/agent/parse-job-posting", // 🔥 매직페이스트
                        "/api/projects",              // 🔥 프로젝트 추가
                        "/api/projects/*/star",       // 🔥 STAR 업데이트
                        "/api/projects/assessment/**", // 🔥 프로젝트 조회
                        "/api/resume",                // 목록 조회
                        "/api/resume/*",              // 상세 조회
                        "/api/interview",             // 면접 목록
                        "/api/job-postings/**"        // 채용공고
                );
    }
}
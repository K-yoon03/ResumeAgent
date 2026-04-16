package com.kyoon.resumeagent.Configuration;

import com.kyoon.resumeagent.Component.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        // 이메일 추출 (Google/Kakao 구분)
        String email = getEmail(oAuth2User);

        System.out.println("✅ OAuth2 로그인 성공! 이메일: " + email);

        // JWT 토큰 생성
        String token = jwtUtil.generateToken(email);

        System.out.println("🎫 JWT 토큰 생성 완료");

        // 신규 유저 여부 (CustomOAuth2UserService에서 주입한 attribute)
        Boolean isNewUser = (Boolean) oAuth2User.getAttribute("isNewUser");
        boolean isNew = Boolean.TRUE.equals(isNewUser);

        // 프론트엔드로 리다이렉트 (토큰 + 신규 여부 포함)
        String targetUrl = UriComponentsBuilder.fromUriString("http://localhost:5173/oauth2/callback")
                .queryParam("token", token)
                .queryParam("isNew", isNew)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }

    private String getEmail(OAuth2User oAuth2User) {
        // Google: email 속성 직접 존재
        if (oAuth2User.getAttributes().containsKey("email")) {
            return (String) oAuth2User.getAttribute("email");
        }

        // Kakao: id 기반 임시 이메일
        Object id = oAuth2User.getAttribute("id");
        if (id != null) {
            return "kakao_" + id + "@careerpilot.local";
        }

        throw new IllegalStateException("이메일을 찾을 수 없습니다.");
    }
}
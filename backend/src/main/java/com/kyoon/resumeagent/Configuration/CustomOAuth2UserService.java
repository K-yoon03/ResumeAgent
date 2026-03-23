package com.kyoon.resumeagent.Configuration;

import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String provider = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        System.out.println("🔐 OAuth2 로그인 시도: " + provider);
        System.out.println("📦 사용자 정보: " + attributes);

        String email;
        String nickname;
        String providerId;

        if ("google".equals(provider)) {
            email = (String) attributes.get("email");
            nickname = (String) attributes.get("name");
            providerId = (String) attributes.get("sub");
        } else if ("kakao".equals(provider)) {
            providerId = attributes.get("id").toString();
            email = "kakao_" + providerId + "@careerpilot.local";

            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
            if (kakaoAccount != null) {
                Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
                nickname = profile != null ? (String) profile.get("nickname") : "카카오유저";
            } else {
                nickname = "카카오유저";
            }
        } else {
            throw new OAuth2AuthenticationException("지원하지 않는 provider: " + provider);
        }

        System.out.println("✅ 파싱 완료 - email: " + email + ", nickname: " + nickname);

        // DB에서 찾거나 생성
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    System.out.println("🆕 신규 사용자 생성: " + email);

                    // 중복 방지를 위한 유니크 닉네임 생성
                    String uniqueNickname = generateUniqueNickname(nickname);

                    User newUser = User.builder()
                            .email(email)
                            .nickname(uniqueNickname)
                            .provider(provider.toUpperCase())
                            .providerId(providerId)
                            .lastLoginAt(LocalDateTime.now())
                            .build();
                    return userRepository.save(newUser);
                });

        System.out.println("✅ 로그인 성공: " + user.getEmail());

        return oAuth2User;
    }

    private String generateUniqueNickname(String baseNickname) {
        String nickname = baseNickname;
        Random random = new Random();

        // 닉네임이 중복되면 랜덤 숫자 추가
        while (userRepository.findByNickname(nickname).isPresent()) {
            int randomNum = random.nextInt(10000); // 0~9999
            nickname = baseNickname + randomNum;
        }

        return nickname;
    }
}
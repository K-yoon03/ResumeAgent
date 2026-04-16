package com.kyoon.resumeagent.Configuration;

import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
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
        String nameAttributeKey;

        if ("google".equals(provider)) {
            email = (String) attributes.get("email");
            nickname = (String) attributes.get("name");
            providerId = (String) attributes.get("sub");
            nameAttributeKey = "sub";
        } else if ("kakao".equals(provider)) {
            providerId = attributes.get("id").toString();
            email = "kakao_" + providerId + "@careerpilot.local";
            nameAttributeKey = "id";

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

        // 신규 유저 여부 판단
        boolean isNewUser = userRepository.findByEmail(email).isEmpty();

        if (isNewUser) {
            System.out.println("🆕 신규 사용자 생성: " + email);
            String uniqueNickname = generateUniqueNickname(nickname);
            User newUser = User.builder()
                    .email(email)
                    .nickname(uniqueNickname)
                    .provider(provider.toUpperCase())
                    .providerId(providerId)
                    .lastLoginAt(LocalDateTime.now())
                    .build();
            userRepository.save(newUser);
        }

        System.out.println("✅ 로그인 처리 완료: " + email + " (신규: " + isNewUser + ")");

        // isNewUser를 attribute에 주입해서 SuccessHandler로 전달
        Map<String, Object> modifiedAttributes = new HashMap<>(attributes);
        modifiedAttributes.put("isNewUser", isNewUser);
        modifiedAttributes.put("_email", email); // kakao 대응용 통일 이메일 키

        return new DefaultOAuth2User(
                oAuth2User.getAuthorities(),
                modifiedAttributes,
                nameAttributeKey
        );
    }

    private String generateUniqueNickname(String baseNickname) {
        String nickname = baseNickname;
        Random random = new Random();
        while (userRepository.findByNickname(nickname).isPresent()) {
            int randomNum = random.nextInt(10000);
            nickname = baseNickname + randomNum;
        }
        return nickname;
    }
}
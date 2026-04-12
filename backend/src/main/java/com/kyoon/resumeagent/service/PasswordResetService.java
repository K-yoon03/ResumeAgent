package com.kyoon.resumeagent.service;

import com.kyoon.resumeagent.Entity.PasswordResetToken;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.PasswordResetTokenRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    private static final int TOKEN_EXPIRE_MINUTES = 30;

    // 비밀번호 재설정 요청 — 링크 발송
    @Transactional
    public void requestReset(String email) {
        // 가입된 이메일인지 확인 (로컬 계정만)
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("가입된 이메일이 아닙니다."));

        if (!"LOCAL".equals(user.getProvider())) {
            throw new IllegalArgumentException("소셜 로그인 계정은 비밀번호 재설정을 지원하지 않습니다.");
        }

        // 기존 토큰 삭제
        tokenRepository.deleteByEmail(email);

        // 새 토큰 생성
        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .email(email)
                .token(token)
                .expiresAt(LocalDateTime.now().plusMinutes(TOKEN_EXPIRE_MINUTES))
                .build();
        tokenRepository.save(resetToken);

        // 이메일 발송
        emailService.sendPasswordResetEmail(email, token);
    }

    // 토큰 유효성 검증
    public void validateToken(String token) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 링크입니다."));

        if (resetToken.isUsed()) {
            throw new IllegalArgumentException("이미 사용된 링크입니다.");
        }
        if (resetToken.isExpired()) {
            throw new IllegalArgumentException("만료된 링크입니다. 다시 요청해주세요.");
        }
    }

    // 비밀번호 재설정
    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 링크입니다."));

        if (resetToken.isUsed()) {
            throw new IllegalArgumentException("이미 사용된 링크입니다.");
        }
        if (resetToken.isExpired()) {
            throw new IllegalArgumentException("만료된 링크입니다. 다시 요청해주세요.");
        }

        User user = userRepository.findByEmail(resetToken.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        // 이전 비밀번호와 동일 여부 확인
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalArgumentException("이전 비밀번호와 동일한 비밀번호는 사용할 수 없습니다.");
        }

        // 비밀번호 변경
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // 토큰 사용 처리
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
    }
}
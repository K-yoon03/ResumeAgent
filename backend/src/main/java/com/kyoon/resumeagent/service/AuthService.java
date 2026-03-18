package com.kyoon.resumeagent.service;

import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.Component.JwtUtil;
import com.kyoon.resumeagent.controller.AuthController;
import com.kyoon.resumeagent.repository.UserRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository,
                       @Lazy PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthController.AuthResponse register(String email, String password, String nickname) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("이미 사용중인 이메일입니다.");
        }

        // 닉네임 미입력 시 자동 생성
        String finalNickname = (nickname != null && !nickname.isBlank())
                ? nickname
                : generateNickname();

        // 닉네임 중복 체크
        while (userRepository.existsByNickname(finalNickname)) {
            finalNickname = generateNickname();
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .nickname(finalNickname)
                .provider("LOCAL")
                .isEmailVerified(false)
                .build();

        userRepository.save(user);
        String token = jwtUtil.generateToken(email);
        return new AuthController.AuthResponse(token, finalNickname, email);
    }

    public AuthController.AuthResponse login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 이메일입니다."));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("비밀번호가 올바르지 않습니다.");
        }
        String token = jwtUtil.generateToken(email);
        return new AuthController.AuthResponse(token, user.getNickname(), email);
    }

    private String generateNickname() {
        int number = (int) (Math.random() * 99999);
        return "JobPassenger" + String.format("%05d", number);
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return org.springframework.security.core.userdetails.User
                .withUsername(email)
                .password(user.getPassword())
                .roles(user.getRole())
                .build();
    }
}
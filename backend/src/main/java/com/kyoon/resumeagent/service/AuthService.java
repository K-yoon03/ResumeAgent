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
import com.kyoon.resumeagent.DTO.UserInfoResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import java.util.concurrent.TimeUnit;

@Service
public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;

    public AuthService(UserRepository userRepository,
                       @Lazy PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       StringRedisTemplate redisTemplate) {  // 추가
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.redisTemplate = redisTemplate;  // 추가
    }


    public AuthController.AuthResponse register(String email, String password, String nickname, String name, String birthDate) {
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("이미 사용중인 이메일입니다.");
        }

        String finalNickname = (nickname != null && !nickname.isBlank())
                ? nickname
                : generateNickname();

        while (userRepository.existsByNickname(finalNickname)) {
            finalNickname = generateNickname();
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .nickname(finalNickname)
                .name(name)
                .birthDate(birthDate)
                .provider("LOCAL")
                .build();

        userRepository.save(user);
        String accessToken = jwtUtil.generateAccessToken(email);
        String refreshToken = jwtUtil.generateRefreshToken(email);
        redisTemplate.opsForValue().set(
                "refresh:" + email, refreshToken, 14, TimeUnit.DAYS
        );
        return new AuthController.AuthResponse(accessToken, refreshToken, finalNickname, email);

    }

    public AuthController.AuthResponse login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 이메일입니다."));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("비밀번호가 올바르지 않습니다.");
        }
        String accessToken = jwtUtil.generateAccessToken(email);
        String refreshToken = jwtUtil.generateRefreshToken(email);
        redisTemplate.opsForValue().set(
                "refresh:" + email, refreshToken, 14, TimeUnit.DAYS
        );
        return new AuthController.AuthResponse(accessToken, refreshToken, user.getNickname(), email);
    }
    public void logout(String email) {
        redisTemplate.delete("refresh:" + email);
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
    public AuthController.AuthResponse refresh(String refreshToken) {
        if (!jwtUtil.validateToken(refreshToken)) {
            throw new RuntimeException("유효하지 않은 Refresh Token입니다.");
        }

        String email = jwtUtil.extractEmail(refreshToken);
        String stored = redisTemplate.opsForValue().get("refresh:" + email);

        if (!refreshToken.equals(stored)) {
            throw new RuntimeException("Refresh Token이 일치하지 않습니다.");
        }

        String newAccessToken = jwtUtil.generateAccessToken(email);
        User user = userRepository.findByEmail(email).orElseThrow();
        return new AuthController.AuthResponse(newAccessToken, refreshToken, user.getNickname(), email);
    }

    public boolean isNicknameDuplicate(String nickname) {
        return userRepository.existsByNickname(nickname);
    }
    // 내 정보 조회
    public UserInfoResponse getMyInfo(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 유저입니다."));
        return new UserInfoResponse(user.getEmail(), user.getNickname(), user.getName(), user.getBirthDate());
    }

    // 내 정보 수정
    public UserInfoResponse updateMyInfo(String email, String nickname, String name, String birthDate) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 유저입니다."));

        if (nickname != null && !nickname.isBlank() && !nickname.equals(user.getNickname())) {
            if (userRepository.existsByNickname(nickname)) {
                throw new RuntimeException("이미 사용중인 닉네임입니다.");
            }
        }

        User updated = User.builder()
                .id(user.getId())
                .email(user.getEmail())
                .password(user.getPassword())
                .nickname(nickname != null && !nickname.isBlank() ? nickname : user.getNickname())
                .name(name != null && !name.isBlank() ? name : user.getName())
                .birthDate(birthDate != null && !birthDate.isBlank() ? birthDate : user.getBirthDate())
                .provider(user.getProvider())
                .providerId(user.getProviderId())
                .jobCategory(user.getJobCategory())
                .interestField(user.getInterestField())
                .role(user.getRole())
                .isActive(user.isActive())
                .lastLoginAt(user.getLastLoginAt())
                .build();

        userRepository.save(updated);
        return new UserInfoResponse(updated.getEmail(), updated.getNickname(), updated.getName(), updated.getBirthDate());
    }

    // 회원탈퇴
    public void deleteMyAccount(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 유저입니다."));
        userRepository.delete(user);
    }
}
package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.Component.JwtUtil;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.service.AuthService;
import com.kyoon.resumeagent.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import com.kyoon.resumeagent.repository.UserRepository;
import com.kyoon.resumeagent.DTO.UserInfoResponse;
import com.kyoon.resumeagent.DTO.UpdateRequest;



import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    public record RegisterRequest(
            String email,
            String password,
            String nickname,
            String name,
            String birthDate,
            String desiredJob  // 🔥 추가
    ) {}
    public record LoginRequest(String email, String password) {}
    public record AuthResponse(String token, String refreshToken, String nickname, String email) {}
    public record RefreshRequest(String refreshToken) {}  // ← 여기 같이 있어야 해요
    public record SendCodeRequest(String email) {}
    public record VerifyCodeRequest(String email, String code) {}
    public record ChangePasswordRequest(String currentPassword, String newPassword) {}

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(
                req.email(), req.password(), req.nickname(), req.name(), req.birthDate(), req.desiredJob()
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req.email(), req.password()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader("Authorization") String authHeader) {
        String email = extractEmail(authHeader);
        authService.logout(email);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/check-nickname")
    public ResponseEntity<Boolean> checkNickname(@RequestParam String nickname) {
        return ResponseEntity.ok(authService.isNicknameDuplicate(nickname));
    }
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestBody RefreshRequest req) {
        return ResponseEntity.ok(authService.refresh(req.refreshToken()));
    }

    @GetMapping("/me")
    public ResponseEntity<UserInfoResponse> getMyInfo(
            @RequestHeader("Authorization") String authHeader) {
        String email = extractEmail(authHeader);
        return ResponseEntity.ok(authService.getMyInfo(email));
    }

    @PutMapping("/me")
    public ResponseEntity<UserInfoResponse> updateMyInfo(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody UpdateRequest req) {
        String email = extractEmail(authHeader);
        return ResponseEntity.ok(authService.updateMyInfo(email, req.nickname(), req.name(), req.birthDate()));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteMyAccount(
            @RequestHeader("Authorization") String authHeader) {
        String email = extractEmail(authHeader);
        authService.deleteMyAccount(email);
        return ResponseEntity.noContent().build();
    }

    private String extractEmail(String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return jwtUtil.extractEmail(token);
    }

    @PostMapping("/send-code")
    public ResponseEntity<Void> sendCode(@RequestBody SendCodeRequest req) {
        emailService.sendVerificationCode(req.email());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/verify-code")
    public ResponseEntity<Boolean> verifyCode(@RequestBody VerifyCodeRequest req) {
        return ResponseEntity.ok(emailService.verifyCode(req.email(), req.code()));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody ChangePasswordRequest request,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String email = extractEmail(authHeader);
            authService.changePassword(email, request.currentPassword(), request.newPassword());
            return ResponseEntity.ok(Map.of("message", "비밀번호가 변경되었어요."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "비밀번호 변경 실패"));
        }
    }
}
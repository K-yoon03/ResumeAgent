package com.kyoon.resumeagent.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final StringRedisTemplate redisTemplate;

    private static final String PREFIX = "email:verify:";
    private static final long EXPIRE_MINUTES = 30;

    // 인증코드 발송
    public void sendVerificationCode(String email) {
        String code = generateCode();
        redisTemplate.opsForValue().set(
                PREFIX + email, code, EXPIRE_MINUTES, TimeUnit.MINUTES
        );

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("[CareerPilot] 이메일 인증 코드");
        message.setText(
                "안녕하세요! CareerPilot입니다.\n\n" +
                        "이메일 인증 코드: " + code + "\n\n" +
                        "코드는 30분간 유효합니다.\n" +
                        "본인이 요청하지 않았다면 이 메일을 무시해주세요."
        );
        mailSender.send(message);
    }

    // 인증코드 검증
    public boolean verifyCode(String email, String code) {
        String stored = redisTemplate.opsForValue().get(PREFIX + email);
        if (stored == null) return false;
        if (stored.equals(code)) {
            redisTemplate.delete(PREFIX + email);
            return true;
        }
        return false;
    }

    private String generateCode() {
        return String.format("%06d", new Random().nextInt(999999));
    }
}
package com.kyoon.resumeagent.service;

import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CreditService {

    private final UserRepository userRepository;

    // 잔액 조회
    public int getCredits(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 유저입니다."));
        return user.getRemainingCredits();
    }

    // 관리자 수동 지급
    @Transactional
    public int addCredits(String targetEmail, int amount) {
        if (amount <= 0) throw new IllegalArgumentException("지급량은 1 이상이어야 합니다.");

        User user = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 유저입니다."));
        user.addCredits(amount);
        userRepository.save(user);
        return user.getRemainingCredits();
    }

    // 관리자 차감 (오남용 보정용)
    @Transactional
    public int deductCredits(String targetEmail, int amount) {
        if (amount <= 0) throw new IllegalArgumentException("차감량은 1 이상이어야 합니다.");

        User user = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new RuntimeException("존재하지 않는 유저입니다."));

        if (!user.hasEnoughCredits(amount)) {
            throw new IllegalStateException("보유 크레딧보다 많이 차감할 수 없습니다.");
        }
        user.useCredits(amount);
        userRepository.save(user);
        return user.getRemainingCredits();
    }
}
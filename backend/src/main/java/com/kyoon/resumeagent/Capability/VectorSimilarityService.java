package com.kyoon.resumeagent.Capability;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VectorSimilarityService {

    // 사용자 역량 레벨 정보를 담는 record
    public record UserCapability(double score, CapabilityLevel level) {}

    // 순수 코사인 유사도 (기존 시그니처 하위 호환 유지)
    public double cosineSimilarity(
            Map<CapabilityCode, Double> a,
            Map<CapabilityCode, Double> b
    ) {
        double dot = 0, normA = 0, normB = 0;

        for (CapabilityCode code : CapabilityCode.values()) {
            double va = a.getOrDefault(code, 0.0);
            double vb = b.getOrDefault(code, 0.0);
            dot   += va * vb;
            normA += va * va;
            normB += vb * vb;
        }

        if (normA == 0 || normB == 0) return 0.0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // 고도화된 매칭 점수 계산 (UserCapability + 후처리 보너스)
    public double scoredSimilarity(
            Map<CapabilityCode, UserCapability> userVector,
            Map<CapabilityCode, CapabilityWeight> jobProfile
    ) {
        // Step 1 - 순수 코사인 유사도용 Double 맵 추출
        Map<CapabilityCode, Double> userScores = userVector.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().score()
                ));
        Map<CapabilityCode, Double> jobWeights = jobProfile.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().weight()
                ));

        double baseScore = cosineSimilarity(userScores, jobWeights);

        // Step 2 - 후처리 보너스 산정
        double totalBonus = 0.0;

        for (CapabilityCode code : CapabilityCode.values()) {
            // 자격증/어학 제외
            if (code == CapabilityCode.CERT_MATCH || code == CapabilityCode.LANGUAGE_SCORE) {
                continue;
            }

            UserCapability userCap = userVector.get(code);
            CapabilityWeight jobCap = jobProfile.get(code);

            // 양쪽 모두 존재할 때만 보너스 의미 있음
            if (userCap == null || jobCap == null) continue;
            if (userCap.score() == 0.0 || jobCap.weight() == 0.0) continue;

            // L3 이상 심화 레벨 보너스
            if (userCap.level() == CapabilityLevel.L3 || userCap.level() == CapabilityLevel.L4) {
                totalBonus += 0.1;
            }

            // isCore 보너스
            if (jobCap.isCore()) {
                totalBonus += 0.15;
            }
        }

        // Step 3 - 최종 점수
        return baseScore * (1.0 + totalBonus);
    }

    // 자격증/어학 신뢰도 점수 별도 가산
    public double certLanguageScore(Map<CapabilityCode, UserCapability> userVector) {
        double score = 0.0;

        UserCapability cert = userVector.get(CapabilityCode.CERT_MATCH);
        UserCapability lang = userVector.get(CapabilityCode.LANGUAGE_SCORE);

        if (cert != null) score += cert.score() * 0.5;  // 자격증 기여도 50%
        if (lang != null) score += lang.score() * 0.5;  // 어학 기여도 50%

        return score;
    }

    // rankJobs - scoredSimilarity 기반으로 업그레이드
    public Map<String, Double> rankJobs(Map<CapabilityCode, UserCapability> userVector) {
        return JobCapabilityProfile.JOB_PROFILES.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> scoredSimilarity(userVector, e.getValue())
                ))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (e1, e2) -> e1,
                        LinkedHashMap::new
                ));
    }
}
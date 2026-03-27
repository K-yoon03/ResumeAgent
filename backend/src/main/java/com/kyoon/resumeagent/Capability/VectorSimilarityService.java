package com.kyoon.resumeagent.Capability;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.LinkedHashMap;

@Service
public class VectorSimilarityService {

    // 사용자 vs 직무, 사용자 vs 공고 전부 이걸로
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

    // 직무 추천: 사용자 벡터 → 가장 유사한 직무 순위
    public Map<String, Double> rankJobs(Map<CapabilityCode, Double> userVector) {
        return JobCapabilityProfile.JOB_PROFILES.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> cosineSimilarity(userVector, e.getValue())
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
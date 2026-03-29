package com.kyoon.resumeagent.service.score;

import com.kyoon.resumeagent.Capability.CapabilityCode;
import com.kyoon.resumeagent.Capability.CapabilityMapping;

import java.util.List;

public class TechStackScoreCalculator implements ScoreCalculator {

    @Override
    public double calculate(CapabilityCode capCode, String status, List<String> skills, EvidenceResult evidence) {

        // empty면 0점 고정
        if ("empty".equals(status)) return 0.0;

        double score = 0.0;

        // 1. base: skills 키워드 매칭 (0.0 ~ 0.30)
        boolean hasSkill = skills.stream()
                .anyMatch(skill -> {
                    CapabilityCode mapped = CapabilityMapping.KEYWORD_MAP.get(skill);
                    return capCode.equals(mapped);
                });
        if (hasSkill) score += 0.30;
        else if ("depth".equals(status)) score += 0.15; // 명시 안했지만 depth 판정됨

        // 2. depth: 프로젝트 수 기반 (0.0 ~ 0.25)
        score += switch (evidence.projectCount()) {
            case 0 -> 0.0;
            case 1 -> 0.10;
            case 2, 3 -> 0.18;
            default -> 0.25;
        };

        // 3. evidence: DepthInterview 답변 증거 (0.0 ~ 0.45)
        if (evidence.hasRoleDescription())   score += 0.10;
        if (evidence.hasConcreteOutcome())   score += 0.15;
        if (evidence.hasTechnicalProblem())  score += 0.08;
        if (evidence.hasTroubleshooting())   score += 0.12;

        // complex는 베이스 패널티
        if ("complex".equals(status)) score *= 0.7;

        return Math.min(score, 1.0);
    }
}

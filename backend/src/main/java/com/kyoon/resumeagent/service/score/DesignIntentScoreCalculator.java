package com.kyoon.resumeagent.service.score;

import com.kyoon.resumeagent.Capability.CapabilityCode;

import java.util.List;

public class DesignIntentScoreCalculator implements ScoreCalculator {

    @Override
    public double calculate(CapabilityCode capCode, String status, List<String> skills, EvidenceResult evidence) {

        if ("empty".equals(status)) return 0.0;

        double score = 0.0;

        // 1. base
        if ("depth".equals(status)) score += 0.30;
        else if ("complex".equals(status)) score += 0.10;

        // 2. depth: 프로젝트/설계 경험 수
        score += switch (evidence.projectCount()) {
            case 0 -> 0.0;
            case 1 -> 0.10;
            case 2, 3 -> 0.18;
            default -> 0.25;
        };

        // 3. evidence: 설계의도 특화 증거
        if (evidence.hasRoleDescription())    score += 0.08;
        if (evidence.hasConcreteOutcome())    score += 0.12;
        if (evidence.hasConstraintMention())  score += 0.10;
        if (evidence.hasDesignDecision())     score += 0.15;
        if (evidence.hasRegulationMention())  score += 0.10;

        return Math.min(score, 1.0);
    }
}

package com.kyoon.resumeagent.service.score;

import com.kyoon.resumeagent.Capability.CapabilityCode;

import java.util.List;

public class TroubleshootingScoreCalculator implements ScoreCalculator {

    @Override
    public double calculate(CapabilityCode capCode, String status, List<String> skills, EvidenceResult evidence) {

        if ("empty".equals(status)) return 0.0;

        double score = 0.0;

        // 1. base: 경험 자체가 있는지 (depth 판정이면 기본 부여)
        if ("depth".equals(status)) score += 0.30;
        else if ("complex".equals(status)) score += 0.10;

        // 2. depth: 경험 수 기반
        score += switch (evidence.projectCount()) {
            case 0 -> 0.0;
            case 1 -> 0.10;
            case 2, 3 -> 0.18;
            default -> 0.25;
        };

        // 3. evidence: 트러블슈팅 특화 증거
        if (evidence.hasRoleDescription())      score += 0.08;
        if (evidence.hasConcreteOutcome())       score += 0.12;
        if (evidence.hasErrorOrDefectMention())  score += 0.10;
        if (evidence.hasTroubleshooting())       score += 0.15;
        if (evidence.hasComplianceMention())     score += 0.10;

        return Math.min(score, 1.0);
    }
}

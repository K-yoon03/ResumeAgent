package com.kyoon.resumeagent.service.score;

import com.kyoon.resumeagent.Capability.CapabilityCode;

import java.util.List;

public class CertOnlyScoreCalculator implements ScoreCalculator {

    @Override
    public double calculate(CapabilityCode capCode, String status, List<String> skills, EvidenceResult evidence) {
        // depth면 1.0, 아니면 0.0 — 이분법
        return "depth".equals(status) ? 1.0 : 0.0;
    }
}

package com.kyoon.resumeagent.service.score;

import com.kyoon.resumeagent.Entity.Job.MeasureType;

public class ScoreCalculatorFactory {

    public static ScoreCalculator get(MeasureType measureType) {
        return switch (measureType) {
            case TECH_STACK      -> new TechStackScoreCalculator();
            case TROUBLESHOOTING -> new TroubleshootingScoreCalculator();
            case DESIGN_INTENT   -> new DesignIntentScoreCalculator();
            case KPI             -> new KpiScoreCalculator();
            case PORTFOLIO, CERT_ONLY -> new CertOnlyScoreCalculator();
        };
    }
}

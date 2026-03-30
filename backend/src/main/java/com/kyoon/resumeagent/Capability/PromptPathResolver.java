package com.kyoon.resumeagent.Capability;

public class PromptPathResolver {

    public static String analyzer(String measureType) {
        return "classpath:prompts/analyzer/" + toFileName(measureType) + ".st";
    }

    public static String depth(String measureType) {
        return switch (measureType) {
            case "PORTFOLIO", "CERT_ONLY" -> null;
            default -> "classpath:prompts/depth/" + toFileName(measureType) + ".st";
        };
    }

    public static String evidence(String measureType) {
        return switch (measureType) {
            case "PORTFOLIO", "CERT_ONLY" -> null;
            default -> "classpath:prompts/evidence/" + toFileName(measureType) + ".st";
        };
    }

    // InterviewAnalyzer: 면접 Q&A 기반 코드별 L1/L2 레벨 + 점수 판정
    public static String interviewAnalyzer(String measureType) {
        return switch (measureType) {
            case "PORTFOLIO", "CERT_ONLY" -> null;
            default -> "classpath:prompts/interview_analyzer/" + toFileName(measureType) + ".st";
        };
    }

    private static String toFileName(String measureType) {
        return measureType.toLowerCase();
    }
}
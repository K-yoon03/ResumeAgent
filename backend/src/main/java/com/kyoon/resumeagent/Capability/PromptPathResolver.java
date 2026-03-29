package com.kyoon.resumeagent.Capability;

public class PromptPathResolver {

    public static String analyzer(String measureType) {
        return "classpath:prompts/analyzer/" + toFileName(measureType) + ".st";
    }

    public static String depth(String measureType) {
        return switch (measureType) {
            case "PORTFOLIO", "CERT_ONLY" -> null; // DepthInterview 없음
            default -> "classpath:prompts/depth/" + toFileName(measureType) + ".st";
        };
    }

    public static String evidence(String measureType) {
        return switch (measureType) {
            case "PORTFOLIO", "CERT_ONLY" -> null; // Evidence 없음
            default -> "classpath:prompts/evidence/" + toFileName(measureType) + ".st";
        };
    }

    private static String toFileName(String measureType) {
        return measureType.toLowerCase();
    }
}
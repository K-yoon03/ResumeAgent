package com.kyoon.resumeagent.Capability;

public class PromptPathResolver {

    public static String analyzer(String measureType) {
        return "classpath:prompts/analyzer/" + toFileName(measureType) + ".st";
    }

    // BaseInterview: jobCode 기반으로 도메인별 파일 분기
    public static String baseInterview(String jobCode) {
        String suffix = resolveInterviewDomain(jobCode);
        return "classpath:prompts/interview/BaseInterview_" + suffix + ".st";
    }

    // InterviewAnalyzer: jobCode 기반으로 BIZ 분기
    public static String interviewAnalyzer(String jobCode) {
        if (jobCode != null && jobCode.startsWith("BIZ_")) {
            return "classpath:prompts/interview/InterviewAnalyzer_BIZ.st";
        }
        return "classpath:prompts/interview/InterviewAnalyzer.st";
    }

    @Deprecated
    public static String depth(String measureType) {
        return null;
    }

    @Deprecated
    public static String evidence(String measureType) {
        return null;
    }

    private static String resolveInterviewDomain(String jobCode) {
        if (jobCode == null) return "SW";
        if (jobCode.startsWith("SW_") || jobCode.startsWith("INF_")) return "SW";
        if (jobCode.startsWith("ENG_SEMI") || jobCode.startsWith("ENG_AUTO") || jobCode.startsWith("ENG_MECH")) return "ENG";
        if (jobCode.startsWith("SCI_BIO") || jobCode.startsWith("ENG_ARCH") || jobCode.startsWith("ENG_AVI")) return "SCI";
        if (jobCode.startsWith("BIZ_")) return "BIZ";
        return "SW";
    }

    private static String toFileName(String measureType) {
        return measureType.toLowerCase();
    }
}
package com.kyoon.resumeagent.Capability;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import static com.kyoon.resumeagent.Capability.CapabilityCode.*;

public class JobCapabilityProfile {

    public static final Map<String, Map<CapabilityCode, Double>> JOB_PROFILES = Map.of(

            "BACKEND", Map.of(
                    BE_LANG, 0.2, BE_FRAMEWORK, 0.2, API_DESIGN, 0.15,
                    DB, 0.15, CS, 0.15, INFRA, 0.1, COLLAB, 0.05
            ),

            "FRONTEND", Map.of(
                    FE_LANG, 0.25, FE_FRAMEWORK, 0.25, UI, 0.2,
                    API_DESIGN, 0.1, COLLAB, 0.1, CS, 0.1
            ),

            "DEVOPS", Map.of(
                    INFRA, 0.25, CLOUD, 0.25, DEVOPS, 0.25,
                    CS, 0.1, BE_LANG, 0.05, COLLAB, 0.1
            ),

            "DATA", Map.of(
                    DATA_ANALYSIS, 0.25, ML, 0.25, MATH, 0.2,
                    BE_LANG, 0.1, DB, 0.1, COLLAB, 0.1
            )
    );
    // jobCode 기반으로 관련 역량 코드만 반환
    public static String getRelevantCodeNames(String jobCode) {
        Map<CapabilityCode, Double> profile = JOB_PROFILES.get(jobCode.toUpperCase());
        if (profile == null) return String.join(", ",
                Arrays.stream(CapabilityCode.values())
                        .map(Enum::name)
                        .toList()
        );
        return profile.keySet().stream()
                .map(Enum::name)
                .collect(Collectors.joining(", "));
    }


}
package com.kyoon.resumeagent.DTO;

import java.time.LocalDateTime;
import java.util.Map;

public record UserInfoResponse(
        String email,
        String nickname,
        String name,
        String birthDate,
        String role,
        Integer remainingCredits,
        Integer dailyCredits,
        Boolean isAdmin,

        //직무정보
        String desiredJobText,
        String mappedJobCode,
        String jobMatchType,
        Boolean isTemporaryJob,
        Double jobMatchConfidence,
        LocalDateTime jobMappedAt,

        Map<String, Double> capabilityVector,
        Long primaryAssessmentId
) {}
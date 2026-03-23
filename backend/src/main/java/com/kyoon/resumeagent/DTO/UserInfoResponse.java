package com.kyoon.resumeagent.DTO;

public record UserInfoResponse(
        String email,
        String nickname,
        String name,
        String birthDate,
        String role,
        Integer remainingCredits,
        Integer dailyCredits,
        Boolean isAdmin
) {}
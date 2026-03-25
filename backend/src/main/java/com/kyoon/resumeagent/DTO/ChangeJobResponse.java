package com.kyoon.resumeagent.DTO;

import com.kyoon.resumeagent.DTO.JobMatchResult;

public record ChangeJobResponse(
        JobMatchResult matchResult,
        int remainingChanges,  // 오늘 남은 변경 횟수
        String message
) {}
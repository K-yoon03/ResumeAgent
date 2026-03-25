package com.kyoon.resumeagent.DTO;

import java.util.List;

public record JobMatchResult(
        JobMatchType matchType,
        String jobCode,
        double confidence,
        boolean isTemporary,
        List<String> suggestions,
        String reason
) {}
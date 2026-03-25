package com.kyoon.resumeagent.DTO;

import java.math.BigDecimal;
import java.util.List;

public class JobDTOs {

    // 역량 DTO
    public record CompetencyDTO(
            Long id,
            Integer compId,
            String name,
            BigDecimal weight,
            String indicator,
            String measurement
    ) {}

    // 직무 목록 응답 (간단)
    public record JobSummaryDTO(
            Long id,
            String jobCode,
            String jobName,
            String category,
            String ncsLarge,
            String ncsMedium
    ) {}

    // 직무 상세 응답
    public record JobDetailDTO(
            Long id,
            String jobCode,
            String ncsLarge,
            String ncsMedium,
            String jobName,
            String category,
            String description,
            String measurementMethod,
            String source,
            List<CompetencyDTO> competencies
    ) {}

    // 카테고리 목록 응답
    public record CategoryDTO(
            String category,
            Long count
    ) {}
}
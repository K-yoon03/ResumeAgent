package com.kyoon.resumeagent.DTO;

import com.kyoon.resumeagent.Entity.Job.MeasureType;

import java.math.BigDecimal;
import java.util.List;

public class JobDTOs {

    public record CapabilityCodeDTO(
            Long id,
            String capCode,
            String name,
            BigDecimal weight
    ) {}

    public record JobGroupSummaryDTO(
            Long id,
            String groupCode,
            String groupName,
            String category,
            MeasureType measureType
    ) {}

    public record JobGroupDetailDTO(
            Long id,
            String groupCode,
            String groupName,
            String category,
            String description,
            MeasureType measureType,
            List<CapabilityCodeDTO> competencies
    ) {}

    public record CategoryDTO(
            String category,
            Long count
    ) {}
}
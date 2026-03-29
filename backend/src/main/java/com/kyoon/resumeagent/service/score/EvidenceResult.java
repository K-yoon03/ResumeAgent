package com.kyoon.resumeagent.service.score;

import java.util.List;

public record EvidenceResult(

        // 공통
        int projectCount,
        boolean hasConcreteOutcome,
        boolean hasRoleDescription,

        // TECH_STACK
        List<String> mentionedSkills,
        boolean hasTechnicalProblem,
        boolean hasTroubleshooting,

        // TROUBLESHOOTING
        List<String> mentionedEquipmentOrProcess,
        boolean hasErrorOrDefectMention,
        boolean hasComplianceMention,

        // DESIGN_INTENT
        List<String> mentionedToolsOrMaterials,
        boolean hasConstraintMention,
        boolean hasDesignDecision,
        boolean hasRegulationMention,

        // KPI
        List<String> mentionedTools,
        boolean hasMetricOrNumber,
        boolean hasStakeholderMention,
        boolean hasDecisionProcess
) {
    public static EvidenceResult empty() {
        return new EvidenceResult(
                0, false, false,
                List.of(), false, false,
                List.of(), false, false,
                List.of(), false, false, false,
                List.of(), false, false, false
        );
    }
}

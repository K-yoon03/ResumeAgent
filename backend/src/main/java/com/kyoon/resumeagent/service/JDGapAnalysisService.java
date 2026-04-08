package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Capability.CapabilityCode;
import com.kyoon.resumeagent.Capability.CapabilityWeight;
import com.kyoon.resumeagent.Capability.JobCapabilityProfile;
import com.kyoon.resumeagent.Capability.PromptPathResolver;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.InterviewData;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.InterviewDataRepository;
import com.kyoon.resumeagent.service.JDAnalysisService.CapabilityRequirement;
import com.kyoon.resumeagent.service.JDAnalysisService.JDProfile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class JDGapAnalysisService {

    private final AssessmentRepository assessmentRepository;
    private final InterviewDataRepository interviewDataRepository;
    private final ChatModel chatModel;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;

    private static final double CORE_WEIGHT      = 1.2;
    private static final double HIGH_LEVEL_WEIGHT = 1.3;

    // ─────────────────────────────────────────────
    // Entry point
    // ─────────────────────────────────────────────

    public GapReport analyze(Long assessmentId, JDProfile jdProfile) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found: " + assessmentId));

        Map<String, Map<String, Object>> capabilityLevels =
                assessment.getCapabilityLevels() != null
                        ? assessment.getCapabilityLevels()
                        : Collections.emptyMap();

        Set<String> coreCodes = getCoreCodesForJob(jdProfile.jobCode());
        Map<String, GapItem> gaps = computeGaps(jdProfile, capabilityLevels);
        List<RoadmapItem> roadmap = buildRoadmap(gaps, coreCodes);

        // weakReasons 수집 (assessmentId 기준 InterviewData 전체)
        Map<String, String> weakReasons = collectWeakReasons(assessmentId);

        // LLM 로드맵 생성
        List<ActionItem> actionItems = generateActionItems(jdProfile.jobCode(), gaps, weakReasons, roadmap);

        return new GapReport(jdProfile.jobCode(), gaps, roadmap, actionItems);
    }

    // ─────────────────────────────────────────────
    // Gap 계산
    // ─────────────────────────────────────────────

    private Map<String, GapItem> computeGaps(
            JDProfile jdProfile,
            Map<String, Map<String, Object>> capabilityLevels
    ) {
        Map<String, GapItem> result = new LinkedHashMap<>();

        for (Map.Entry<String, CapabilityRequirement> e : jdProfile.capabilities().entrySet()) {
            String code = e.getKey();
            CapabilityRequirement req = e.getValue();
            double requiredScore = req.score();

            double userScore;
            double userConfidence;

            if (capabilityLevels.containsKey(code)) {
                Map<String, Object> uc = capabilityLevels.get(code);
                userScore = uc.get("score") instanceof Number
                        ? ((Number) uc.get("score")).doubleValue() : 0.0;
                userConfidence = req.confidence();
            } else {
                userScore = 0.0;
                userConfidence = 0.0;
            }

            double gap = requiredScore - userScore;
            GapStatus status = classifyGap(gap);

            result.put(code, new GapItem(
                    req.requiredLevel(),
                    requiredScore,
                    userScore,
                    gap,
                    status,
                    userConfidence
            ));
        }
        return result;
    }

    private GapStatus classifyGap(double gap) {
        if (gap <= 0)    return GapStatus.MATCH;
        if (gap <= 0.15) return GapStatus.CLOSE;
        return GapStatus.GAP;
    }

    // ─────────────────────────────────────────────
    // 로드맵 우선순위
    // ─────────────────────────────────────────────

    private List<RoadmapItem> buildRoadmap(Map<String, GapItem> gaps, Set<String> coreCodes) {
        List<RoadmapItem> items = new ArrayList<>();

        for (Map.Entry<String, GapItem> e : gaps.entrySet()) {
            String code = e.getKey();
            GapItem gap = e.getValue();
            if (gap.status() == GapStatus.MATCH) continue;

            double weight = 1.0;
            if (coreCodes.contains(code))                   weight *= CORE_WEIGHT;
            if (levelNumeric(gap.requiredLevel()) >= 3)     weight *= HIGH_LEVEL_WEIGHT;

            double priority = Math.round(gap.gap() * weight * (1.0 - gap.userConfidence()) * 100.0) / 100.0;

            items.add(new RoadmapItem(
                    code,
                    priority,
                    buildReason(gap),
                    gap.requiredLevel(),
                    gap.userScore()
            ));
        }

        items.sort(Comparator.comparingDouble(RoadmapItem::priority).reversed());
        return items;
    }

    // ─────────────────────────────────────────────
    // weakReasons 수집
    // ─────────────────────────────────────────────

    private Map<String, String> collectWeakReasons(Long assessmentId) {
        List<InterviewData> dataList = interviewDataRepository
                .findByAssessmentIdOrderByCreatedAtAsc(assessmentId);

        Map<String, String> merged = new LinkedHashMap<>();
        for (InterviewData data : dataList) {
            if (data.getWeakReasons() == null || data.getWeakReasons().isBlank()) continue;
            try {
                JsonNode node = objectMapper.readTree(data.getWeakReasons());
                node.fields().forEachRemaining(e -> {
                    // 항목별로 중복되면 첫 번째 것 유지
                    merged.putIfAbsent(e.getKey(), e.getValue().asText());
                });
            } catch (Exception ex) {
                log.warn("[JDGap] weakReasons 파싱 실패: {}", data.getId());
            }
        }
        return merged;
    }

    // ─────────────────────────────────────────────
    // LLM 로드맵 생성
    // ─────────────────────────────────────────────

    private List<ActionItem> generateActionItems(
            String jobCode,
            Map<String, GapItem> gaps,
            Map<String, String> weakReasons,
            List<RoadmapItem> roadmap
    ) {
        // GAP/CLOSE 항목만 대상
        List<RoadmapItem> targets = roadmap.stream()
                .filter(r -> {
                    GapItem g = gaps.get(r.capability());
                    return g != null && g.status() != GapStatus.MATCH;
                })
                .limit(5) // 상위 5개만
                .toList();

        if (targets.isEmpty()) return Collections.emptyList();

        String gapSummary = targets.stream()
                .map(r -> {
                    GapItem g = gaps.get(r.capability());
                    String desc = getDescription(r.capability());
                    return String.format("- %s(%s): 요구 %s / 보유 %s / 상태 %s",
                            r.capability(), desc,
                            g.requiredLevel(),
                            scoreToLevel(g.userScore()),
                            g.status().name());
                })
                .collect(Collectors.joining("\n"));

        String weakReasonsSummary = weakReasons.isEmpty() ? "없음" :
                weakReasons.entrySet().stream()
                        .map(e -> "- " + e.getKey() + ": " + e.getValue())
                        .collect(Collectors.joining("\n"));

        try {
            ChatClient client = ChatClient.builder(chatModel)
                    .defaultOptions(ChatOptions.builder().temperature(0.3).maxTokens(1500).build())
                    .build();

            var prompt = new PromptTemplate(
                    resourceLoader.getResource(PromptPathResolver.jdRoadmapGenerator()))
                    .create(Map.of(
                            "jobCode", jobCode,
                            "gapSummary", gapSummary,
                            "weakReasons", weakReasonsSummary
                    ));

            String response = client.prompt(prompt).call().content();
            String clean = response.trim()
                    .replaceAll("(?s)```json\\s*", "")
                    .replaceAll("(?s)```\\s*", "")
                    .trim();

            JsonNode root = objectMapper.readTree(clean);
            List<ActionItem> result = new ArrayList<>();
            root.get("roadmap").forEach(node -> result.add(new ActionItem(
                    node.get("capability").asText(),
                    node.get("priority").asDouble(),
                    node.get("status").asText(),
                    node.get("requiredLevel").asText(),
                    node.get("currentLevel").asText(),
                    node.get("action").asText(),
                    node.get("estimatedWeeks").asInt()
            )));
            return result;

        } catch (Exception e) {
            log.error("[JDGap] 로드맵 LLM 생성 실패", e);
            return Collections.emptyList();
        }
    }

    // ─────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────

    private Set<String> getCoreCodesForJob(String jobCode) {
        Map<CapabilityCode, CapabilityWeight> profile = JobCapabilityProfile.JOB_PROFILES.get(jobCode);
        if (profile == null) return Collections.emptySet();
        return profile.entrySet().stream()
                .filter(e -> e.getValue().isCore())
                .map(e -> e.getKey().name())
                .collect(Collectors.toSet());
    }

    private String getDescription(String code) {
        try { return CapabilityCode.valueOf(code).getDescription(); }
        catch (IllegalArgumentException e) { return code; }
    }

    private int levelNumeric(String level) {
        return switch (level) {
            case "L1" -> 1; case "L2" -> 2;
            case "L3" -> 3; case "L4" -> 4;
            default -> 0;
        };
    }

    private String buildReason(GapItem gap) {
        if (gap.userScore() == 0.0) return gap.requiredLevel() + " 요구 / 미보유";
        return gap.requiredLevel() + " 요구 vs " + scoreToLevel(gap.userScore()) + " 보유";
    }

    private String scoreToLevel(double score) {
        if (score >= 0.88) return "L4";
        if (score >= 0.70) return "L3";
        if (score >= 0.45) return "L2";
        if (score > 0)     return "L1";
        return "미보유";
    }

    // ─────────────────────────────────────────────
    // Records
    // ─────────────────────────────────────────────

    public record GapReport(
            String jobCode,
            Map<String, GapItem> gaps,
            List<RoadmapItem> roadmap,
            List<ActionItem> actionItems
    ) {}

    public record GapItem(
            String requiredLevel,
            double requiredScore,
            double userScore,
            double gap,
            GapStatus status,
            double userConfidence
    ) {}

    public record RoadmapItem(
            String capability,
            double priority,
            String reason,
            String requiredLevel,
            double userScore
    ) {}

    public record ActionItem(
            String capability,
            double priority,
            String status,
            String requiredLevel,
            String currentLevel,
            String action,
            int estimatedWeeks
    ) {}

    public enum GapStatus { MATCH, CLOSE, GAP }
}
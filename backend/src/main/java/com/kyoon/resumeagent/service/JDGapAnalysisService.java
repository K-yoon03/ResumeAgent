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

        // 적합도 계산
        FitLevel fitLevel = computeFitLevel(gaps);

        // 경력/학력 플래그
        ExperienceFlag experienceFlag = computeExperienceFlag(jdProfile.requiredExperience(), assessment.getExperience());
        EducationFlag educationFlag   = computeEducationFlag(jdProfile.requiredEducation(), assessment.getExperience());

        // weakReasons 수집 (assessmentId 기준 InterviewData 전체)
        Map<String, String> weakReasons = collectWeakReasons(assessmentId);

        // LLM 로드맵 생성
        List<ActionItem> actionItems = generateActionItems(jdProfile.jobCode(), gaps, weakReasons, roadmap);

        return new GapReport(jdProfile.jobCode(), gaps, roadmap, actionItems, fitLevel, experienceFlag, educationFlag);
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

            // LLM score가 0~100으로 오는 경우 0~1로 정규화
            double requiredScore = req.score() > 1.0 ? req.score() / 100.0 : req.score();

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
            GapStatus status = userScore == 0.0 ? GapStatus.MISSING : classifyGap(gap);

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
        // GAP/CLOSE/MISSING 항목만 대상
        List<RoadmapItem> targets = roadmap.stream()
                .filter(r -> {
                    GapItem g = gaps.get(r.capability());
                    return g != null && g.status() != GapStatus.MATCH;
                })
                .limit(5)
                .toList();

        if (targets.isEmpty()) return Collections.emptyList();

        // IT 계열 여부 판단 (CLOSE 시 프로젝트 경험 vs 자격증 분기)
        boolean isItJob = jobCode.startsWith("SW_") || jobCode.startsWith("INF_");

        String gapSummary = targets.stream()
                .map(r -> {
                    GapItem g = gaps.get(r.capability());
                    String desc = getDescription(r.capability());
                    String actionHint = switch (g.status()) {
                        case MISSING -> "관련 학습 시작 또는 이력서·포트폴리오에 관련 경험 추가 권장";
                        case GAP     -> "해당 역량 심화 학습 및 개념 보강 권장";
                        case CLOSE   -> isItJob
                                ? "관련 프로젝트 경험 추가 또는 실전 적용 권장"
                                : "관련 자격증 취득 또는 실무 경험 보강 권장";
                        default      -> "";
                    };
                    return String.format("- %s(%s): 요구 %s / 보유 %s / 상태 %s / 권고방향: %s",
                            r.capability(), desc,
                            g.requiredLevel(),
                            scoreToLevel(g.userScore()),
                            g.status().name(),
                            actionHint);
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
    // 경력/학력 플래그
    // ─────────────────────────────────────────────

    private ExperienceFlag computeExperienceFlag(String requiredExperience, String experienceText) {
        if (requiredExperience == null || requiredExperience.equals("UNKNOWN") || requiredExperience.equals("ENTRY")) {
            return ExperienceFlag.OK;
        }
        boolean hasExperience = experienceText != null && experienceText.length() > 30;
        return hasExperience ? ExperienceFlag.CHECK : ExperienceFlag.WARN;
    }

    private EducationFlag computeEducationFlag(String requiredEducation, String experienceText) {
        if (requiredEducation == null || requiredEducation.equals("UNKNOWN") || requiredEducation.equals("ANY")) {
            return EducationFlag.OK;
        }
        if (experienceText == null || experienceText.isBlank()) {
            return EducationFlag.UNKNOWN;
        }
        // experience 텍스트에서 학력 키워드 추출
        String text = experienceText;
        int userLevel;
        if (text.contains("석사") || text.contains("대학원")) {
            userLevel = 4;
        } else if (text.contains("대졸") || text.contains("4년제") || text.contains("대학교") || text.contains("학사")) {
            userLevel = 3;
        } else if (text.contains("전문대") || text.contains("2년제") || text.contains("폴리텍") || text.contains("초대졸")) {
            userLevel = 2;
        } else if (text.contains("고졸") || text.contains("고등학교")) {
            userLevel = 1;
        } else {
            return EducationFlag.UNKNOWN; // 학력 정보 없음
        }

        int reqLevel = educationLevel(requiredEducation);
        if (userLevel >= reqLevel) return EducationFlag.OK;
        if (userLevel == reqLevel - 1) return EducationFlag.CHECK;
        return EducationFlag.WARN;
    }

    private int educationLevel(String edu) {
        return switch (edu) {
            case "HIGH_SCHOOL" -> 1;
            case "ASSOCIATE"   -> 2;
            case "BACHELOR"    -> 3;
            case "MASTER"      -> 4;
            default            -> 0;
        };
    }

    public enum ExperienceFlag {
        OK,    // 신입/무관 → 문제없음
        CHECK, // 경력직 요구, 경험 텍스트 있음 → 어필 필요
        WARN   // 경력직 요구, 경험 텍스트 없음 → 주의
    }

    public enum EducationFlag {
        OK,      // 학력 충족
        CHECK,   // 한 단계 부족 → 주의
        WARN,    // 두 단계 이상 부족 → 경고
        UNKNOWN  // 학력 미입력
    }

    // ─────────────────────────────────────────────
    // 적합도 계산
    // ─────────────────────────────────────────────

    private FitLevel computeFitLevel(Map<String, GapItem> gaps) {
        if (gaps.isEmpty()) return FitLevel.NORMAL;

        long total   = gaps.size();
        long match   = gaps.values().stream().filter(g -> g.status() == GapStatus.MATCH).count();
        long missing = gaps.values().stream().filter(g -> g.status() == GapStatus.MISSING).count();

        double matchRatio   = (double) match / total;
        double missingRatio = (double) missing / total;

        if (matchRatio >= 0.90)                          return FitLevel.OVER_DOWN;
        if (matchRatio >= 0.80)                          return FitLevel.DOWN;
        if (matchRatio >= 0.60)                          return FitLevel.FIT;
        if (matchRatio >= 0.40)                          return FitLevel.NORMAL;
        if (matchRatio >= 0.20 || missingRatio < 0.5)   return FitLevel.UP;
        return FitLevel.OVER_UP;
    }

    public enum FitLevel {
        OVER_UP("과도 상향", "역량 gap이 커요. 장기적인 준비가 필요해요."),
        UP("상향", "도전적인 지원이에요. 부족한 역량을 집중 보완해보세요."),
        NORMAL("소신", "약간의 준비가 필요하지만 충분히 도전할 수 있어요."),
        FIT("적합", "현재 역량과 잘 맞는 공고예요."),
        DOWN("하향", "현재 역량보다 낮은 수준의 공고예요."),
        OVER_DOWN("과도 하향", "역량 대비 요구 수준이 많이 낮아요.");

        private final String label;
        private final String description;

        FitLevel(String label, String description) {
            this.label = label;
            this.description = description;
        }

        public String getLabel() { return label; }
        public String getDescription() { return description; }
    }

    // ─────────────────────────────────────────────
    // Records
    // ─────────────────────────────────────────────

    public record GapReport(
            String jobCode,
            Map<String, GapItem> gaps,
            List<RoadmapItem> roadmap,
            List<ActionItem> actionItems,
            FitLevel fitLevel,
            ExperienceFlag experienceFlag,
            EducationFlag educationFlag
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

    public enum GapStatus { MATCH, CLOSE, GAP, MISSING }
}
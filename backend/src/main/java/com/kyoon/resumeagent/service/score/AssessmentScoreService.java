package com.kyoon.resumeagent.service.score;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Capability.CapabilityCode;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.Job;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AssessmentScoreService {

    private final AssessmentRepository assessmentRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public Assessment calculateScore(
            Assessment assessment,
            Job job,
            String evidenceJson
    ) throws Exception {

        // 1. evidence JSON 파싱
        JsonNode evidenceNode = objectMapper.readTree(evidenceJson);
        EvidenceResult evidence = parseEvidence(evidenceNode);

        // 2. Analyzer 결과에서 competencyResults 추출
        JsonNode scoreData = objectMapper.readTree(assessment.getScoreData());
        JsonNode competencyResults = scoreData.get("competencyResults");
        if (competencyResults == null || !competencyResults.isArray()) {
            throw new RuntimeException("scoreData에 competencyResults가 없습니다. Analyzer를 먼저 실행하세요.");
        }

        // 3. skills 목록 추출 (Analyzer가 뽑은 것)
        List<String> skills = new ArrayList<>();
        JsonNode skillsNode = scoreData.get("skills");
        if (skillsNode != null && skillsNode.isArray()) {
            skillsNode.forEach(s -> skills.add(s.asText()));
        }

        // 4. ScoreCalculator 선택
        ScoreCalculator calculator = ScoreCalculatorFactory.get(job.getMeasureType());

        // 5. 역량 코드별 점수 계산
        Map<CapabilityCode, Double> capVector = new LinkedHashMap<>();
        List<Map<String, Object>> detailedScores = new ArrayList<>();
        double totalScore = 0.0;

        Map<CapabilityCode, Double> weights = job.getMeasureType() == Job.MeasureType.TECH_STACK
                ? getWeightsFromProfile(job.getGroupCode())
                : getWeightsFromProfile(job.getGroupCode());

        for (JsonNode compResult : competencyResults) {
            String capCodeStr = compResult.has("capCode") ? compResult.get("capCode").asText() : "";
            String status = compResult.get("status").asText();
            String name = compResult.get("name").asText();

            CapabilityCode capCode;
            try {
                capCode = CapabilityCode.valueOf(capCodeStr);
            } catch (IllegalArgumentException e) {
                continue; // 알 수 없는 코드 스킵
            }

            double score = calculator.calculate(capCode, status, skills, evidence);
            double weight = weights.getOrDefault(capCode, 0.0);
            double scoreScaled = Math.round(score * 100.0) / 1.0;  // 70.0
            double contribution = Math.round(scoreScaled * weight * 10.0) / 10.0;  // 14.0
            totalScore += score * weight;

            capVector.put(capCode, score);

            Map<String, Object> detail = new HashMap<>();
            detail.put("capCode", capCodeStr);
            detail.put("name", name);
            detail.put("score", (int) scoreScaled);
            detail.put("weight", weight);
            detail.put("contribution", contribution);  // 0.7 * 0.2 = 0.14 ← 0~1 스케일
            detail.put("status", status);
            detailedScores.add(detail);
        }

        // 6. 결과 저장
        Map<String, Object> newScoreData = new HashMap<>();
        newScoreData.put("totalScore", (int) Math.round(totalScore * 100));
        newScoreData.put("competencyScores", detailedScores);
        newScoreData.put("isFinal", true);
        newScoreData.put("experiences", scoreData.get("experiences"));
        newScoreData.put("competencyResults", competencyResults);

        // strengths/improvements가 있으면 포함
        if (evidenceNode.has("strengths")) newScoreData.put("strengths", evidenceNode.get("strengths"));
        if (evidenceNode.has("improvements")) newScoreData.put("improvements", evidenceNode.get("improvements"));

        assessment.setScoreData(objectMapper.writeValueAsString(newScoreData));
        assessment.setCapabilityVector(toStringMap(capVector));

        return assessmentRepository.save(assessment);
    }

    private EvidenceResult parseEvidence(JsonNode node) {
        return new EvidenceResult(
                getInt(node, "projectCount"),
                getBool(node, "hasConcreteOutcome"),
                getBool(node, "hasRoleDescription"),
                getStringList(node, "mentionedSkills"),
                getBool(node, "hasTechnicalProblem"),
                getBool(node, "hasTroubleshooting"),
                getStringList(node, "mentionedEquipmentOrProcess"),
                getBool(node, "hasErrorOrDefectMention"),
                getBool(node, "hasComplianceMention"),
                getStringList(node, "mentionedToolsOrMaterials"),
                getBool(node, "hasConstraintMention"),
                getBool(node, "hasDesignDecision"),
                getBool(node, "hasRegulationMention"),
                getStringList(node, "mentionedTools"),
                getBool(node, "hasMetricOrNumber"),
                getBool(node, "hasStakeholderMention"),
                getBool(node, "hasDecisionProcess")
        );
    }

    private Map<CapabilityCode, Double> getWeightsFromProfile(String groupCode) {
        // 1. 프로필에서 해당 직군 코드의 Map<CapabilityCode, CapabilityWeight>를 꺼냅니다.
        var profileMap = com.kyoon.resumeagent.Capability.JobCapabilityProfile.JOB_PROFILES.get(groupCode);

        // 2. 만약 해당 직군이 없으면 빈 맵 반환
        if (profileMap == null) {
            return java.util.Collections.emptyMap(); // 또는 Map.of()
        }

        // 3. CapabilityWeight 객체에서 weight() 숫자 값만 추출하여 Map<CapabilityCode, Double>로 변환해서 던져줌!
        return profileMap.entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(
                        java.util.Map.Entry::getKey,
                        e -> e.getValue().weight()
                ));
    }

    private Map<String, Double> toStringMap(Map<CapabilityCode, Double> map) {
        Map<String, Double> result = new LinkedHashMap<>();
        map.forEach((k, v) -> result.put(k.name(), v));
        return result;
    }

    private int getInt(JsonNode node, String field) {
        return node.has(field) ? node.get(field).asInt(0) : 0;
    }

    private boolean getBool(JsonNode node, String field) {
        return node.has(field) && node.get(field).asBoolean(false);
    }

    private List<String> getStringList(JsonNode node, String field) {
        List<String> list = new ArrayList<>();
        if (node.has(field) && node.get(field).isArray()) {
            node.get(field).forEach(n -> list.add(n.asText()));
        }
        return list;
    }
}
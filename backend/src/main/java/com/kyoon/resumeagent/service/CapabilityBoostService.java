package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Capability.CapabilityCode;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.CapabilityRoadmap;
import com.kyoon.resumeagent.Entity.InterviewData;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.CapabilityRoadmapRepository;
import com.kyoon.resumeagent.repository.InterviewDataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.*;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CapabilityBoostService {

    private final DataSource dataSource;
    private final ObjectMapper objectMapper;
    private final AssessmentRepository assessmentRepository;
    private final InterviewDataRepository interviewDataRepository;
    private final CapabilityRoadmapRepository roadmapRepository;
    private final ChatModel chatModel;

    /**
     * 하드코딩 힌트 — DB 앵커 기반, 무료
     * 현재 레벨 → 다음 레벨 summary + criteria[0] 반환
     */
    public HintResponse getHint(String capCode, String currentLevel) {
        boolean isNone = "NONE".equals(currentLevel) || currentLevel == null || currentLevel.isBlank();

        try (Connection conn = dataSource.getConnection()) {
            PreparedStatement ps = conn.prepareStatement(
                    "SELECT anchors, description FROM capability_anchors WHERE capability_code = ?"
            );
            ps.setString(1, capCode);
            ResultSet rs = ps.executeQuery();

            if (!rs.next()) return fallbackHint(capCode, isNone ? "NONE" : currentLevel);

            JsonNode anchors = objectMapper.readTree(rs.getString("anchors"));
            String description = rs.getString("description");

            // 미보유: L1 기준 설명 제공
            if (isNone) {
                JsonNode l1Node = anchors.get("L1");
                String l1Summary = l1Node != null && l1Node.has("summary") ? l1Node.get("summary").asText() : "";
                List<String> criteria = new ArrayList<>();
                if (l1Node != null && l1Node.has("criteria") && l1Node.get("criteria").isArray()) {
                    l1Node.get("criteria").forEach(c -> criteria.add(c.asText()));
                }
                return new HintResponse(capCode, description, "NONE", "L1",
                        "아직 확인되지 않은 역량이에요. L1 달성하려면: " + l1Summary, criteria);
            }

            String nextLevel = nextLevel(currentLevel);
            if (nextLevel == null) {
                return new HintResponse(capCode, description, currentLevel, null,
                        "최고 수준에 도달했어요! 이 역량을 팀에 전파하고 표준을 만들어보세요.", List.of());
            }

            JsonNode nextNode = anchors.get(nextLevel);
            if (nextNode == null) return fallbackHint(capCode, currentLevel);

            String summary = nextNode.has("summary") ? nextNode.get("summary").asText() : "";
            List<String> criteria = new ArrayList<>();
            if (nextNode.has("criteria") && nextNode.get("criteria").isArray()) {
                nextNode.get("criteria").forEach(c -> criteria.add(c.asText()));
            }

            return new HintResponse(capCode, description, currentLevel, nextLevel,
                    nextLevel + " 달성하려면: " + summary, criteria);

        } catch (Exception e) {
            System.err.println("[CapabilityBoostService] hint 조회 실패: " + e.getMessage());
            return fallbackHint(capCode, isNone ? "NONE" : currentLevel);
        }
    }

    /**
     * 기존 로드맵 조회 — 있으면 RoadmapResponse로 변환
     */
    public Optional<RoadmapResponse> getExistingRoadmap(Long assessmentId, String capCode) {
        return roadmapRepository
                .findByAssessmentIdAndCapCodeAndStatus(assessmentId, capCode, "GENERATED")
                .map(r -> new RoadmapResponse(
                        r.getCapCode(),
                        getCapDescription(r.getCapCode()),
                        r.getCurrentLevel(),
                        r.getTargetLevel(),
                        r.getAnalysis(),
                        r.getSpecificFeedback(),
                        r.getRoadmap(),
                        r.getEstimatedScoreUp() != null ? r.getEstimatedScoreUp() : 0,
                        r.getId()
                ));
    }

    private String getCapDescription(String capCode) {
        try { return CapabilityCode.valueOf(capCode).getDescription(); }
        catch (IllegalArgumentException e) { return capCode; }
    }

    /**
     * 맞춤 로드맵 — LLM 생성, 크레딧 소모
     * assessmentId 기반으로 사용자 경험 데이터 + 앵커 주입
     */
    public RoadmapResponse generateRoadmap(Long assessmentId, String capCode, String currentLevel) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        // 앵커 조회
        String anchorsText = "";
        String capDescription = capCode;
        try (Connection conn = dataSource.getConnection()) {
            PreparedStatement ps = conn.prepareStatement(
                    "SELECT anchors, description FROM capability_anchors WHERE capability_code = ?"
            );
            ps.setString(1, capCode);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                capDescription = rs.getString("description");
                JsonNode anchors = objectMapper.readTree(rs.getString("anchors"));
                StringBuilder sb = new StringBuilder();
                List.of("L1","L2","L3","L4").forEach(lv -> {
                    JsonNode node = anchors.get(lv);
                    if (node != null && node.has("criteria")) {
                        sb.append(lv).append(": ");
                        if (node.has("summary")) sb.append(node.get("summary").asText());
                        sb.append("\n");
                        node.get("criteria").forEach(c -> sb.append("  - ").append(c.asText()).append("\n"));
                    }
                });
                anchorsText = sb.toString();
            }
        }

        // 사용자 경험 요약 추출
        String experience = assessment.getExperience() != null ? assessment.getExperience() : "";

        // InterviewData에서 실제 Q&A 추출 (약한 역량과 관련된 내용 우선)
        List<InterviewData> interviewDataList =
                interviewDataRepository.findByAssessmentIdOrderByCreatedAtAsc(assessmentId);

        StringBuilder qnaBuilder = new StringBuilder();
        for (InterviewData d : interviewDataList) {
            if (d.getRawQna() == null) continue;
            qnaBuilder.append(String.format("[%s]\n", d.getItemName()));
            try {
                JsonNode qnaNode = objectMapper.readTree(d.getRawQna());
                if (qnaNode.isArray()) {
                    for (JsonNode qa : qnaNode) {
                        qnaBuilder.append("Q: ").append(qa.has("question") ? qa.get("question").asText() : "").append("\n");
                        qnaBuilder.append("A: ").append(qa.has("answer") ? qa.get("answer").asText() : "").append("\n");
                    }
                }
            } catch (Exception ignored) {}
            qnaBuilder.append("\n");
        }
        String qnaText = qnaBuilder.toString();
        // 미보유 역량은 L1부터 시작
        String effectiveCurrentLevel = "NONE".equals(currentLevel) ? null : currentLevel;
        String nextLevel = nextLevel(effectiveCurrentLevel != null ? effectiveCurrentLevel : "NONE");

        String systemPrompt = String.format("""
            당신은 취업 준비생의 역량 코치입니다.
            반드시 아래 Q&A에 등장하는 실제 프로젝트명, 기술명, 상황을 구체적으로 언급하세요.
            
            [절대 금지 - 로드맵 항목에 포함하면 안 되는 내용]
            - 강의 수강, 책 읽기, 스터디 참여, 튜토리얼 따라하기 등 수동적 학습 행위
            - "공부하기", "학습하기", "알아보기", "찾아보기" 등 막연한 표현
            - Q&A에 없는 프로젝트나 기술 언급
            
            [반드시 포함해야 하는 내용]
            - Q&A에 등장한 실제 프로젝트에서 직접 구현/적용/개선한 행동
            - "~을 적용했다", "~를 개선했다", "~를 설계했다", "~를 구현했다" 형태의 완료형 문장
            - 구체적인 기술명과 상황 명시
            
            반드시 JSON만 반환하세요. 마크다운 없이 순수 JSON만.
            
            형식:
            {
              "analysis": "Q&A의 실제 프로젝트명을 언급하며 현재 상태 분석 (2문장)",
              "specificFeedback": "Q&A에서 발견한 구체적 개선 포인트 (어떤 프로젝트에서 무엇이 부족했는지)",
              "roadmap": [
                "Q&A 기반 직접 실행 항목 1 (완료형 문장)",
                "Q&A 기반 직접 실행 항목 2 (완료형 문장)",
                "Q&A 기반 직접 실행 항목 3 (완료형 문장)"
              ],
              "estimatedScoreUp": 숫자(1~15 사이 정수),
              "targetLevel": "%s"
            }
            """, nextLevel != null ? nextLevel : "L4");

        String userPrompt = String.format("""
            역량: %s (%s)
            현재 레벨: %s → 목표 레벨: %s
            
            [레벨 기준]
            %s
            
            [사용자 경험 요약]
            %s
            
            [심층 인터뷰 Q&A (반드시 이 내용 기반으로만 분석할 것)]
            %s
            """,
                capDescription, capCode,
                currentLevel, nextLevel != null ? nextLevel : "L4 유지",
                anchorsText,
                experience.length() > 300 ? experience.substring(0, 300) + "..." : experience,
                qnaText.length() > 800 ? qnaText.substring(0, 800) + "..." : qnaText
        );

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).maxTokens(800).build())
                .build();

        String response = client.prompt()
                .system(systemPrompt)
                .user(userPrompt)
                .call().content();

        String clean = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();
        JsonNode result = objectMapper.readTree(clean);

        RoadmapResponse roadmapResponse = new RoadmapResponse(
                capCode, capDescription, currentLevel,
                nextLevel != null ? nextLevel : "L4",
                result.has("analysis") ? result.get("analysis").asText() : "",
                result.has("specificFeedback") ? result.get("specificFeedback").asText() : "",
                result.has("roadmap") ? objectMapper.convertValue(result.get("roadmap"), List.class) : List.of(),
                result.has("estimatedScoreUp") ? result.get("estimatedScoreUp").asInt(5) : 5,
                null
        );

        // DB 저장 (기존 GENERATED 상태 있으면 덮어쓰기)
        CapabilityRoadmap existing = roadmapRepository
                .findByAssessmentIdAndCapCodeAndStatus(assessmentId, capCode, "GENERATED")
                .orElse(null);

        CapabilityRoadmap entity = existing != null ? existing : CapabilityRoadmap.builder()
                .assessment(assessment)
                .capCode(capCode)
                .build();

        entity.setCurrentLevel(currentLevel);
        entity.setTargetLevel(roadmapResponse.targetLevel());
        entity.setAnalysis(roadmapResponse.analysis());
        entity.setSpecificFeedback(roadmapResponse.specificFeedback());
        entity.setRoadmap(roadmapResponse.roadmap());
        entity.setEstimatedScoreUp(roadmapResponse.estimatedScoreUp());
        entity.setStatus("GENERATED");

        CapabilityRoadmap saved = roadmapRepository.save(entity);

        return new RoadmapResponse(
                roadmapResponse.capCode(), roadmapResponse.description(),
                roadmapResponse.currentLevel(), roadmapResponse.targetLevel(),
                roadmapResponse.analysis(), roadmapResponse.specificFeedback(),
                roadmapResponse.roadmap(), roadmapResponse.estimatedScoreUp(),
                saved.getId()
        );
    }

    /**
     * 경험 추가 재분석 — 해당 역량 코드 하나만 업데이트 (전체 재계산 없음)
     */
    @org.springframework.transaction.annotation.Transactional
    public CompleteResponse analyzeNewExperience(Long assessmentId, String capCode,
                                                 String experienceText,
                                                 InterviewOrchestratorService orchestratorService,
                                                 DepthInterviewService depthInterviewService) throws Exception {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        JsonNode prevScoreData = objectMapper.readTree(assessment.getScoreData());
        int scoreBefore = prevScoreData.has("totalScore") ? prevScoreData.get("totalScore").asInt() : 0;

        // experience 필드에 새 내용 append
        String existing = assessment.getExperience() != null ? assessment.getExperience() : "";
        assessment.setExperience(existing + "\n\n[추가 경험 - " + capCode + "]\n" + experienceText);
        assessmentRepository.save(assessment);

        List<Map<String, String>> qna = List.of(
                Map.of("question", "이 경험에 대해 구체적으로 설명해주세요.", "answer", experienceText)
        );
        String qnaJson = objectMapper.writeValueAsString(qna);

        // InterviewData 저장
        orchestratorService.analyzeAndSave(assessmentId, "[경험 추가] " + capCode, qnaJson, capCode);

        // 해당 역량 하나만 업데이트 (전체 재계산 없음)
        int scoreAfter = depthInterviewService.updateSingleCapability(assessmentId, capCode, qnaJson);

        boolean improved = scoreAfter > scoreBefore;
        String message = improved
                ? "+" + (scoreAfter - scoreBefore) + "점 상승했어요! 역량이 반영되었습니다."
                : "이미 해당 역량이 충분히 반영되어 있어요. 점수는 유지됩니다.";

        return new CompleteResponse(null, scoreBefore, scoreAfter, improved, message);
    }

    /**
     * 체크리스트 완료 처리
     * 체크된 항목 기반 가상 Q&A 생성 → analyzeAndSave 주입 → 점수 비교
     */
    @org.springframework.transaction.annotation.Transactional
    public CompleteResponse completeRoadmap(Long roadmapId, List<Integer> checkedIndexes,
                                            InterviewOrchestratorService orchestratorService,
                                            DepthInterviewService depthInterviewService) throws Exception {
        CapabilityRoadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new RuntimeException("Roadmap not found"));

        Assessment assessment = roadmap.getAssessment();
        Long assessmentId = assessment.getId();

        // 이전 점수 저장
        JsonNode prevScoreData = objectMapper.readTree(assessment.getScoreData());
        int scoreBefore = prevScoreData.has("totalScore") ? prevScoreData.get("totalScore").asInt() : 0;

        // 체크된 항목만 추출
        List<String> checkedItems = new ArrayList<>();
        List<String> allItems = roadmap.getRoadmap();
        for (int idx : checkedIndexes) {
            if (idx >= 0 && idx < allItems.size()) {
                checkedItems.add(allItems.get(idx));
            }
        }

        if (checkedItems.isEmpty()) {
            return new CompleteResponse(roadmapId, scoreBefore, scoreBefore, false, "체크된 항목이 없어요.");
        }

        // 체크된 항목 기반 가상 Q&A 생성
        String virtualQna = buildVirtualQna(roadmap.getCapCode(), roadmap.getCurrentLevel(),
                roadmap.getTargetLevel(), checkedItems);

        // analyzeAndSave 주입
        orchestratorService.analyzeAndSave(assessmentId, "[역량 보완] " + roadmap.getCapCode(), virtualQna, roadmap.getCapCode());

        // 해당 역량 하나만 업데이트 (전체 재계산 없음)
        int scoreAfter = depthInterviewService.updateSingleCapability(
                assessmentId, roadmap.getCapCode(), virtualQna);

        boolean improved = scoreAfter > scoreBefore;

        // 로드맵 완료 처리
        roadmap.setStatus("COMPLETED");
        roadmap.setScoreBefore(scoreBefore);
        roadmap.setScoreAfter(scoreAfter);
        roadmap.setCompletedAt(java.time.LocalDateTime.now());
        roadmapRepository.save(roadmap);

        String message = improved
                ? "+" + (scoreAfter - scoreBefore) + "점 상승했어요! 역량이 향상되었습니다."
                : "이미 해당 역량이 충분히 반영되어 있어요. 점수는 유지됩니다.";

        return new CompleteResponse(roadmapId, scoreBefore, scoreAfter, improved, message);
    }

    /**
     * 체크된 항목 기반 가상 Q&A JSON 생성
     * 수동적 학습 아닌 직접 실행 경험 기준으로 작성
     */
    private String buildVirtualQna(String capCode, String currentLevel, String targetLevel, List<String> checkedItems) throws Exception {
        List<Map<String, String>> qna = new ArrayList<>();
        for (String item : checkedItems) {
            qna.add(Map.of(
                    "question", "이 경험에 대해 구체적으로 설명해주세요.",
                    "answer", item
            ));
        }
        return objectMapper.writeValueAsString(qna);
    }

    private String nextLevel(String current) {
        if (current == null || "NONE".equals(current)) return "L1";
        return switch (current) {
            case "L1" -> "L2";
            case "L2" -> "L3";
            case "L3" -> "L4";
            default -> null;
        };
    }

    private HintResponse fallbackHint(String capCode, String currentLevel) {
        boolean isNone = "NONE".equals(currentLevel);
        String desc;
        try { desc = CapabilityCode.valueOf(capCode).getDescription(); }
        catch (IllegalArgumentException e) { desc = capCode; }

        if (isNone) {
            return new HintResponse(capCode, desc, "NONE", "L1",
                    "아직 확인되지 않은 역량이에요. 관련 경험을 추가해보세요.", List.of());
        }
        String next = nextLevel(currentLevel);
        return new HintResponse(capCode, desc, currentLevel, next,
                next != null ? next + " 레벨 달성을 위한 심화 경험을 쌓아보세요." : "최고 수준에 도달했어요!",
                List.of());
    }

    // ── DTOs ──
    public record HintResponse(
            String capCode,
            String description,
            String currentLevel,
            String nextLevel,
            String hint,
            List<String> criteria
    ) {}

    public record RoadmapResponse(
            String capCode,
            String description,
            String currentLevel,
            String targetLevel,
            String analysis,
            String specificFeedback,
            List<String> roadmap,
            int estimatedScoreUp,
            Long roadmapId
    ) {}

    public record CompleteResponse(
            Long roadmapId,
            int scoreBefore,
            int scoreAfter,
            boolean improved,
            String message
    ) {}
}
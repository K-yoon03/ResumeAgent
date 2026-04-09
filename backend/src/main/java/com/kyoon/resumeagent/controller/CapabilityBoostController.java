package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.service.CapabilityBoostService;
import com.kyoon.resumeagent.service.DepthInterviewService;
import com.kyoon.resumeagent.service.InterviewOrchestratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/capability")
@RequiredArgsConstructor
public class CapabilityBoostController {

    private final CapabilityBoostService boostService;
    private final InterviewOrchestratorService orchestratorService;
    private final DepthInterviewService depthInterviewService;

    // 무료 힌트 조회
    @GetMapping("/hint")
    public ResponseEntity<?> getHint(
            @RequestParam String capCode,
            @RequestParam String currentLevel,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            return ResponseEntity.ok(boostService.getHint(capCode, currentLevel));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    // 기존 로드맵 조회 (있으면 반환, 없으면 404)
    @GetMapping("/roadmap")
    public ResponseEntity<?> getExistingRoadmap(
            @RequestParam Long assessmentId,
            @RequestParam String capCode,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            return boostService.getExistingRoadmap(assessmentId, capCode)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    // 유료 맞춤 로드맵 생성 + DB 저장
    @PostMapping("/roadmap")
    public ResponseEntity<?> generateRoadmap(
            @RequestBody RoadmapRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            return ResponseEntity.ok(
                    boostService.generateRoadmap(req.assessmentId(), req.capCode(), req.currentLevel())
            );
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    // 체크리스트 완료 → 점수 반영
    @PostMapping("/roadmap/{roadmapId}/complete")
    public ResponseEntity<?> completeRoadmap(
            @PathVariable Long roadmapId,
            @RequestBody CompleteRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            return ResponseEntity.ok(
                    boostService.completeRoadmap(roadmapId, req.checkedIndexes(),
                            orchestratorService, depthInterviewService)
            );
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    // 경험 추가 재분석
    @PostMapping("/analyze-experience")
    public ResponseEntity<?> analyzeExperience(
            @RequestBody ExperienceRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            return ResponseEntity.ok(
                    boostService.analyzeNewExperience(
                            req.assessmentId(), req.capCode(), req.experienceText(),
                            orchestratorService, depthInterviewService)
            );
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    record RoadmapRequest(Long assessmentId, String capCode, String currentLevel) {}
    record CompleteRequest(List<Integer> checkedIndexes) {}
    record ExperienceRequest(Long assessmentId, String capCode, String experienceText) {}
}
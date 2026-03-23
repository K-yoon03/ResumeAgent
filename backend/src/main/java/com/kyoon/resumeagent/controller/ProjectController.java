package com.kyoon.resumeagent.controller;

import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.Project;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.ProjectRepository;
import com.kyoon.resumeagent.repository.UserRepository;
import com.kyoon.resumeagent.service.AnalyzerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final AssessmentRepository assessmentRepository;
    private final AnalyzerService analyzerService;

    record AddProjectRequest(String name, String techStack, Long assessmentId) {}

    record ProjectResponse(
            Long id, String name, String techStack,
            String situation, String reason, String action, String result
    ) {}

    record UpdateStarRequest(
            String situation, String reason, String action, String result
    ) {}

    record ExtractRequest(String experience, Long assessmentId) {}

    // 프로젝트 추출 + DB 저장
    @PostMapping("/extract")
    public ResponseEntity<List<ProjectResponse>> extract(
            @RequestBody ExtractRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();

        // 이미 저장된 프로젝트 있으면 그대로 반환 (크레딧 차감 X)
        if (req.assessmentId() != null) {
            List<Project> existing = projectRepository.findByAssessmentId(req.assessmentId());
            if (!existing.isEmpty()) {
                return ResponseEntity.ok(existing.stream().map(this::toResponse).toList());
            }
        }

        // 🔥 AI 호출 전 크레딧 체크 및 차감
        if (!user.hasEnoughCredits(1)) {
            return ResponseEntity.status(402).build(); // Payment Required
        }
        user.useCredits(1);
        userRepository.save(user);

        // AI로 추출
        String result = analyzerService.extractProjects(req.experience());
        try {
            String clean = result.trim().replaceAll("```json", "").replaceAll("```", "").trim();
            com.fasterxml.jackson.databind.JsonNode node =
                    new com.fasterxml.jackson.databind.ObjectMapper().readTree(clean);

            Assessment assessment = req.assessmentId() != null
                    ? assessmentRepository.findById(req.assessmentId()).orElse(null)
                    : null;

            List<Project> projects = new java.util.ArrayList<>();
            for (com.fasterxml.jackson.databind.JsonNode p : node.get("projects")) {
                Project project = Project.builder()
                        .user(user)
                        .assessment(assessment)
                        .name(p.get("name").asText())
                        .techStack(p.has("techStack") ? p.get("techStack").asText() : "")
                        .build();
                projects.add(projectRepository.save(project));
            }
            return ResponseEntity.ok(projects.stream().map(this::toResponse).toList());
        } catch (Exception e) {
            return ResponseEntity.ok(List.of());
        }
    }

    // STAR 내용 업데이트
    @PutMapping("/{id}/star")
    public ResponseEntity<ProjectResponse> updateStar(
            @PathVariable Long id,
            @RequestBody UpdateStarRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        Project project = projectRepository.findById(id).orElseThrow();

        if (!project.getUser().getEmail().equals(userDetails.getUsername())) {
            return ResponseEntity.status(403).build();
        }

        project.updateStar(req.situation(), req.reason(), req.action(), req.result());
        return ResponseEntity.ok(toResponse(projectRepository.save(project)));
    }

    // 역량평가 기준 프로젝트 조회
    @GetMapping("/assessment/{assessmentId}")
    public ResponseEntity<List<ProjectResponse>> getByAssessment(
            @PathVariable Long assessmentId,
            @AuthenticationPrincipal UserDetails userDetails) {

        List<Project> projects = projectRepository.findByAssessmentId(assessmentId);
        return ResponseEntity.ok(projects.stream().map(this::toResponse).toList());
    }
    @PostMapping
    public ResponseEntity<ProjectResponse> addProject(
            @RequestBody AddProjectRequest req,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername()).orElseThrow();
        Assessment assessment = req.assessmentId() != null
                ? assessmentRepository.findById(req.assessmentId()).orElse(null)
                : null;

        Project project = Project.builder()
                .user(user)
                .assessment(assessment)
                .name(req.name())
                .techStack(req.techStack() != null ? req.techStack() : "미입력")
                .build();

        return ResponseEntity.ok(toResponse(projectRepository.save(project)));
    }

    // 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        Project project = projectRepository.findById(id).orElseThrow();
        if (!project.getUser().getEmail().equals(userDetails.getUsername())) {
            return ResponseEntity.status(403).build();
        }
        projectRepository.delete(project);
        return ResponseEntity.ok().build();
    }

    private ProjectResponse toResponse(Project p) {
        return new ProjectResponse(
                p.getId(), p.getName(), p.getTechStack(),
                p.getSituation(), p.getReason(), p.getAction(), p.getResult()
        );
    }
}
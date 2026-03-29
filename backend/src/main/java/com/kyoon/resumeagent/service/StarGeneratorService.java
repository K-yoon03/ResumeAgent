package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.InterviewData;
import com.kyoon.resumeagent.Entity.Job;
import com.kyoon.resumeagent.Entity.Star;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.InterviewDataRepository;
import com.kyoon.resumeagent.repository.JobRepository;
import com.kyoon.resumeagent.repository.StarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class StarGeneratorService {

    private final ChatModel chatModel;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final InterviewDataRepository interviewDataRepository;
    private final JobRepository jobRepository;
    private final StarRepository starRepository;
    private final AssessmentRepository assessmentRepository;

    public record StarResult(
            String itemName,
            String situation,
            String task,
            String action,
            String result,
            Map<String, String> quality,
            double completenessScore
    ) {}

    public List<StarResult> generateStars(Long assessmentId, String jobCode, String jobContext) throws Exception {
        List<InterviewData> dataList = interviewDataRepository
                .findByAssessmentIdOrderByCreatedAtAsc(assessmentId);

        if (dataList.isEmpty()) return List.of();

        Job job = jobRepository.findByGroupCode(jobCode).orElse(null);
        String jobGroup = job != null ? job.getGroupName() : jobCode;

        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new RuntimeException("Assessment not found"));

        List<StarResult> results = new ArrayList<>();

        for (InterviewData data : dataList) {
            // DB에 이미 있으면 재사용
            Optional<Star> existing = starRepository.findByAssessmentIdAndItemName(assessmentId, data.getItemName());
            if (existing.isPresent()) {
                Star s = existing.get();
                Map<String, String> quality = new HashMap<>();
                if (s.getQuality() != null) {
                    try {
                        JsonNode qNode = objectMapper.readTree(s.getQuality());
                        qNode.fields().forEachRemaining(e -> quality.put(e.getKey(), e.getValue().asText()));
                    } catch (Exception ignored) {}
                }
                results.add(new StarResult(
                        s.getItemName(), s.getSituation(), s.getTask(),
                        s.getAction(), s.getResult(), quality,
                        s.getCompletenessScore() != null ? s.getCompletenessScore() : 0.0
                ));
                continue;
            }

            // 없으면 LLM 생성
            ChatClient client = ChatClient.builder(chatModel)
                    .defaultOptions(ChatOptions.builder().temperature(0.7).maxTokens(800).build())
                    .build();

            var prompt = new PromptTemplate(resourceLoader.getResource("classpath:prompts/StarGenerator.st"))
                    .create(Map.of(
                            "itemName", data.getItemName(),
                            "jobGroup", jobGroup,
                            "jobContext", (jobContext != null && !jobContext.isBlank()) ? jobContext : "없음",
                            "role", data.getRole() != null ? data.getRole() : "정보 없음",
                            "action", data.getAction() != null ? data.getAction() : "정보 없음",
                            "tech", data.getTech() != null ? data.getTech() : "[]",
                            "result", data.getResult() != null ? data.getResult() : "정보 없음"
                    ));

            String response = client.prompt(prompt).call().content();
            String clean = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();

            try {
                JsonNode node = objectMapper.readTree(clean);
                Map<String, String> quality = new HashMap<>();
                if (node.has("quality")) {
                    node.get("quality").fields().forEachRemaining(e ->
                            quality.put(e.getKey(), e.getValue().asText()));
                }

                // DB 저장
                Star star = Star.builder()
                        .assessment(assessment)
                        .itemName(data.getItemName())
                        .situation(node.has("situation") ? node.get("situation").asText() : "")
                        .task(node.has("task") ? node.get("task").asText() : "")
                        .action(node.has("action") ? node.get("action").asText() : "")
                        .result(node.has("result") ? node.get("result").asText() : "")
                        .quality(objectMapper.writeValueAsString(quality))
                        .completenessScore(data.getCompletenessScore())
                        .build();
                star = starRepository.save(star);

                results.add(new StarResult(
                        star.getItemName(), star.getSituation(), star.getTask(),
                        star.getAction(), star.getResult(), quality,
                        star.getCompletenessScore() != null ? star.getCompletenessScore() : 0.0
                ));
            } catch (Exception e) {
                results.add(new StarResult(data.getItemName(), "", "", "", "", Map.of(), 0.0));
            }
        }

        return results;
    }

    /**
     * STAR 단일 필드 업데이트 (개선하기 저장)
     */
    public void updateStarField(Long assessmentId, String itemName, String field, String value) {
        starRepository.findByAssessmentIdAndItemName(assessmentId, itemName).ifPresent(star -> {
            switch (field) {
                case "situation" -> star.setSituation(value);
                case "task" -> star.setTask(value);
                case "action" -> star.setAction(value);
                case "result" -> star.setResult(value);
            }
            starRepository.save(star);
        });
    }
}
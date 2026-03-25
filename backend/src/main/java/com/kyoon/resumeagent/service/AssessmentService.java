package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Entity.Assessment;
import com.kyoon.resumeagent.Entity.Competency;
import com.kyoon.resumeagent.Entity.Job;
import com.kyoon.resumeagent.Entity.User;
import com.kyoon.resumeagent.repository.AssessmentRepository;
import com.kyoon.resumeagent.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final ChatModel chatModel;
    private final JobRepository jobRepository;
    private final AssessmentRepository assessmentRepository;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;

    /**
     * 역량 평가 실행
     */
    @Transactional
    public Assessment evaluateCompetency(User user, String jobCode, String experience) throws Exception {
        // 1. Job 및 Competency 로드
        Job job = jobRepository.findByJobCode(jobCode)
                .orElseThrow(() -> new RuntimeException("Job not found: " + jobCode));

        List<Competency> competencies = job.getCompetencies();

        // 2. 평가 전용 ChatClient 생성 (temperature 0.2)
        ChatClient assessmentClient = ChatClient.builder(chatModel)
                .defaultOptions(OpenAiChatOptions.builder()
                        .temperature(0.2)  // 일관성 높게
                        .maxTokens(2000)
                        .build())
                .build();

        // 3. 프롬프트 생성
        Resource promptResource = resourceLoader.getResource("classpath:prompts/Analyzer.st");
        PromptTemplate template = new PromptTemplate(promptResource);

        Prompt prompt = template.create(Map.of(
                "jobName", job.getJobName(),
                "jobCode", job.getJobCode(),
                "competencies", buildCompetenciesDescription(competencies),
                "experience", experience
        ));

        // 4. GPT 호출 (역량별 점수 산출)
        String response = assessmentClient.prompt(prompt).call().content();

        // JSON 정리
        String cleanJson = response.trim()
                .replaceAll("```json", "")
                .replaceAll("```", "")
                .trim();

        // 5. 파싱
        JsonNode result = objectMapper.readTree(cleanJson);
        JsonNode competencyScores = result.get("competencyScores");

        // 6. 🔥 Gemini 공식 적용 (가중 평균 계산)
        double totalScore = 0.0;
        Map<String, Object> scoreBreakdown = new HashMap<>();
        List<Map<String, Object>> detailedScores = new ArrayList<>();

        for (int i = 0; i < competencies.size(); i++) {
            Competency comp = competencies.get(i);
            JsonNode scoreNode = competencyScores.get(i);

            int score = scoreNode.get("score").asInt();
            String evidence = scoreNode.get("evidence").asText();
            BigDecimal weight = comp.getWeight();

            double contribution = score * weight.doubleValue();
            totalScore += contribution;

            Map<String, Object> detail = new HashMap<>();
            detail.put("name", comp.getName());
            detail.put("score", score);
            detail.put("weight", weight.doubleValue());
            detail.put("contribution", contribution);
            detail.put("evidence", evidence);
            detailedScores.add(detail);
        }

        scoreBreakdown.put("totalScore", Math.round(totalScore));
        scoreBreakdown.put("competencyScores", detailedScores);
        scoreBreakdown.put("strengths", result.get("strengths"));
        scoreBreakdown.put("improvements", result.get("improvements"));

        // 7. Assessment 저장
        Assessment assessment = Assessment.builder()
                .user(user)
                .evaluatedJobCode(jobCode)
                .experience(experience)
                .analysis(objectMapper.writeValueAsString(Map.of(
                        "strengths", result.get("strengths"),
                        "improvements", result.get("improvements")
                )))
                .scoreData(objectMapper.writeValueAsString(scoreBreakdown))
                .isPrimary(false)
                .build();

        return assessmentRepository.save(assessment);
    }

    /**
     * 역량 목록을 설명 문자열로 변환
     */
    private String buildCompetenciesDescription(List<Competency> competencies) {
        StringBuilder sb = new StringBuilder();
        for (Competency comp : competencies) {
            sb.append(String.format(
                    "- %s (가중치: %.0f%%): %s\n",
                    comp.getName(),
                    comp.getWeight().doubleValue() * 100,
                    comp.getMeasurement()
            ));
        }
        return sb.toString();
    }
}
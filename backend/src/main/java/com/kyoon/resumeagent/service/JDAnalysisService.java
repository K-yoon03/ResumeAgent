package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Capability.CapabilityCode;
import com.kyoon.resumeagent.Capability.CapabilityWeight;
import com.kyoon.resumeagent.Capability.JobCapabilityProfile;
import com.kyoon.resumeagent.Capability.PromptPathResolver;
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
public class JDAnalysisService {

    private final ChatModel chatModel;
    private final ResourceLoader resourceLoader;
    private final ObjectMapper objectMapper;
    private final RagAnchorService ragAnchorService;

    // ─────────────────────────────────────────────
    // Entry point
    // ─────────────────────────────────────────────

    public JDProfile analyze(String jdText) throws Exception {
        // Step 1: jobCode 분류
        JobCodeResult jobCodeResult = classifyJobCode(jdText);
        String jobCode = jobCodeResult.jobCode();

        // Step 2: 해당 직군 capability 목록 구성
        Map<CapabilityCode, CapabilityWeight> profile = JobCapabilityProfile.JOB_PROFILES.get(jobCode);
        List<String> capCodes = profile != null
                ? profile.keySet().stream().map(CapabilityCode::name).toList()
                : Arrays.stream(CapabilityCode.values()).map(CapabilityCode::name).toList();

        String allowedCapabilities = capCodes.stream()
                .map(code -> {
                    try { return code + "(" + CapabilityCode.valueOf(code).getDescription() + ")"; }
                    catch (IllegalArgumentException e) { return code; }
                })
                .collect(Collectors.joining("\n"));

        // Step 3: 단일 호출로 meta + capabilities 동시 파싱
        String anchorContext = ragAnchorService.getAnchorContextForCodes(capCodes);
        EvaluatorResult evalResult =
                runCapabilityEvaluator(jdText, allowedCapabilities, anchorContext);

        return new JDProfile(jobCode, jobCodeResult.confidence(),
                evalResult.capabilities(), evalResult.requiredExperience(), evalResult.requiredEducation());
    }

    // ─────────────────────────────────────────────
    // Step 1: jobCode 분류
    // ─────────────────────────────────────────────

    private JobCodeResult classifyJobCode(String jdText) throws Exception {
        String jobCodeList = JobCapabilityProfile.JOB_PROFILES.keySet().stream()
                .sorted()
                .collect(Collectors.joining("\n"));

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).maxTokens(300).build())
                .build();

        var prompt = new PromptTemplate(resourceLoader.getResource(PromptPathResolver.jdJobClassifier()))
                .create(Map.of("jdText", jdText, "jobCodeList", jobCodeList));

        String response = client.prompt(prompt).call().content();
        JsonNode root = objectMapper.readTree(clean(response));
        return new JobCodeResult(root.get("jobCode").asText(), root.get("confidence").asDouble());
    }

    // ─────────────────────────────────────────────
    // Step 2: capability 평가 (evidence + level + score 단일 패스)
    // ─────────────────────────────────────────────

    private EvaluatorResult runCapabilityEvaluator(
            String jdText, String allowedCapabilities, String anchorContext) throws Exception {

        ChatClient client = ChatClient.builder(chatModel)
                .defaultOptions(ChatOptions.builder().temperature(0.0).maxTokens(3000).build())
                .build();

        var prompt = new PromptTemplate(
                resourceLoader.getResource(PromptPathResolver.jdCapabilityEvaluator()))
                .create(Map.of(
                        "jdText", jdText,
                        "allowedCapabilities", allowedCapabilities,
                        "anchorContext", anchorContext
                ));

        String response = client.prompt(prompt).call().content();
        log.debug("[JDCapabilityEvaluator] raw: {}", response);

        JsonNode root = objectMapper.readTree(clean(response));

        // meta 파싱
        String exp = "UNKNOWN", edu = "UNKNOWN";
        if (root.has("meta")) {
            JsonNode meta = root.get("meta");
            exp = meta.path("requiredExperience").asText("UNKNOWN");
            edu = meta.path("requiredEducation").asText("UNKNOWN");
        }

        // capabilities 파싱 (신규 구조: root.capabilities, 구버전 호환: root 직접)
        JsonNode capNode = root.has("capabilities") ? root.get("capabilities") : root;
        Map<String, CapabilityRequirement> result = new LinkedHashMap<>();
        capNode.fields().forEachRemaining(e -> {
            if (e.getKey().equals("meta")) return; // meta 키 스킵
            JsonNode v = e.getValue();
            if (!v.has("requiredLevel")) return;
            result.put(e.getKey(), new CapabilityRequirement(
                    v.get("requiredLevel").asText(),
                    v.get("score").asDouble(),
                    v.get("confidence").asDouble(),
                    v.get("reason").asText()
            ));
        });

        return new EvaluatorResult(result, exp, edu);
    }

    private record EvaluatorResult(
            Map<String, CapabilityRequirement> capabilities,
            String requiredExperience,
            String requiredEducation
    ) {}

    // ─────────────────────────────────────────────
    // Util
    // ─────────────────────────────────────────────

    private String clean(String raw) {
        return raw.trim()
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("(?s)```\\s*", "")
                .trim();
    }

    // ─────────────────────────────────────────────
    // Records
    // ─────────────────────────────────────────────

    public record JDProfile(
            String jobCode,
            double confidence,
            Map<String, CapabilityRequirement> capabilities,
            String requiredExperience,
            String requiredEducation
    ) {}

    public record CapabilityRequirement(
            String requiredLevel,
            double score,
            double confidence,
            String reason
    ) {}

    public record JobCodeResult(String jobCode, double confidence) {}
}
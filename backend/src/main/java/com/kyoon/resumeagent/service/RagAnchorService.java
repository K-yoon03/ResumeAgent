package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pgvector.PGvector;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RagAnchorService {

    private final DataSource dataSource;
    private final EmbeddingModel embeddingModel;
    private final ObjectMapper objectMapper;

    /**
     * capabilityCode 기준으로 앵커 직접 조회 (코드 완전 일치)
     */
    public String getAnchorContext(String capabilityCode) {
        try (Connection conn = dataSource.getConnection()) {
            PreparedStatement ps = conn.prepareStatement(
                    "SELECT content, anchors, interview_questions " +
                            "FROM capability_anchors WHERE capability_code = ?"
            );
            ps.setString(1, capabilityCode);
            ResultSet rs = ps.executeQuery();

            if (rs.next()) {
                return buildContext(
                        rs.getString("content"),
                        rs.getString("anchors"),
                        rs.getString("interview_questions")
                );
            }
        } catch (Exception e) {
            System.err.println("[RagAnchorService] 앵커 조회 실패: " + capabilityCode + " - " + e.getMessage());
        }
        return "";
    }

    /**
     * 쿼리 텍스트로 유사 앵커 검색 (코드 불명확할 때)
     */
    public String searchAnchorContext(String queryText) {
        try {
            float[] vector = embeddingModel.embed(queryText);

            try (Connection conn = dataSource.getConnection()) {
                PGvector.addVectorType(conn);
                PreparedStatement ps = conn.prepareStatement(
                        "SELECT content, anchors, interview_questions " +
                                "FROM capability_anchors " +
                                "ORDER BY embedding <=> ? LIMIT 1"
                );
                ps.setObject(1, new PGvector(vector));
                ResultSet rs = ps.executeQuery();

                if (rs.next()) {
                    return buildContext(
                            rs.getString("content"),
                            rs.getString("anchors"),
                            rs.getString("interview_questions")
                    );
                }
            }
        } catch (Exception e) {
            System.err.println("[RagAnchorService] 앵커 검색 실패: " + e.getMessage());
        }
        return "";
    }

    /**
     * 여러 capabilityCode → 앵커 컨텍스트 합산
     */
    public String getAnchorContextForCodes(List<String> capabilityCodes) {
        System.out.println("[RAG] getAnchorContextForCodes 호출 - codes: " + capabilityCodes);
        StringBuilder sb = new StringBuilder();
        for (String code : capabilityCodes) {
            String ctx = getAnchorContext(code.trim());
            if (!ctx.isEmpty()) {
                System.out.println("[RAG] 앵커 조회 성공: " + code);
                sb.append(ctx).append("\n---\n");
            } else {
                System.out.println("[RAG] 앵커 조회 실패 (빈값): " + code);
            }
        }
        String result = sb.toString().trim();
        System.out.println("[RAG] 최종 컨텍스트 길이: " + result.length());
        return result;
    }

    private String buildContext(String content, String anchorsJson, String questionsJson) {
        StringBuilder sb = new StringBuilder();
        try {
            JsonNode anchors = objectMapper.readTree(anchorsJson);
            sb.append("[레벨 기준]\n");
            List.of("L1", "L2", "L3", "L4").forEach(level -> {
                JsonNode node = anchors.get(level);
                if (node != null) {
                    if (node.has("summary")) {
                        sb.append(level).append(": ").append(node.get("summary").asText()).append("\n");
                    }
                    if (node.has("criteria") && node.get("criteria").isArray()) {
                        node.get("criteria").forEach(c ->
                                sb.append("  - ").append(c.asText()).append("\n")
                        );
                    }
                }
            });

            JsonNode questions = objectMapper.readTree(questionsJson);
            if (questions.isArray() && questions.size() > 0) {
                sb.append("[참고 질문 예시]\n");
                for (int i = 0; i < Math.min(2, questions.size()); i++) {
                    sb.append("- ").append(questions.get(i).asText()).append("\n");
                }
            }
        } catch (Exception e) {
            return content;
        }
        return sb.toString();
    }

    private float[] toFloatArray(List<Double> doubles) {
        float[] arr = new float[doubles.size()];
        for (int i = 0; i < doubles.size(); i++) {
            arr[i] = doubles.get(i).floatValue();
        }
        return arr;
    }
}
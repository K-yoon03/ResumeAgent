package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kyoon.resumeagent.Capability.CapabilityCode;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.util.MimeTypeUtils;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import java.util.*;

@Service
public class AgentService {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    public AgentService(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 자소서 평가 - JSON 형태 반환
     */
    public String evaluateResume(String resumeContent) {
        String systemPrompt = """
            당신은 채용 전문가입니다. 
            자기소개서를 다음 4가지 기준으로 평가하고, 개선 제안을 제공합니다.
            
            평가 기준:
            1. clarity (명확성): 문장이 명확하고 이해하기 쉬운가? (0-100점)
            2. relevance (직무 관련성): 지원 직무와 연관성이 높은가? (0-100점)
            3. structure (구조/완성도): STAR 기법 등 논리적 구조가 잘 갖춰졌는가? (0-100점)
            4. impact (임팩트): 구체적 성과와 수치가 포함되어 설득력이 있는가? (0-100점)
            
            응답 형식 (반드시 JSON으로만 응답):
            {
              "overall": 85,
              "categories": {
                "clarity": {
                  "score": 90,
                  "feedback": "문장이 명확하고 구체적입니다."
                },
                "relevance": {
                  "score": 80,
                  "feedback": "직무와의 연관성을 더 강조하면 좋습니다."
                },
                "structure": {
                  "score": 85,
                  "feedback": "STAR 구조가 잘 지켜졌습니다."
                },
                "impact": {
                  "score": 85,
                  "feedback": "정량적 성과가 잘 드러납니다."
                }
              },
              "suggestions": [
                "지원 동기 부분에서 회사 비전과의 연결고리를 추가하세요.",
                "프로젝트 결과에 구체적인 수치를 더 포함하면 좋습니다."
              ]
            }
            
            **중요**: 
            - 반드시 위 JSON 형식으로만 응답하세요.
            - 마크다운, 코드블록(```), 추가 설명 등은 포함하지 마세요.
            - suggestions는 2-4개 정도로 구체적이고 실행 가능한 조언을 제공하세요.
            - overall 점수는 4가지 카테고리 점수의 평균입니다.
            """;

        String userPrompt = String.format("""
            다음 자기소개서를 평가해주세요:
            
            %s
            """, resumeContent);

        try {
            Prompt prompt = new Prompt(List.of(
                    new SystemMessage(systemPrompt),
                    new UserMessage(userPrompt)
            ));

            String response = chatClient.prompt(prompt).call().content();

            String cleanJson = response.trim()
                    .replaceAll("```json", "")
                    .replaceAll("```", "")
                    .trim();

            objectMapper.readTree(cleanJson);

            return cleanJson;

        } catch (Exception e) {
            return createDefaultEvaluation();
        }
    }

    /**
     * 기본 평가 결과 (AI 실패 시 폴백)
     */
    private String createDefaultEvaluation() {
        Map<String, Object> evaluation = new HashMap<>();
        evaluation.put("overall", 75);

        Map<String, Object> categories = new HashMap<>();
        categories.put("clarity", Map.of(
                "score", 75,
                "feedback", "전반적으로 명확한 표현이 사용되었습니다."
        ));
        categories.put("relevance", Map.of(
                "score", 75,
                "feedback", "직무와의 연관성을 더 강조해보세요."
        ));
        categories.put("structure", Map.of(
                "score", 75,
                "feedback", "논리적인 구조를 갖추고 있습니다."
        ));
        categories.put("impact", Map.of(
                "score", 75,
                "feedback", "구체적인 성과를 더 추가하면 좋습니다."
        ));
        evaluation.put("categories", categories);

        evaluation.put("suggestions", List.of(
                "각 섹션에 구체적인 수치와 성과를 추가해보세요.",
                "지원 동기와 회사 비전의 연결고리를 강화하세요."
        ));

        try {
            return objectMapper.writeValueAsString(evaluation);
        } catch (Exception e) {
            return "{\"overall\": 75, \"categories\": {}, \"suggestions\": []}";
        }
    }

    /**
     * STAR 필드 개선
     */
    public String improveStarField(String field, String content, String type, String projectName) {
        String instruction = switch (type) {
            case "specific" -> "더 구체적이고 상세하게 다시 작성해줘. 행동, 방법, 과정을 명확히 서술해.";
            case "metric"   -> "수치나 정량적 성과를 강조해서 다시 작성해줘. 없으면 자연스럽게 추론해서 넣어도 돼.";
            case "concise"  -> "핵심만 남기고 간결하게 다시 작성해줘. 2-3문장 이내로.";
            default         -> "더 좋게 개선해줘.";
        };

        String systemPrompt = String.format("""
            당신은 한국어 자기소개서 전문가입니다.
            STAR 기법의 %s 파트를 개선합니다.
            프로젝트: %s
            
            지시사항: %s
            
            규칙:
            - 반드시 한국어로 작성
            - 원본 내용의 사실을 유지하되 표현만 개선
            - JSON 형식으로만 반환: {"improved": "개선된 내용"}
            - 마크다운, 코드블록 금지
            """, field, projectName, instruction);

        try {
            Prompt prompt = new Prompt(List.of(
                    new SystemMessage(systemPrompt),
                    new UserMessage("원본: " + content)
            ));
            String response = chatClient.prompt(prompt).call().content();
            String clean = response.trim().replaceAll("```json", "").replaceAll("```", "").trim();
            objectMapper.readTree(clean);
            return clean;
        } catch (Exception e) {
            try {
                return objectMapper.writeValueAsString(Map.of("improved", content));
            } catch (Exception ex) {
                return "{\"improved\": \"\"}";
            }
        }
    }

    /**
     * 공고 매직 페이스트 파싱
     */
    public String parseJobPosting(String rawText) {
        String systemPrompt = """
            당신은 채용 공고 파싱 전문가입니다.
            사용자가 복사해온 텍스트에서 핵심 정보만 추출합니다.
            입력 텍스트에 여러 기업의 공고가 포함되어 있을 경우, 가장 상단에 위치한 메인 채용 정보 하나만 추출하세요. 하단의 추천 공고 리스트는 무시하세요.
            
            추출할 정보:
            - companyName (String)
            - position (String)
            - mainTasks (String)
            - requirements (String)
            - preferred (String)
            - techStack (String)
            - workPlace (String)
            - employmentType (String)
            - vision (String)
            
            Rules:
            - 광고, 추천공고, 무관한 내용은 무시
            - 정보가 없는 필드는 반드시 빈 문자열 "" 반환
            - 모든 값은 반드시 문자열(String)로 반환
            - null 사용 금지
            - 원문을 요약하거나 재작성하지 말고 가능한 그대로 추출
            - JSON 외 텍스트 절대 출력 금지
            - 필드명 절대 변경 금지
            
            분류 기준:
            - 담당업무/주요업무 → mainTasks
            - 자격요건/필수조건 → requirements
            - 우대사항 → preferred
            
            응답 형식 (반드시 아래 JSON 구조 그대로):
            
            {
              "companyName": "",
              "position": "",
              "mainTasks": "",
              "requirements": "",
              "preferred": "",
              "techStack": "",
              "workPlace": "",
              "employmentType": "",
              "vision": ""
            }
            
            예시:
            
            {
              "companyName": "현대자동차",
              "position": "백엔드 개발자",
              "mainTasks": "API 개발 및 서버 운영",
              "requirements": "Java, Spring 경험",
              "preferred": "AWS 경험",
              "techStack": "Java, Spring, AWS",
              "workPlace": "서울",
              "employmentType": "정규직",
              "vision": "미래 모빌리티 혁신"
            }
            
            중요:
            - 반드시 JSON만 출력
            - 코드블록, 설명, 추가 텍스트 절대 금지
            - 하나라도 형식이 틀리면 안 됨
            """;

        String userPrompt = String.format("""
            다음 텍스트에서 채용 공고 정보를 추출해주세요:
            
            %s
            """, rawText);

        try {
            Prompt prompt = new Prompt(List.of(
                    new SystemMessage(systemPrompt),
                    new UserMessage(userPrompt)
            ));

            String response = chatClient.prompt(prompt).call().content();

            String cleanJson = response.trim()
                    .replaceAll("```json", "")
                    .replaceAll("```", "")
                    .trim();

            objectMapper.readTree(cleanJson);

            return cleanJson;

        } catch (Exception e) {
            return """
                {
                  "companyName": "",
                  "position": "",
                  "mainTasks": "",
                  "requirements": "",
                  "preferred": "",
                  "techStack": "",
                  "workPlace": "",
                  "employmentType": "",
                  "vision": ""
                }
                """;
        }
    }

    private Map<String, Double> parseCapabilityVector(String response) {
        Pattern pattern = Pattern.compile(
                "\\[CAPABILITY_VECTOR\\]\\s*(.*?)\\s*\\[/CAPABILITY_VECTOR\\]",
                Pattern.DOTALL
        );
        Matcher matcher = pattern.matcher(response);
        if (matcher.find()) {
            Map<String, Double> vector = new HashMap<>();
            for (String entry : matcher.group(1).split(",")) {
                String[] parts = entry.trim().split(":");
                if (parts.length == 2) {
                    try {
                        vector.put(parts[0].trim(), Double.parseDouble(parts[1].trim()));
                    } catch (NumberFormatException e) { /* skip */ }
                }
            }
            return vector;
        }
        return new HashMap<>();
    }

    /**
     * STAR 기법 AI 힌트 생성
     */
    public String generateFollowUpQuestions(String experience, String analysis) {
        String systemPrompt = """
            당신은 자기소개서 작성을 돕는 AI 어시스턴트입니다.
            사용자의 경험을 바탕으로 STAR 기법(Situation, Task, Action, Result)에 맞춰 
            구체적인 추가 질문 3개를 생성합니다.
            
            응답 형식 (반드시 JSON으로만):
            {
              "questions": [
                {"question": "그 상황에서 가장 큰 어려움은 무엇이었나요?"},
                {"question": "문제 해결을 위해 어떤 기술이나 도구를 사용했나요?"},
                {"question": "결과적으로 어떤 지표가 개선되었나요?"}
              ]
            }
            
            **중요**: 마크다운, 코드블록(```), 추가 설명 없이 순수 JSON만 반환하세요.
            """;

        String userPrompt = String.format("""
            경험: %s
            
            분석 요청: %s
            
            위 내용을 바탕으로 추가 질문 3개를 생성해주세요.
            """, experience, analysis);

        try {
            Prompt prompt = new Prompt(List.of(
                    new SystemMessage(systemPrompt),
                    new UserMessage(userPrompt)
            ));

            String response = chatClient.prompt(prompt).call().content();

            String cleanJson = response.trim()
                    .replaceAll("```json", "")
                    .replaceAll("```", "")
                    .trim();

            objectMapper.readTree(cleanJson);

            return cleanJson;

        } catch (Exception e) {
            return """
                {
                  "questions": [
                    {"question": "문제가 얼마나 자주 발생했나요?"},
                    {"question": "사용자에게 어떤 영향을 줬나요?"},
                    {"question": "이전 방식과 뭐가 달라졌나요?"}
                  ]
                }
                """;
        }
    }
    public String parseJobPostingFromImage(byte[] imageBytes) {
        Resource imageResource = new ByteArrayResource(imageBytes);

        // MIME 타입 자동 감지 (PNG, JPEG, WEBP 등)
        String mimeType = detectMimeType(imageBytes);

        return chatClient.prompt()
                .user(userSpec -> userSpec
                        .text("""
                    이미지 속 채용공고를 분석하여 다음 JSON 형식으로 변환해주세요.
                    
                    {
                      "companyName": "회사명",
                      "position": "직무",
                      "mainTasks": "담당업무",
                      "requirements": "자격요건",
                      "preferred": "우대사항",
                      "techStack": "기술스택",
                      "workPlace": "근무지",
                      "employmentType": "고용형태",
                      "vision": "비전"
                    }
                    
                    정보가 없는 필드는 빈 문자열 ""로 반환해주세요.
                    JSON만 반환해주세요 (코드블록 없이).
                    """)
                        .media(MimeType.valueOf(mimeType), imageResource)
                )
                .call()
                .content();
    }

    private String detectMimeType(byte[] imageBytes) {
        if (imageBytes.length < 4) {
            return MimeTypeUtils.IMAGE_PNG.toString();
        }

        // PNG: 89 50 4E 47
        if (imageBytes[0] == (byte) 0x89 && imageBytes[1] == 0x50 &&
                imageBytes[2] == 0x4E && imageBytes[3] == 0x47) {
            return MimeTypeUtils.IMAGE_PNG.toString();
        }

        // JPEG: FF D8 FF
        if (imageBytes[0] == (byte) 0xFF && imageBytes[1] == (byte) 0xD8 &&
                imageBytes[2] == (byte) 0xFF) {
            return MimeTypeUtils.IMAGE_JPEG.toString();
        }

        // WebP: RIFF ... WEBP
        if (imageBytes.length >= 12 &&
                imageBytes[0] == 0x52 && imageBytes[1] == 0x49 &&
                imageBytes[2] == 0x46 && imageBytes[3] == 0x46 &&
                imageBytes[8] == 0x57 && imageBytes[9] == 0x45 &&
                imageBytes[10] == 0x42 && imageBytes[11] == 0x50) {
            return "image/webp";
        }

        // 기본값 PNG
        return MimeTypeUtils.IMAGE_PNG.toString();
    }

}
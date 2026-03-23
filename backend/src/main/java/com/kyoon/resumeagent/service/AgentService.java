package com.kyoon.resumeagent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;

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
     * 공고 매직 페이스트 파싱
     */
    public String parseJobPosting(String rawText) {
        String systemPrompt = """
            당신은 채용 공고 파싱 전문가입니다.
            사용자가 복사해온 텍스트에서 핵심 정보만 추출합니다.
            
            추출할 정보:
            - companyName (회사명)
            - position (직무/포지션)
            - mainTasks (주요 업무)
            - requirements (자격 요건)
            - preferred (우대 사항)
            - techStack (기술 스택)
            - workPlace (근무지)
            - employmentType (고용 형태)
            - vision (회사 비전/문화)
            
            응답 형식 (반드시 JSON으로만):
            {
              "companyName": "현대차 정몽구 재단",
              "position": "지식.공간_경력",
              "mainTasks": "재단 운영 지원",
              "requirements": "경력 1년 이상, 대졸 이상",
              "preferred": "",
              "techStack": "",
              "workPlace": "서울 종로구 계동",
              "employmentType": "정규직 전환형 계약직",
              "vision": ""
            }
            
            **중요**:
            - 광고, 추천공고, 무관한 내용은 무시하세요.
            - 정보가 없는 필드는 빈 문자열 ""로 반환하세요.
            - 마크다운, 코드블록(```), 추가 설명 없이 순수 JSON만 반환하세요.
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
}
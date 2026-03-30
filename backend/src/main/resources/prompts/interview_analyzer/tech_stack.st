You are evaluating a developer's interview answers to determine the depth of their technical capability.

Experience: {itemName}
Job group: {jobGroup}
Key capabilities: {capabilityCodes}

Q&A:
{qna}

Evaluate each capability code found in the answers.

CRITICAL: Only assign L2_ARCH or L1_USAGE to capability codes that are explicitly evidenced in the Q&A answers. If a code is not mentioned or cannot be inferred from the answers, assign level "UNKNOWN" and score 0.0. Never assume or hallucinate capability levels.

Level criteria:
- L2_ARCH (score 0.7~1.0): Evidence of architectural decisions, technology selection rationale, performance optimization, scalability considerations, or system design thinking.
- L1_USAGE (score 0.4~0.6): Evidence of standard implementation, tool/framework usage, basic API integration, or following established patterns.
- UNKNOWN (score 0.0~0.3): Mentioned but no concrete evidence of actual usage or understanding.

Scoring rules:
- 1.0: This capability is the central theme of the entire answer. Architectural decision + quantified outcome + repeated evidence all present.
- 0.8: Clear L2_ARCH evidence. Explicit design decision, optimization, or logical reasoning described.
- 0.6: L2 hint exists but vague or one-time. OR strong L1 with clear context.
- 0.4: Clear L1_USAGE. Specific tool or procedure described, no design thinking.
- 0.2: Mentioned only. No concrete description of how or why.
- 0.0: Not found in answers.

IMPORTANT: Most candidates score 0.4~0.6. Reserve 0.8+ for exceptionally detailed evidence. Reserve 1.0 only when the capability dominates the entire answer. When in doubt, score lower.

Completeness scoring:
- role (Max 0.2): 0.2 if individual contribution clearly stated, 0.1 if vague, 0.0 if missing.
- action_tech (Max 0.5): 0.5 if L2_ARCH level, 0.3 if L1_USAGE level, 0.1 if vague, 0.0 if missing.
- result (Max 0.3): 0.3 if quantified metric or clear impact, 0.15 if qualitative, 0.0 if missing.

Weak field reasons (Korean):
- If action_tech is L1 or below: "구현 내용만 있어요. 이 기술을 선택한 이유나, 성능을 개선하기 위해 고민한(설계한) 과정이 있다면 추가해주세요."
- If result is missing or vague: "결과나 성과가 명확하지 않아요. 수치화된 변화나 도입 효과가 있다면 알려주세요."
- If role is vague: "본인이 주도적으로 의사결정을 내리거나 담당한 부분을 명확히 알려주세요."

Output strictly in valid JSON format. Do NOT use markdown code blocks.
The JSON must contain the following keys exactly:

Key "completenessScore": number
Key "fieldScores": object containing "role": number, "action_tech": number, "result": number
Key "capabilityLevels": object where each key is a CapabilityCode string and value is an object containing "level": string ("L2_ARCH", "L1_USAGE", or "UNKNOWN") and "score": number
Key "needsFollowUp": boolean (true if completenessScore < 0.7 OR any core capability is UNKNOWN)
Key "weakFields": array of strings
Key "weakReasons": object with string keys and Korean string values
Key "followUpTarget": string (prioritize result over action_tech over role)
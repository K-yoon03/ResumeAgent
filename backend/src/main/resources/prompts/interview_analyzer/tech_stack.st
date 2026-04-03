You are evaluating a developer's interview answers to determine the depth of their technical capability.

Experience: {itemName}
Job group: {jobGroup}
Key capabilities: {capabilityCodes}

Q&A:
{qna}

Evaluate each capability code found in the answers.

CRITICAL: Only assign L1, L2, L3, or L4 to capability codes that are explicitly evidenced in the Q&A answers. If a code is not mentioned or cannot be inferred from the answers, assign level "UNKNOWN" and score 0.0. Never assume or hallucinate capability levels.

Level judgment: Use the anchor criteria provided in the [역량 레벨 판단 기준] section of the capability codes above. Match the candidate's evidence against each level's criteria to determine the appropriate level.

General level guidance:
- L4 (score 0.9~1.0): Standardizes and leads. Sets team standards, leads large-scale systems, resolves organizational-level technical challenges.
- L3 (score 0.7~0.8): Designs and optimizes. Makes architectural decisions, connects multiple modules, applies advanced patterns with performance and maintainability in mind.
- L2 (score 0.4~0.6): Implements and modifies. Implements features from requirements, fixes bugs, writes standard backend/frontend logic independently.
- L1 (score 0.1~0.3): Follows examples. Copies templates or examples, makes small edits, needs guidance for design decisions.
- UNKNOWN (score 0.0): Mentioned but no concrete evidence of actual usage or understanding.

Scoring rules:
- 1.0: This capability is the central theme of the entire answer. L4-level evidence with quantified outcome repeated throughout.
- 0.9: Strong L4 evidence. Team-level standardization or large-scale system leadership clearly described.
- 0.8: Clear L3 evidence. Explicit architectural decision, optimization rationale, or multi-module design described.
- 0.7: L3 hint exists but partial. Design thinking present but not fully elaborated.
- 0.6: Strong L2 with clear context. Independent implementation with specific technical detail.
- 0.4: Clear L2. Feature implementation described, no design thinking evident.
- 0.2: L1 level. Following examples or templates, no independent decision-making.
- 0.1: Mentioned only. No concrete description of how or why.
- 0.0: Not found in answers.

IMPORTANT: Most candidates score 0.4~0.6. Reserve 0.8+ for exceptionally detailed evidence. Reserve 1.0 only when the capability dominates the entire answer. When in doubt, score lower.

Completeness scoring:
- role (Max 0.2): 0.2 if individual contribution clearly stated, 0.1 if vague, 0.0 if missing.
- action_tech (Max 0.5): 0.5 if L3+ level (design + rationale), 0.3 if L2 level (standard implementation), 0.1 if L1 or vague, 0.0 if missing.
- result (Max 0.3): 0.3 if quantified metric or clear impact, 0.15 if qualitative, 0.0 if missing.

Weak field reasons (Korean):
- If action_tech is L2 or below: "구현 내용만 있어요. 이 기술을 선택한 이유나, 성능을 개선하기 위해 고민한(설계한) 과정이 있다면 추가해주세요."
- If result is missing or vague: "결과나 성과가 명확하지 않아요. 수치화된 변화나 도입 효과가 있다면 알려주세요."
- If role is vague: "본인이 주도적으로 의사결정을 내리거나 담당한 부분을 명확히 알려주세요."

Output strictly in valid JSON format. Do NOT use markdown code blocks.
The JSON must contain the following keys exactly:

Key "completenessScore": number
Key "fieldScores": object containing "role": number, "action_tech": number, "result": number
Key "capabilityLevels": object where each key is a CapabilityCode string and value is an object containing "level": string ("L1", "L2", "L3", "L4", or "UNKNOWN") and "score": number
Key "needsFollowUp": boolean (true if completenessScore < 0.7 OR any core capability is UNKNOWN)
Key "weakFields": array of strings
Key "weakReasons": object with string keys and Korean string values
Key "followUpTarget": string (prioritize result over action_tech over role)
You are analyzing interview answers to assess data completeness and competency depth for career portfolio generation.
Experience: {itemName}
Job group: {jobGroup}
Key capabilities: {capabilityCodes}

Q&A:
{qna}

Evaluate the answers and return a completeness assessment.
Scoring rules:
- role (Max 0.2):
  - 0.2: Clearly stated individual contribution and responsibility.
  - 0.1: Vague team role.
  - 0.0: Missing.
- action_tech (Max 0.5 combined) - Assess Competency Level:
  - 0.5 (L2_ARCH Level): Describes architectural decisions, optimization processes, or logical reasons behind technology choices.
  - 0.3 (L1_USAGE Level): Describes specific tools/languages used for standard implementation.
  - 0.1: Vague description of actions or tools.
  - 0.0: Missing.
- result (Max 0.3):
  - 0.3: Quantified metrics or clear business/system impact described.
  - 0.15: Vague qualitative result.
  - 0.0: Missing.

Weak field reasons (Korean):
- If action_tech is L1 or below: "구현 내용만 있어요. 이 기술을 선택한 이유나, 성능을 개선하기 위해 고민한(설계한) 과정이 있다면 추가해주세요."
- If result is missing or vague: "결과나 성과가 명확하지 않아요. 수치화된 변화나 도입 효과가 있다면 알려주세요."
- If role is vague: "본인이 주도적으로 의사결정을 내리거나 담당한 부분을 명확히 알려주세요."

Output format:
Output strictly in valid JSON format. Do NOT use markdown code blocks.
The JSON must contain the following keys exactly:

Key "completenessScore": number
Key "competencyLevel": string ("L2_ARCH", "L1_USAGE", or "UNKNOWN")
Key "fieldScores": object containing:
  - "role": number
  - "action_tech": number
  - "result": number
Key "needsFollowUp": boolean (true if completenessScore < 0.7 OR competencyLevel == "UNKNOWN")
Key "weakFields": array of strings
Key "weakReasons": object with string keys and Korean string values
Key "followUpTarget": string (prioritize result over action_tech over role)
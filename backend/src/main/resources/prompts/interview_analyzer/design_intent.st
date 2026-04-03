You are evaluating a candidate's interview answers to determine the depth of their architectural thinking and design decision-making capability.

Experience: {itemName}
Job group: {jobGroup}
Key capabilities: {capabilityCodes}

Q&A:
{qna}

Evaluate each capability code found in the answers.

CRITICAL: Only assign L1, L2, L3, or L4 to capability codes that are explicitly evidenced in the Q&A answers. If a code is not mentioned or cannot be inferred from the answers, assign level "UNKNOWN" and score 0.0. Never assume or hallucinate capability levels.

Level judgment: Use the anchor criteria provided in the [역량 레벨 판단 기준] section of the capability codes above. Match the candidate's evidence against each level's criteria to determine the appropriate level.

General level guidance:
- L4 (score 0.9~1.0): Drives architecture at organizational level. Defines team-wide design standards, makes technology selection decisions, leads system redesign for scalability or reliability.
- L3 (score 0.7~0.8): Designs with intent. Makes explicit technology/architecture choices with stated rationale, considers trade-offs, designs for maintainability or performance.
- L2 (score 0.4~0.6): Implements within given design. Follows existing patterns, applies standard structures, makes minor design choices within bounded scope.
- L1 (score 0.1~0.3): No design thinking. Copies examples or follows instructions, cannot articulate why certain approaches were taken.
- UNKNOWN (score 0.0): Mentioned but no concrete evidence of design reasoning or intent.

Scoring rules:
- 1.0: Design thinking is the central theme. L4-level architectural leadership with clear rationale and impact repeated throughout.
- 0.9: Strong L4 evidence. Organization-level design standard or technology direction clearly articulated.
- 0.8: Clear L3 evidence. Explicit design decision with stated rationale, trade-off consideration, or structural improvement described.
- 0.7: L3 hint exists but partial. Some design intent present but reasoning not fully elaborated.
- 0.6: Strong L2 with clear context. Applied known pattern with awareness of why it fits.
- 0.4: Clear L2. Followed existing design without articulating intent.
- 0.2: L1 level. No design reasoning present, just implementation steps described.
- 0.1: Mentioned only. No concrete description of design choices or rationale.
- 0.0: Not found in answers.

IMPORTANT: Most candidates score 0.4~0.6. Reserve 0.8+ for exceptionally detailed evidence. Reserve 1.0 only when the capability dominates the entire answer. When in doubt, score lower.

Completeness scoring:
- role (Max 0.2): 0.2 if individual design ownership clearly stated, 0.1 if vague, 0.0 if missing.
- action_tech (Max 0.5): 0.5 if L3+ level (explicit design rationale + trade-off), 0.3 if L2 level (applied pattern, limited reasoning), 0.1 if L1 or vague, 0.0 if missing.
- result (Max 0.3): 0.3 if measurable improvement from design decision, 0.15 if qualitative, 0.0 if missing.

Weak field reasons (Korean):
- If action_tech is L2 or below: "구현 방법만 있어요. 왜 이 구조나 기술을 선택했는지, 다른 방법과 비교한 과정이 있다면 추가해주세요."
- If result is missing or vague: "설계 결정의 결과가 명확하지 않아요. 성능 개선, 유지보수성 향상 등 구체적인 효과가 있다면 알려주세요."
- If role is vague: "본인이 직접 설계를 주도하거나 결정한 부분을 명확히 알려주세요."

Output strictly in valid JSON format. Do NOT use markdown code blocks.
The JSON must contain the following keys exactly:

Key "completenessScore": number
Key "fieldScores": object containing "role": number, "action_tech": number, "result": number
Key "capabilityLevels": object where each key is a CapabilityCode string and value is an object containing "level": string ("L1", "L2", "L3", "L4", or "UNKNOWN") and "score": number
Key "needsFollowUp": boolean (true if completenessScore < 0.7 OR any core capability is UNKNOWN)
Key "weakFields": array of strings
Key "weakReasons": object with string keys and Korean string values
Key "followUpTarget": string (prioritize result over action_tech over role)
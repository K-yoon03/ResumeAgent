You are evaluating a candidate's interview answers to determine the depth of their result orientation and business impact capability.

Experience: {itemName}
Job group: {jobGroup}
Key capabilities: {capabilityCodes}

Q&A:
{qna}

Evaluate each capability code found in the answers.

CRITICAL: Only assign L1, L2, L3, or L4 to capability codes that are explicitly evidenced in the Q&A answers. If a code is not mentioned or cannot be inferred from the answers, assign level "UNKNOWN" and score 0.0. Never assume or hallucinate capability levels.

Level judgment: Use the anchor criteria provided in the [역량 레벨 판단 기준] section of the capability codes above. Match the candidate's evidence against each level's criteria to determine the appropriate level.

General level guidance:
- L4 (score 0.9~1.0): Drives business outcomes at organizational level. Defines KPIs, leads data-driven strategy, connects technical work to measurable business impact across teams.
- L3 (score 0.7~0.8): Owns results with metrics. Sets and tracks own KPIs, proactively identifies improvement opportunities, reports outcomes with quantified data.
- L2 (score 0.4~0.6): Delivers assigned results. Completes tasks with measurable output, reports results when asked, uses given metrics to evaluate work.
- L1 (score 0.1~0.3): Activity-focused. Describes what was done without measurable outcome, cannot connect work to business value.
- UNKNOWN (score 0.0): Mentioned but no concrete evidence of result orientation or business impact.

Scoring rules:
- 1.0: Result orientation is the central theme. L4-level business impact leadership with quantified outcomes repeated throughout.
- 0.9: Strong L4 evidence. Organization-level KPI ownership or cross-team impact clearly described.
- 0.8: Clear L3 evidence. Self-defined metrics, proactive improvement initiative, quantified outcome described.
- 0.7: L3 hint exists but partial. Some metrics present but ownership or proactivity not fully demonstrated.
- 0.6: Strong L2 with clear context. Assigned KPI tracked and reported with specific numbers.
- 0.4: Clear L2. Result mentioned with some measurement, no proactive ownership.
- 0.2: L1 level. Activities described, no measurable outcomes mentioned.
- 0.1: Mentioned only. No concrete metrics or business impact described.
- 0.0: Not found in answers.

IMPORTANT: Most candidates score 0.4~0.6. Reserve 0.8+ for exceptionally detailed evidence. Reserve 1.0 only when the capability dominates the entire answer. When in doubt, score lower.

Completeness scoring:
- role (Max 0.2): 0.2 if ownership of the result clearly stated, 0.1 if vague, 0.0 if missing.
- action_tech (Max 0.5): 0.5 if L3+ level (self-driven metric definition + improvement), 0.3 if L2 level (assigned metric delivery), 0.1 if L1 or vague, 0.0 if missing.
- result (Max 0.3): 0.3 if quantified business impact or KPI achievement stated, 0.15 if qualitative, 0.0 if missing.

Weak field reasons (Korean):
- If action_tech is L2 or below: "수행한 일만 있어요. 성과를 어떻게 측정했는지, 목표 대비 달성률이나 개선 수치가 있다면 추가해주세요."
- If result is missing or vague: "결과가 명확하지 않아요. 매출 증가율, 비용 절감액, 처리량 변화 등 수치화된 성과가 있다면 알려주세요."
- If role is vague: "본인이 해당 성과에 직접 기여하거나 책임진 부분을 명확히 알려주세요."

Output strictly in valid JSON format. Do NOT use markdown code blocks.
The JSON must contain the following keys exactly:

Key "completenessScore": number
Key "fieldScores": object containing "role": number, "action_tech": number, "result": number
Key "capabilityLevels": object where each key is a CapabilityCode string and value is an object containing "level": string ("L1", "L2", "L3", "L4", or "UNKNOWN") and "score": number
Key "needsFollowUp": boolean (true if completenessScore < 0.7 OR any core capability is UNKNOWN)
Key "weakFields": array of strings
Key "weakReasons": object with string keys and Korean string values
Key "followUpTarget": string (prioritize result over action_tech over role)
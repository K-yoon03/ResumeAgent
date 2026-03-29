You are extracting facts from a design/engineering candidate's interview answers.
Do not evaluate. Do not score. Extract only what is explicitly stated.

Capability codes to check: {capCodes}
Q&A:
{qna}

Output JSON only, no markdown.
The output must be a single JSON object with these fields:
- mentionedToolsOrMaterials: array of strings (specific tools, software, materials, or standards mentioned)
- projectCount: number (count of distinct design projects or assignments mentioned)
- hasConcreteOutcome: boolean (true only if a specific result is described)
- hasRoleDescription: boolean (true if the person described their specific design role or contribution)
- hasConstraintMention: boolean (true if a physical, legal, or material constraint was explicitly mentioned)
- hasDesignDecision: boolean (true if the person described a specific design choice and its rationale)
- hasRegulationMention: boolean (true if any law, code, or standard was explicitly mentioned)
- strengths: array of Korean strings (2-3 genuine strengths based ONLY on what was explicitly mentioned)
- improvements: array of Korean strings (2-3 areas to improve based ONLY on what was missing or weak)

You are extracting facts from a developer's interview answers.
Do not evaluate. Do not score. Extract only what is explicitly stated.

Capability codes to check: {capCodes}
Q&A:
{qna}

Output JSON only, no markdown.
The output must be a single JSON object with these fields:
- mentionedSkills: array of strings (specific technology or tool names explicitly mentioned)
- projectCount: number (count of distinct projects or implementations mentioned)
- hasConcreteOutcome: boolean (true only if a specific result is described)
- hasRoleDescription: boolean (true if the person described their specific role or contribution)
- hasTechnicalProblem: boolean (true if a specific technical issue or challenge was mentioned)
- hasTroubleshooting: boolean (true if the person described how they resolved a technical problem)
- strengths: array of Korean strings (2-3 genuine strengths based ONLY on what was explicitly mentioned)
- improvements: array of Korean strings (2-3 areas to improve based ONLY on what was missing or weak)

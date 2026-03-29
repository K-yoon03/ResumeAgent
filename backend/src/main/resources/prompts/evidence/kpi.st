You are extracting facts from a business candidate's interview answers.
Do not evaluate. Do not score. Extract only what is explicitly stated.

Capability codes to check: {capCodes}
Q&A:
{qna}

Output JSON only, no markdown.
The output must be a single JSON object with these fields:
- mentionedTools: array of strings (specific tools, platforms, or systems mentioned)
- projectCount: number (count of distinct projects, campaigns, or assignments mentioned)
- hasConcreteOutcome: boolean (true only if a specific result is described)
- hasMetricOrNumber: boolean (true only if any specific number, percentage, or measurable figure is mentioned)
- hasRoleDescription: boolean (true if the person described their specific role or contribution)
- hasStakeholderMention: boolean (true if other people, teams, or departments were explicitly mentioned)
- hasDecisionProcess: boolean (true if the person described a decision they made or participated in)
- strengths: array of Korean strings (2-3 genuine strengths based ONLY on what was explicitly mentioned)
- improvements: array of Korean strings (2-3 areas to improve based ONLY on what was missing or weak)

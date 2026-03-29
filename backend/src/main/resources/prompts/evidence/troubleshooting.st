You are extracting facts from a process/manufacturing/bio candidate's interview answers.
Do not evaluate. Do not score. Extract only what is explicitly stated.

Capability codes to check: {capCodes}
Q&A:
{qna}

Output JSON only, no markdown.
The output must be a single JSON object with these fields:
- mentionedEquipmentOrProcess: array of strings (specific equipment, process names, or standards explicitly mentioned)
- projectCount: number (count of distinct experiences or assignments mentioned)
- hasConcreteOutcome: boolean (true only if a measurable result is described)
- hasRoleDescription: boolean (true if the person described their specific role or action)
- hasErrorOrDefectMention: boolean (true if a specific error, defect, or failure was mentioned)
- hasTroubleshooting: boolean (true if the person described how they identified and resolved the problem)
- hasComplianceMention: boolean (true if any standard, regulation, or SOP was explicitly mentioned)
- strengths: array of Korean strings (2-3 genuine strengths based ONLY on what was explicitly mentioned)
- improvements: array of Korean strings (2-3 areas to improve based ONLY on what was missing or weak)

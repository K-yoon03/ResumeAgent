You are extracting structured career data from interview Q&A.
Extract facts only. Do NOT invent or assume details not explicitly mentioned.

Experience: {itemName}
Job group: {jobGroup}

Q&A:
{qna}

Extract the following fields:

- role: string (the candidate specific role or responsibility, 1-2 sentences Korean)
- action: string (what they concretely did — decisions, behaviors, processes. Exclude tool names. Korean)
- tech: array of strings (specific tools, languages, frameworks, systems mentioned. English names preferred)
- result: string (outcome, impact, or metric. If no number given, describe qualitative change. Korean)
- completenessScore: number (0.0-1.0, based on how complete the data is)

Rules:
- action and tech must NOT overlap. action = behavior, tech = tools
- If a field is truly missing, use null (not empty string)
- result should be as specific as possible — preserve any numbers mentioned
- Keep Korean text natural and concise

Output strictly in valid JSON format. Do NOT use markdown code blocks.
The JSON must contain the following keys exactly:

Key "role": string or null
Key "action": string or null
Key "tech": array of strings
Key "result": string or null
Key "completenessScore": number
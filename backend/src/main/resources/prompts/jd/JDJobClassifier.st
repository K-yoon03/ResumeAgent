You are a job code classifier for a Korean career platform.
Your task is to classify the job description into exactly one job code.

== Job Code List ==
{jobCodeList}

== Job Description ==
{jdText}

== Instructions ==
- Select exactly ONE jobCode from the list above.
- Extract concrete evidence phrases directly from the JD text (do not paraphrase).
- Provide a confidence score between 0.0 and 1.0.

== Output Format ==
Respond ONLY with a valid JSON object. No explanation, no markdown, no code block.
The JSON must contain: jobCode (string), confidence (number), jobCodeEvidence (array of strings).
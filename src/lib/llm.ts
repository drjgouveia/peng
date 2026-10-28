export interface LlmConfig {
    provider: 'ollama' | 'openai';
    endpoint: string;
    apiKey: string;
    model: string;
}

export interface LlmSuggestion {
    description: string;
    impact: string;
    remediation: string;
    businessSummary: string;
}

export const DEFAULT_LLM_CONFIG: LlmConfig = {
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    apiKey: '',
    model: 'llama3.1',
};

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TEMPERATURE = 0.1;

function buildPrompt(title: string, poc: string, requestResponses: { request: string; response: string }[]): string {
    const rrText = requestResponses
        .filter((rr) => rr.request || rr.response)
        .map((rr, i) => {
            let entry = `--- Request/Response ${i + 1} ---\n`;
            if (rr.request) entry += `Request:\n${rr.request}\n`;
            if (rr.response) entry += `Response:\n${rr.response}\n`;
            return entry;
        })
        .join('\n');

    const pocText = poc || 'No proof of concept provided.';

    return `You are a senior penetration testing analyst. Based on the vulnerability details below, provide a concise description, impact assessment, and remediation guidance. Be brief and to the point.

Vulnerability Title: ${title}

Proof of Concept:
${pocText}

${rrText ? `Request/Response Data:\n${rrText}` : ''}

Provide your response in the following JSON format (no markdown, no code fences):
{
  "description": "A brief, technical description of the vulnerability. 1-2 sentences maximum.",
  "impact": "The potential business and technical impact if exploited. 1-2 sentences maximum.",
  "remediation": "Actionable fix recommendations. 2-3 sentences maximum.",
  "businessSummary": "A concise summary of the business impact for non-technical stakeholders. 1-2 sentences maximum."
}

IMPORTANT: Never use the em dash character (\u2014) in your response. Use only the regular hyphen (-) instead.`;
}

function stripCodeFences(raw: string): string {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    return cleaned.trim();
}

function isValidSuggestion(obj: unknown): obj is LlmSuggestion {
    if (typeof obj !== 'object' || obj === null) return false;
    const o = obj as Record<string, unknown>;
    return (
        typeof o.description === 'string' &&
        typeof o.impact === 'string' &&
        typeof o.remediation === 'string' &&
        typeof o.businessSummary === 'string'
    );
}

function parseResponse(raw: string): LlmSuggestion {
    const cleaned = stripCodeFences(raw);

    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('LLM response did not contain valid JSON');
        }
    }

    if (!isValidSuggestion(parsed)) {
        throw new Error('LLM response is missing required fields (description, impact, remediation, businessSummary)');
    }

    return {
        description: parsed.description.trim(),
        impact: parsed.impact.trim(),
        remediation: parsed.remediation.trim(),
        businessSummary: parsed.businessSummary.trim(),
    };
}

async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number,
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number,
    timeoutMs: number,
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options, timeoutMs);
            if (response.ok) return response;

            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            lastError = new Error(`API error: ${response.status} ${response.statusText}`);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                throw new Error(`Request timed out after ${timeoutMs}ms`);
            }
            lastError = err instanceof Error ? err : new Error(String(err));
        }

        if (attempt < maxRetries) {
            const delay = Math.min(1000 * 2 ** attempt, 8000);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError ?? new Error('Request failed after retries');
}

async function callOllama(
    config: LlmConfig,
    prompt: string,
    timeoutMs: number,
    maxRetries: number,
): Promise<string> {
    const url = `${config.endpoint.replace(/\/$/, '')}/api/generate`;
    const response = await fetchWithRetry(
        url,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.model,
                prompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: DEFAULT_TEMPERATURE,
                },
            }),
        },
        maxRetries,
        timeoutMs,
    );

    const data = await response.json();
    if (!data.response) {
        throw new Error('Ollama response missing "response" field');
    }
    return data.response;
}

async function callOpenAi(
    config: LlmConfig,
    prompt: string,
    timeoutMs: number,
    maxRetries: number,
): Promise<string> {
    const url = `${config.endpoint.replace(/\/$/, '')}/chat/completions`;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetchWithRetry(
        url,
        {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: 'system', content: 'You are a senior penetration testing analyst. Respond with valid JSON only.' },
                    { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
                temperature: DEFAULT_TEMPERATURE,
            }),
        },
        maxRetries,
        timeoutMs,
    );

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('OpenAI response missing message content');
    }
    return content;
}

export interface GenerateOptions {
    timeoutMs?: number;
    maxRetries?: number;
}

export async function generateSuggestions(
    config: LlmConfig,
    title: string,
    poc: string,
    requestResponses: { request: string; response: string }[],
    options: GenerateOptions = {},
): Promise<LlmSuggestion> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    const prompt = buildPrompt(title, poc, requestResponses);
    const raw = config.provider === 'ollama'
        ? await callOllama(config, prompt, timeoutMs, maxRetries)
        : await callOpenAi(config, prompt, timeoutMs, maxRetries);

    return parseResponse(raw);
}

export async function generateExecutiveSummary(
    config: LlmConfig,
    findings: { title: string; severity: string; description: string; impact: string; remediation: string; poc: string }[],
    options: GenerateOptions = {},
): Promise<string> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    const findingsText = findings
        .filter((f) => f.title || f.description)
        .map((f, i) => {
            let entry = `--- Finding ${i + 1}: ${f.title || 'Untitled'} ---\n`;
            entry += `Severity: ${f.severity}\n`;
            if (f.description) entry += `Description: ${f.description}\n`;
            if (f.impact) entry += `Impact: ${f.impact}\n`;
            if (f.remediation) entry += `Remediation: ${f.remediation}\n`;
            if (f.poc) entry += `Proof of Concept: ${f.poc}\n`;
            return entry;
        })
        .join('\n');

    const prompt = `You are a senior penetration testing analyst writing an executive summary for a penetration test report. Based on the findings below, write a concise, high-level executive summary for non-technical stakeholders (C-level executives). Focus on business risk, overall security posture, and key recommendations. Do not include technical details or code. Never use the em dash character (\u2014) - use only the regular hyphen (-) instead.

Findings:
${findingsText}

Return ONLY the executive summary text, no explanation, no markdown, no code fences.`;

    const raw = config.provider === 'ollama'
        ? await callOllama(config, prompt, timeoutMs, maxRetries)
        : await callOpenAi(config, prompt, timeoutMs, maxRetries);

    return stripCodeFences(raw).trim();
}

export async function adjustText(
    config: LlmConfig,
    text: string,
    instruction: string,
    options: GenerateOptions = {},
): Promise<string> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    const prompt = `You are a penetration testing report editor. Adjust the following text according to the instruction provided. Return ONLY the adjusted text, no explanation, no markdown, no code fences. Never use the em dash character (\u2014) - use only the regular hyphen (-) instead.

Instruction: ${instruction}

Text to adjust:
${text}`;

    const raw = config.provider === 'ollama'
        ? await callOllama(config, prompt, timeoutMs, maxRetries)
        : await callOpenAi(config, prompt, timeoutMs, maxRetries);

    return stripCodeFences(raw).trim();
}

export async function stripPocComments(
    config: LlmConfig,
    poc: string,
    options: GenerateOptions = {},
): Promise<string> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    const prompt = `You are a code cleanup assistant. Remove ALL comments from the following proof-of-concept code. Keep only the header comment at the top that explains what the code does. Remove every other comment (inline comments, block comments, TODO notes, etc.). Return ONLY the cleaned code, no explanation, no markdown, no code fences. Never use the em dash character (\u2014) - use only the regular hyphen (-) instead.

Proof of Concept Code:
${poc}`;

    const raw = config.provider === 'ollama'
        ? await callOllama(config, prompt, timeoutMs, maxRetries)
        : await callOpenAi(config, prompt, timeoutMs, maxRetries);

    return stripCodeFences(raw).trim();
}

export async function redactPii(
    config: LlmConfig,
    requestResponses: { id: string; request: string; response: string }[],
    options: GenerateOptions = {},
): Promise<{ id: string; request: string; response: string }[]> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    const rrText = requestResponses
        .filter((rr) => rr.request || rr.response)
        .map((rr, i) => {
            let entry = `--- Request/Response ${i + 1} ---\n`;
            if (rr.request) entry += `Request:\n${rr.request}\n`;
            if (rr.response) entry += `Response:\n${rr.response}\n`;
            return entry;
        })
        .join('\n');

    const prompt = `You are a security analyst redacting sensitive data. Remove or mask ALL personally identifiable information (PII) from the following HTTP request/response data. This includes: names, email addresses, phone numbers, IP addresses, session tokens, cookies, passwords, API keys, credit card numbers, social security numbers, and any other sensitive personal data. Replace each PII item with [REDACTED]. Keep the structure and non-sensitive technical data intact. Return ONLY the redacted request/response data in the same format, no explanation, no markdown, no code fences. Never use the em dash character (\u2014) - use only the regular hyphen (-) instead.

Request/Response Data:
${rrText}`;

    const raw = config.provider === 'ollama'
        ? await callOllama(config, prompt, timeoutMs, maxRetries)
        : await callOpenAi(config, prompt, timeoutMs, maxRetries);

    const cleaned = stripCodeFences(raw).trim();

    const result: { id: string; request: string; response: string }[] = [];
    const blocks = cleaned.split(/--- Request\/Response \d+ ---/);

    let blockIndex = 0;
    for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        const requestMatch = trimmed.match(/Request:\n([\s\S]*?)(?=Response:|$)/);
        const responseMatch = trimmed.match(/Response:\n([\s\S]*)$/);

        result.push({
            id: requestResponses[blockIndex]?.id ?? crypto.randomUUID(),
            request: requestMatch ? requestMatch[1].trim() : '',
            response: responseMatch ? responseMatch[1].trim() : '',
        });
        blockIndex++;
    }

    return result.length > 0 ? result : requestResponses;
}

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
}

export const DEFAULT_LLM_CONFIG: LlmConfig = {
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    apiKey: '',
    model: 'llama3.1',
};

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_TOKENS = 2048;

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

    return `You are a senior penetration testing analyst. Based on the vulnerability details below, provide a professional description, impact assessment, and remediation guidance.

Vulnerability Title: ${title}

Proof of Concept:
${pocText}

${rrText ? `Request/Response Data:\n${rrText}` : ''}

Provide your response in the following JSON format (no markdown, no code fences):
{
  "description": "A clear, technical description of the vulnerability explaining what it is, how it works, and why it is a security concern. 2-4 sentences.",
  "impact": "The potential business and technical impact if this vulnerability is exploited. Include specific consequences. 2-4 sentences.",
  "remediation": "Specific, actionable recommendations to fix the vulnerability. Include code examples or configuration changes where applicable. 3-5 sentences."
}`;
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
        typeof o.remediation === 'string'
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
        throw new Error('LLM response is missing required fields (description, impact, remediation)');
    }

    return {
        description: parsed.description.trim(),
        impact: parsed.impact.trim(),
        remediation: parsed.remediation.trim(),
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
                    temperature: 0.3,
                    num_predict: DEFAULT_MAX_TOKENS,
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
                temperature: 0.3,
                max_tokens: DEFAULT_MAX_TOKENS,
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

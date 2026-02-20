import type { GeminiResponse } from '@/lib/types/ai'

export type { GeminiResponse }

export class GeminiService {
    private apiKey: string;
    private endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || '';
    }

    async generate(systemMessage: string, userMessage: string, history: any[] = []): Promise<GeminiResponse> {
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY is not defined in environment variables.');
        }

        const startTime = Date.now();

        // Format history according to Gemini requirements (assistant -> model)
        const contents = [
            ...history.map(h => ({
                role: h.role === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }]
            })),
            { role: 'user', parts: [{ text: userMessage }] }
        ];

        console.log(`Gemini: Sending request with ${history.length} history messages.`);

        const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemMessage }]
                },
                contents,
                generationConfig: {
                    temperature: 0.1, // Lower temperature for more deterministic JSON
                    topP: 1,
                    maxOutputTokens: 2048,
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Gemini API Error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const usageMetadata = data.usageMetadata;
        const latencyMs = Date.now() - startTime;

        if (!text) {
            throw new Error('Empty response from Gemini');
        }

        try {
            // Clean up markdown code blocks if necessary
            const jsonString = text.replace(/```json\n?|```/g, '').trim();
            const parsed = JSON.parse(jsonString);
            parsed._tokenUsage = {
                inputTokens: usageMetadata?.promptTokenCount || 0,
                outputTokens: usageMetadata?.candidatesTokenCount || 0,
                latencyMs,
                modelName: 'gemini-2.0-flash',
                agentType: 'onboarding',
            };
            return parsed;
        } catch (e) {
            console.error('Failed to parse Gemini response as JSON:', text);
            throw new Error('Invalid JSON response from Gemini');
        }
    }
}

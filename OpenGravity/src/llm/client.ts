import Groq from 'groq-sdk';
import { ENV } from '../config/env.js';

const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
}

export async function chatCompletion(messages: ChatMessage[], tools: any[] | null = null): Promise<any> {
    try {
        const options: any = {
            model: DEFAULT_MODEL,
            messages: messages as any,
        };
        
        if (tools && tools.length > 0) {
            options.tools = tools.map((t: any) => ({
                type: 'function',
                function: t
            }));
            options.tool_choice = 'auto'; // allow the model to choose tools
        }
        
        const response = await groq.chat.completions.create(options);
        return response.choices[0].message;
    } catch (error: any) {
        console.error('[LLM] Primary provider (Groq) failed:', error?.message);
        
        // Fallback to OpenRouter if API key is present
        if (ENV.OPENROUTER_API_KEY) {
            console.log('[LLM] Falling back to OpenRouter...');
            const fallbackResponse = await openRouterFallback(messages, tools);
            return fallbackResponse;
        }
        throw error;
    }
}

async function openRouterFallback(messages: ChatMessage[], tools: any[] | null = null): Promise<any> {
    const body: any = {
        model: ENV.OPENROUTER_MODEL,
        messages: messages
    };
    
    if (tools && tools.length > 0) {
        body.tools = tools.map((t: any) => ({
            type: 'function',
            function: t
        }));
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://github.com/OpenGravity',
            'X-Title': 'OpenGravity Agent',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter fallback failed: ${res.statusText} - ${errText}`);
    }
    
    const data = await res.json() as any;
    return data.choices[0].message;
}

import fs from 'fs';

export async function transcribeAudio(filePath: string): Promise<string> {
    try {
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3",
            response_format: "text"
        });
        
        return transcription as unknown as string;
    } catch (error: any) {
        console.error('[LLM] Transcription failed:', error?.message);
        throw error;
    }
}

/**
 * Local LLM integration.
 *
 * Supports two flavours of locally-hosted models:
 *   - `ollama`            → native Ollama API (`/api/tags`, `/api/chat`)
 *   - `openai-compatible` → LM Studio / vLLM / llama.cpp (`/v1/models`,
 *                           `/v1/chat/completions`)
 *
 * Streaming is normalised to plain text chunks so the renderer treats local
 * and cloud output identically.
 */
import {
    DEFAULT_OLLAMA_URL,
    DEFAULT_OPENAI_COMPATIBLE_URL,
} from './config';
import type {
    ChatMessage,
    LocalChatRequest,
    LocalModel,
    LocalProviderKind,
    LocalProviderStatus,
} from '@shared/types';

function normalizeBaseUrl(kind: LocalProviderKind, baseUrl: string): string {
    const fallback = kind === 'ollama' ? DEFAULT_OLLAMA_URL : DEFAULT_OPENAI_COMPATIBLE_URL;
    const url = (baseUrl || fallback).trim().replace(/\/+$/, '');
    if (kind === 'openai-compatible' && !/\/v1$/.test(url) && !/\/v1\//.test(url)) {
        return `${url}/v1`;
    }
    return url;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/** Lists models for a local provider and reports reachability. */
export async function listLocalModels(
    kind: LocalProviderKind,
    baseUrl: string,
    apiKey?: string,
): Promise<LocalProviderStatus> {
    const base = normalizeBaseUrl(kind, baseUrl);
    try {
        if (kind === 'ollama') {
            const res = await fetchWithTimeout(`${base}/api/tags`, { method: 'GET' }, 3500);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as { models?: { name: string }[] };
            const models: LocalModel[] = (data.models ?? []).map((m) => ({
                id: m.name,
                label: m.name,
                kind,
                baseUrl: base,
            }));
            return { kind, baseUrl: base, reachable: true, models };
        }

        const headers: Record<string, string> = {};
        if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
        const res = await fetchWithTimeout(`${base}/models`, { method: 'GET', headers }, 3500);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { data?: { id: string }[] };
        const models: LocalModel[] = (data.data ?? []).map((m) => ({
            id: m.id,
            label: m.id,
            kind,
            baseUrl: base,
        }));
        return { kind, baseUrl: base, reachable: true, models };
    } catch (error) {
        return {
            kind,
            baseUrl: base,
            reachable: false,
            models: [],
            error: error instanceof Error ? error.message : 'Unreachable',
        };
    }
}

/** Streams a local chat completion, invoking `onChunk` with text deltas. */
export async function streamLocalChat(
    req: LocalChatRequest,
    onChunk: (text: string) => void,
    signal: AbortSignal,
): Promise<void> {
    const base = normalizeBaseUrl(req.kind, req.baseUrl);

    if (req.kind === 'ollama') {
        await streamOllama(base, req, onChunk, signal);
    } else {
        await streamOpenAICompatible(base, req, onChunk, signal);
    }
}

async function streamOllama(
    base: string,
    req: LocalChatRequest,
    onChunk: (text: string) => void,
    signal: AbortSignal,
): Promise<void> {
    const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: req.model,
            messages: req.messages,
            stream: true,
        }),
        signal,
    });
    if (!res.ok || !res.body) throw new Error(`Ollama error (${res.status})`);

    for await (const line of iterateLines(res.body)) {
        if (!line.trim()) continue;
        try {
            const parsed = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
            const delta = parsed.message?.content;
            if (delta) onChunk(delta);
            if (parsed.done) break;
        } catch {
            /* partial JSON — ignore */
        }
    }
}

async function streamOpenAICompatible(
    base: string,
    req: LocalChatRequest,
    onChunk: (text: string) => void,
    signal: AbortSignal,
): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.apiKey) headers.Authorization = `Bearer ${req.apiKey}`;

    const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: req.model,
            messages: req.messages,
            stream: true,
        }),
        signal,
    });
    if (!res.ok || !res.body) throw new Error(`Provider error (${res.status})`);

    for await (const rawLine of iterateLines(res.body)) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') break;
        try {
            const parsed = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) onChunk(delta);
        } catch {
            /* ignore malformed chunk */
        }
    }
}

/** Yields lines from a ReadableStream body as they arrive. */
async function* iterateLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n');
            buffer = parts.pop() ?? '';
            for (const part of parts) yield part;
        }
        if (buffer) yield buffer;
    } finally {
        reader.releaseLock();
    }
}

export type { ChatMessage };

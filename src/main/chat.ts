/**
 * Chat orchestration.
 *
 * Routes a chat request to either the cloud backend (`/ai/chat`, SSE) or the
 * user's local LLM, normalising both into a single chunk/done/error stream
 * delivered to the renderer over IPC.
 *
 * Cloud requests are proxied through the main process (not the renderer) so
 * the access token is never exposed to the web layer and CORS is bypassed.
 */
import type { BrowserWindow } from 'electron';
import { EventEmitter } from 'node:events';
import { aiApi } from './api';
import { streamLocalChat } from './localLlm';
import { authManager } from './auth';
import type {
    CloudChatRequest,
    LocalChatRequest,
    StreamEvent,
    FeatureStreamRequest,
} from '@shared/types';

/** Per-request abort controllers so the renderer can cancel a stream. */
const inflight = new Map<string, AbortController>();

export const chatBus = new EventEmitter();

function emit(requestId: string, event: StreamEvent): void {
    chatBus.emit('event', { requestId, event });
}

export function cancelChat(requestId: string): void {
    inflight.get(requestId)?.abort();
    inflight.delete(requestId);
}

export function relayToWindow(win: BrowserWindow): void {
    chatBus.removeAllListeners('event');
    chatBus.on('event', ({ requestId, event }: { requestId: string; event: StreamEvent }) => {
        if (!win.isDestroyed()) {
            win.webContents.send('chat:stream', { requestId, event });
        }
    });
}

/** Starts a cloud (backend) chat stream. Returns the request id. */
export async function startCloudChat(req: CloudChatRequest): Promise<string> {
    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    inflight.set(requestId, controller);

    void (async () => {
        try {
            const session = await authManager.getSession();
            if (!session) throw new Error('Not authenticated');

            const form = new FormData();
            form.append('prompt', req.prompt);
            form.append('model', req.model);
            // Standard chat must send an empty feature — the backend rejects any
            // value not in its VALID_FEATURES allow-list (e.g. 'chat').
            form.append('feature', req.feature ?? '');
            form.append('reasoningEffort', req.reasoningEffort ?? '');
            form.append('isDeepSearch', String(Boolean(req.isDeepSearch)));
            if (req.systemPrompt) form.append('systemPrompt', req.systemPrompt);
            form.append('history', JSON.stringify(req.history ?? []));
            if (req.historyMode) form.append('historyMode', req.historyMode);
            if (req.historyCustomCount != null) {
                form.append('historyCustomCount', String(req.historyCustomCount));
            }
            if (req.cavemanMode) form.append('cavemanMode', req.cavemanMode);

            const res = await aiApi.openChatStream(session.accessToken, form, controller.signal);
            if (!res.body) throw new Error('Streaming not supported');

            await parseSse(res.body, (chunk) => emit(requestId, { type: 'chunk', content: chunk }));

            emit(requestId, { type: 'done' });
        } catch (error) {
            if (controller.signal.aborted) {
                emit(requestId, { type: 'done' });
            } else {
                emit(requestId, {
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Chat failed',
                });
            }
        } finally {
            inflight.delete(requestId);
        }
    })();

    return requestId;
}

/** Starts a local LLM chat stream. Returns the request id. */
export function startLocalChat(req: LocalChatRequest): string {
    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    inflight.set(requestId, controller);

    void (async () => {
        try {
            await streamLocalChat(
                req,
                (chunk) => emit(requestId, { type: 'chunk', content: chunk }),
                controller.signal,
            );
            emit(requestId, { type: 'done' });
        } catch (error) {
            if (controller.signal.aborted) {
                emit(requestId, { type: 'done' });
            } else {
                emit(requestId, {
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Local chat failed',
                });
            }
        } finally {
            inflight.delete(requestId);
        }
    })();

    return requestId;
}

/**
 * Starts a generic AI-feature stream (PRD builder, minutes, study, roasts).
 * The payload is sent as multipart FormData so it matches the web app's
 * `/ai/*` contract exactly, then SSE chunks are relayed to the renderer.
 */
export function startFeatureStream(req: FeatureStreamRequest): string {
    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    inflight.set(requestId, controller);

    void (async () => {
        try {
            const session = await authManager.getSession();
            if (!session) throw new Error('Not authenticated');

            const form = new FormData();
            for (const [key, value] of Object.entries(req.fields ?? {})) {
                form.append(key, value);
            }
            form.append('model', req.model ?? '');
            form.append('history', JSON.stringify(req.history ?? []));

            const res = await aiApi.openStream(
                session.accessToken,
                req.path,
                form,
                controller.signal,
            );
            if (!res.body) throw new Error('Streaming not supported');

            await parseSse(res.body, (chunk) => emit(requestId, { type: 'chunk', content: chunk }));
            emit(requestId, { type: 'done' });
        } catch (error) {
            if (controller.signal.aborted) {
                emit(requestId, { type: 'done' });
            } else {
                emit(requestId, {
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Request failed',
                });
            }
        } finally {
            inflight.delete(requestId);
        }
    })();

    return requestId;
}

/**
 * Runs the (SSE-streamed) study-quiz endpoint to completion and returns the
 * assembled quiz text as a single chunk, then `done`.
 */
export function startStudyQuiz(req: {
    summaryText: string;
    language?: string;
    amount?: number;
    instruction?: string;
    model: string;
}): string {
    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    inflight.set(requestId, controller);

    void (async () => {
        try {
            const session = await authManager.getSession();
            if (!session) throw new Error('Not authenticated');

            const form = new FormData();
            form.append('summaryText', req.summaryText);
            if (req.language) form.append('language', req.language);
            if (req.amount != null) form.append('amount', String(req.amount));
            if (req.instruction) form.append('instruction', req.instruction);
            form.append('model', req.model ?? '');

            const text = (await aiApi.studyQuiz(
                session.accessToken,
                form,
                controller.signal,
            )) as string;
            if (text) emit(requestId, { type: 'chunk', content: text });
            emit(requestId, { type: 'done' });
        } catch (error) {
            if (controller.signal.aborted) {
                emit(requestId, { type: 'done' });
            } else {
                emit(requestId, {
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Request failed',
                });
            }
        } finally {
            inflight.delete(requestId);
        }
    })();

    return requestId;
}


/** Parses an OpenAI-style SSE stream (`data: {content|error}` … `[DONE]`). */
async function parseSse(
    body: ReadableStream<Uint8Array>,
    onChunk: (text: string) => void,
): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const handle = (line: string): boolean => {
        if (!line.startsWith('data:')) return false;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return true;
        try {
            const parsed = JSON.parse(data) as { content?: string; error?: string };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) onChunk(parsed.content);
        } catch (err) {
            if (err instanceof Error && err.message && !/JSON/i.test(err.message)) throw err;
        }
        return false;
    };

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (handle(line)) {
                reader.releaseLock();
                return;
            }
        }
    }
    if (buffer) handle(buffer);
}

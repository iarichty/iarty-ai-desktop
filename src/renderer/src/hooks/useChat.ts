import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge } from '@/lib/bridge';
import type {
    ChatMessage,
    ChatSettings,
    LocalProviderKind,
    StreamEvent,
    UnifiedModel,
} from '@shared/types';

/** Extra chat options forwarded to the cloud backend. */
export interface ChatSendOptions {
    feature?: string;
    systemPrompt?: string;
    reasoningEffort?: string;
    isDeepSearch?: boolean;
    settings?: ChatSettings;
}

interface UseChat {
    messages: ChatMessage[];
    streaming: boolean;
    error: string | null;
    send: (text: string, model: UnifiedModel, opts?: ChatSendOptions) => Promise<void>;
    /** Resend from a specific message index (used by edit + regenerate). */
    sendFrom: (
        text: string,
        model: UnifiedModel,
        keepUpTo: number,
        opts?: ChatSendOptions,
    ) => Promise<void>;
    /** Replace the whole transcript (used by import). */
    setMessages: (messages: ChatMessage[]) => void;
    stop: () => void;
    clear: () => void;
}

const now = (): string => new Date().toISOString();

/**
 * Manages a single chat conversation. Streaming chunks arrive over the
 * `chat:stream` IPC channel and are appended to the trailing assistant message.
 * Mirrors the web app's message flow, including edit/regenerate support.
 */
export function useChat(): UseChat {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const activeRequest = useRef<string | null>(null);
    const messagesRef = useRef<ChatMessage[]>([]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        const off = bridge.chat.onStream(
            ({ requestId, event }: { requestId: string; event: StreamEvent }) => {
                if (requestId !== activeRequest.current) return;

                if (event.type === 'chunk') {
                    setMessages((prev) => {
                        const next = [...prev];
                        const last = next[next.length - 1];
                        if (last && last.role === 'assistant') {
                            next[next.length - 1] = {
                                ...last,
                                content: last.content + event.content,
                            };
                        }
                        return next;
                    });
                } else if (event.type === 'done') {
                    setStreaming(false);
                    activeRequest.current = null;
                } else if (event.type === 'error') {
                    setError(event.message);
                    setMessages((prev) => {
                        const next = [...prev];
                        const last = next[next.length - 1];
                        if (last && last.role === 'assistant') {
                            next[next.length - 1] = {
                                ...last,
                                content: last.content || event.message,
                                failed: true,
                            };
                        }
                        return next;
                    });
                    setStreaming(false);
                    activeRequest.current = null;
                }
            },
        );
        return off;
    }, []);

    const runStream = useCallback(
        async (
            history: ChatMessage[],
            model: UnifiedModel,
            prompt: string,
            opts?: ChatSendOptions,
        ) => {
            setError(null);
            setMessages([...history, { role: 'assistant', content: '', timestamp: now() }]);
            setStreaming(true);

            try {
                let requestId: string;
                // `history` already contains the new user turn at the end.
                if (model.source === 'cloud') {
                    requestId = (await bridge.chat.startCloud({
                        model: model.id,
                        prompt,
                        history,
                        feature: opts?.feature || undefined,
                        systemPrompt: opts?.systemPrompt,
                        reasoningEffort: opts?.reasoningEffort,
                        isDeepSearch: opts?.isDeepSearch,
                        historyMode: opts?.settings?.historyMode,
                        historyCustomCount: opts?.settings?.historyCustomCount,
                        cavemanMode: opts?.settings?.cavemanMode,
                    })) as string;
                } else {
                    requestId = (await bridge.chat.startLocal({
                        kind: model.localKind as LocalProviderKind,
                        baseUrl: model.localBaseUrl as string,
                        model: model.id,
                        messages: history,
                    })) as string;
                }
                activeRequest.current = requestId;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to start chat');
                setMessages((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (last && last.role === 'assistant') {
                        next[next.length - 1] = {
                            ...last,
                            content: err instanceof Error ? err.message : 'Failed to start chat',
                            failed: true,
                        };
                    }
                    return next;
                });
                setStreaming(false);
            }
        },
        [],
    );

    const send = useCallback(
        async (text: string, model: UnifiedModel, opts?: ChatSendOptions) => {
            const history: ChatMessage[] = [
                ...messagesRef.current,
                { role: 'user', content: text, timestamp: now() },
            ];
            await runStream(history, model, text, opts);
        },
        [runStream],
    );

    /**
     * Sends `text` as a fresh user turn, discarding every message after
     * `keepUpTo` (exclusive). Used for editing a prompt and regenerating a reply.
     */
    const sendFrom = useCallback(
        async (
            text: string,
            model: UnifiedModel,
            keepUpTo: number,
            opts?: ChatSendOptions,
        ) => {
            const history: ChatMessage[] = [
                ...messagesRef.current.slice(0, keepUpTo),
                { role: 'user', content: text, timestamp: now() },
            ];
            await runStream(history, model, text, opts);
        },
        [runStream],
    );

    const stop = useCallback(() => {
        if (activeRequest.current) {
            void bridge.chat.cancel(activeRequest.current);
            activeRequest.current = null;
        }
        setStreaming(false);
    }, []);

    const clear = useCallback(() => {
        stop();
        setMessages([]);
        setError(null);
    }, [stop]);

    const replaceMessages = useCallback((next: ChatMessage[]) => {
        setMessages(next);
        setError(null);
    }, []);

    return { messages, streaming, error, send, sendFrom, setMessages: replaceMessages, stop, clear };
}

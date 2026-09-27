import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge } from '@/lib/bridge';
import type {
    ChatMessage,
    LocalProviderKind,
    StreamEvent,
    UnifiedModel,
} from '@shared/types';

interface UseChat {
    messages: ChatMessage[];
    streaming: boolean;
    error: string | null;
    send: (text: string, model: UnifiedModel) => Promise<void>;
    stop: () => void;
    clear: () => void;
}

/**
 * Manages a single chat conversation. Streaming chunks arrive over the
 * `chat:stream` IPC channel and are appended to the trailing assistant message.
 */
export function useChat(): UseChat {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const activeRequest = useRef<string | null>(null);

    useEffect(() => {
        const off = bridge.chat.onStream(({ requestId, event }: { requestId: string; event: StreamEvent }) => {
            if (requestId !== activeRequest.current) return;

            if (event.type === 'chunk') {
                setMessages((prev) => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (last && last.role === 'assistant') {
                        next[next.length - 1] = { ...last, content: last.content + event.content };
                    }
                    return next;
                });
            } else if (event.type === 'done') {
                setStreaming(false);
                activeRequest.current = null;
            } else if (event.type === 'error') {
                setError(event.message);
                setStreaming(false);
                activeRequest.current = null;
            }
        });
        return off;
    }, []);

    const send = useCallback(
        async (text: string, model: UnifiedModel) => {
            setError(null);
            const history: ChatMessage[] = [...messages, { role: 'user', content: text }];
            setMessages([...history, { role: 'assistant', content: '' }]);
            setStreaming(true);

            try {
                let requestId: string;
                if (model.source === 'cloud') {
                    requestId = (await bridge.chat.startCloud({
                        model: model.id,
                        prompt: text,
                        history: history.slice(0, -1),
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
                setStreaming(false);
            }
        },
        [messages],
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

    return { messages, streaming, error, send, stop, clear };
}

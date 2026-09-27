import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge } from '@/lib/bridge';
import { useNotification } from '@/context/NotificationContext';
import type { FeatureStreamRequest, StreamEvent } from '@shared/types';

interface UseFeatureStream {
    content: string;
    streaming: boolean;
    error: string | null;
    run: (req: FeatureStreamRequest) => Promise<void>;
    runStudyQuiz: (req: {
        summaryText: string;
        language?: string;
        amount?: number;
        instruction?: string;
        model: string;
    }) => Promise<void>;
    stop: () => void;
    reset: () => void;
}

/**
 * Streams a single AI-feature response (PRD/minutes/study/roast) into text.
 * Mirrors `useChat` but is stateless between runs — each `run` replaces the
 * accumulated content, which suits the one-shot feature panels.
 */
export function useFeatureStream(): UseFeatureStream {
    const [content, setContent] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const activeRequest = useRef<string | null>(null);
    const { addNotification } = useNotification();

    useEffect(() => {
        const off = bridge.features.onStream(
            ({ requestId, event }: { requestId: string; event: StreamEvent }) => {
                if (requestId !== activeRequest.current) return;
                if (event.type === 'chunk') {
                    setContent((prev) => prev + event.content);
                } else if (event.type === 'done') {
                    setStreaming(false);
                    activeRequest.current = null;
                } else if (event.type === 'error') {
                    setError(event.message);
                    addNotification(event.message, 'error');
                    setStreaming(false);
                    activeRequest.current = null;
                }
            },
        );
        return off;
    }, [addNotification]);

    const run = useCallback(async (req: FeatureStreamRequest) => {
        setContent('');
        setError(null);
        setStreaming(true);
        try {
            const requestId = (await bridge.features.start(req)) as string;
            activeRequest.current = requestId;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed');
            setStreaming(false);
        }
    }, []);

    const runStudyQuiz = useCallback(
        async (req: {
            summaryText: string;
            language?: string;
            amount?: number;
            instruction?: string;
            model: string;
        }) => {
            setContent('');
            setError(null);
            setStreaming(true);
            try {
                const requestId = (await bridge.features.studyQuiz(req)) as string;
                activeRequest.current = requestId;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Request failed');
                setStreaming(false);
            }
        },
        [],
    );

    const stop = useCallback(() => {
        if (activeRequest.current) {
            void bridge.features.cancel(activeRequest.current);
            activeRequest.current = null;
        }
        setStreaming(false);
    }, []);

    const reset = useCallback(() => {
        stop();
        setContent('');
        setError(null);
    }, [stop]);

    return { content, streaming, error, run, runStudyQuiz, stop, reset };
}

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
    /** Replace the accumulated output (used when restoring a saved session). */
    setContent: (value: string) => void;
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
    /** See useChat: adopt the id from the first event to avoid dropping the
     *  first chunk when it arrives before `features.start` resolves. */
    const awaitingRequest = useRef(false);
    const { addNotification } = useNotification();

    useEffect(() => {
        const off = bridge.features.onStream(
            ({ requestId, event }: { requestId: string; event: StreamEvent }) => {
                if (activeRequest.current === null && awaitingRequest.current) {
                    activeRequest.current = requestId;
                    awaitingRequest.current = false;
                } else if (requestId !== activeRequest.current) {
                    return;
                }
                if (event.type === 'chunk') {
                    setContent((prev) => prev + event.content);
                } else if (event.type === 'done') {
                    setStreaming(false);
                    activeRequest.current = null;
                    awaitingRequest.current = false;
                } else if (event.type === 'cancelled') {
                    setStreaming(false);
                    activeRequest.current = null;
                    awaitingRequest.current = false;
                } else if (event.type === 'error') {
                    setError(event.message);
                    addNotification(event.message, 'error');
                    setStreaming(false);
                    activeRequest.current = null;
                    awaitingRequest.current = false;
                }
            },
        );
        return off;
    }, [addNotification]);

    const run = useCallback(async (req: FeatureStreamRequest) => {
        setContent('');
        setError(null);
        setStreaming(true);
        activeRequest.current = null;
        awaitingRequest.current = true;
        try {
            const requestId = (await bridge.features.start(req)) as string;
            activeRequest.current = requestId;
            awaitingRequest.current = false;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed');
            setStreaming(false);
            awaitingRequest.current = false;
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
            activeRequest.current = null;
            awaitingRequest.current = true;
            try {
                const requestId = (await bridge.features.studyQuiz(req)) as string;
                activeRequest.current = requestId;
                awaitingRequest.current = false;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Request failed');
                setStreaming(false);
                awaitingRequest.current = false;
            }
        },
        [],
    );

    const stop = useCallback(() => {
        if (activeRequest.current) {
            void bridge.features.cancel(activeRequest.current);
            activeRequest.current = null;
        }
        awaitingRequest.current = false;
        setStreaming(false);
    }, []);

    const reset = useCallback(() => {
        stop();
        setContent('');
        setError(null);
    }, [stop]);

    const replaceContent = useCallback((value: string) => {
        setError(null);
        setContent(value);
    }, []);

    return { content, streaming, error, run, runStudyQuiz, stop, reset, setContent: replaceContent };
}

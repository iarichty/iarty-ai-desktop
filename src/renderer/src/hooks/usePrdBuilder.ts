import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge } from '@/lib/bridge';
import { useNotification } from '@/context/NotificationContext';
import type { ChatMessage, StreamEvent } from '@shared/types';
import type {
    PrdDesign,
    PrdMessage,
    PrdOutputs,
    PrdSessionStatus,
    PrdSuggestion,
} from '@/types/prd';
import {
    isPrdReadyToGenerate,
    parseDesignOutput,
    parsePrdOutput,
    parseSuggestionOutput,
    toIsoNow,
    uuid,
} from '@/lib/prdHelpers';

export type PrdStage = 'refine' | 'generate' | 'design' | 'suggest';

interface UsePrdBuilder {
    messages: PrdMessage[];
    status: PrdSessionStatus | 'idle';
    outputs: PrdOutputs;
    design: PrdDesign | null;
    projectTitle: string;
    suggestions: PrdSuggestion[];
    isRefining: boolean;
    isGenerating: boolean;
    isDesigning: boolean;
    isSuggesting: boolean;
    refine: (prompt: string, model: string) => Promise<void>;
    generate: (model: string) => Promise<void>;
    design_: (model: string) => Promise<void>;
    suggest: (model: string, opts?: { silent?: boolean }) => Promise<void>;
    editMessage: (id: string, newContent: string, model: string) => Promise<void>;
    regenerateFrom: (id: string, model: string) => Promise<void>;
    reset: () => void;
    loadSession: (session: {
        messages: PrdMessage[];
        outputs: PrdOutputs;
        design: PrdDesign | null;
        projectTitle: string;
        status: PrdSessionStatus;
    }) => void;
}

const EMPTY_OUTPUTS: PrdOutputs = { prd_markdown: '', database_schema: '', page_flow: '' };

/**
 * PRD Builder state machine. Mirrors the web app's four-stage flow
 * (refine → generate → design → suggest) driven by the desktop IPC feature
 * stream, with all parsing done client-side via `prdHelpers`.
 */
export function usePrdBuilder(): UsePrdBuilder {
    const { addNotification } = useNotification();

    const [messages, setMessages] = useState<PrdMessage[]>([]);
    const [status, setStatus] = useState<PrdSessionStatus | 'idle'>('idle');
    const [outputs, setOutputs] = useState<PrdOutputs>(EMPTY_OUTPUTS);
    const [design, setDesign] = useState<PrdDesign | null>(null);
    const [projectTitle, setProjectTitle] = useState('');
    const [suggestions, setSuggestions] = useState<PrdSuggestion[]>([]);
    const [isRefining, setIsRefining] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDesigning, setIsDesigning] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);

    const activeRequest = useRef<string | null>(null);
    const suggestReqId = useRef(0);
    const messagesRef = useRef<PrdMessage[]>([]);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    /** Streams a feature request, invoking `onDone` with the full text. */
    const runStream = useCallback(
        (
            path: string,
            fields: Record<string, string>,
            model: string,
            history: ChatMessage[],
            onDone?: (full: string) => void,
            addPlaceholder = true,
        ): Promise<string | null> => {
            return new Promise((resolve) => {
                const assistantId = uuid();

                // Invalidate in-flight suggestion streams for the previous turn.
                suggestReqId.current += 1;
                setIsSuggesting(false);
                setSuggestions([]);

                if (addPlaceholder) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: assistantId,
                            role: 'assistant',
                            content: '',
                            timestamp: toIsoNow(),
                            ai_model: model,
                            attached_files: [],
                        },
                    ]);
                }

                let accumulated = '';
                let settled = false;
                let requestId = '';
                let off: () => void = () => {};

                const cleanup = (): void => {
                    off();
                    if (activeRequest.current === requestId) activeRequest.current = null;
                };

                const finish = (result: string | null): void => {
                    if (settled) return;
                    settled = true;
                    cleanup();
                    resolve(result);
                };

                const markFailed = (message: string): void => {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === assistantId
                                ? { ...m, content: message, failed: true }
                                : m,
                        ),
                    );
                };

                off = bridge.features.onStream(
                    ({ requestId: rid, event }: { requestId: string; event: StreamEvent }) => {
                        if (rid !== requestId) return;
                        if (event.type === 'chunk') {
                            accumulated += event.content;
                            const next = accumulated;
                            setMessages((prev) =>
                                prev.map((m) => (m.id === assistantId ? { ...m, content: next } : m)),
                            );
                        } else if (event.type === 'done') {
                            if (onDone) onDone(accumulated);
                            finish(accumulated);
                        } else {
                            if (addPlaceholder) markFailed(event.message);
                            addNotification(event.message, 'error');
                            finish(null);
                        }
                    },
                );

                bridge.features
                    .start({ path, model, history, fields })
                    .then((id) => {
                        requestId = id as string;
                        activeRequest.current = requestId;
                    })
                    .catch((err) => {
                        const message =
                            err instanceof Error ? err.message : 'Failed to start request';
                        if (addPlaceholder) markFailed(message);
                        addNotification(message, 'error');
                        finish(null);
                    });
            });
        },
        [addNotification],
    );

    const refine = useCallback(
        async (prompt: string, model: string) => {
            const text = prompt.trim();
            if (!text || isRefining || isGenerating) return;

            const userMsg: PrdMessage = {
                id: uuid(),
                role: 'user',
                content: text,
                timestamp: toIsoNow(),
                ai_model: model,
                attached_files: [],
            };
            const next = [...messagesRef.current, userMsg];
            setMessages(next);
            setStatus('refining');
            setIsRefining(true);

            const history: ChatMessage[] = next.map((m) => ({ role: m.role, content: m.content }));
            await runStream('/ai/prd-builder/refine', { prompt: text }, model, history);
            setIsRefining(false);
        },
        [isRefining, isGenerating, runStream],
    );

    const generate = useCallback(
        async (model: string) => {
            if (isGenerating || isRefining) return;
            if (!isPrdReadyToGenerate(messagesRef.current)) {
                addNotification(
                    'Please answer at least 2 rounds of questions before generating the PRD.',
                    'info',
                );
                return;
            }
            setStatus('generating');
            setIsGenerating(true);

            const history: ChatMessage[] = messagesRef.current.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const result = await runStream(
                '/ai/prd-builder/generate',
                {},
                model,
                history,
                (full) => {
                    const parsed = parsePrdOutput(full);
                    if (parsed) {
                        setOutputs({
                            prd_markdown: parsed.prd_markdown,
                            database_schema: parsed.database_schema,
                            page_flow: parsed.page_flow,
                        });
                        if (parsed.project_title) setProjectTitle(parsed.project_title);
                    }
                },
                false,
            );

            setIsGenerating(false);
            setStatus(result ? 'generated' : 'refining');
        },
        [isGenerating, isRefining, runStream, addNotification],
    );

    const design_ = useCallback(
        async (model: string) => {
            if (isDesigning || isRefining || isGenerating) return;
            setIsDesigning(true);
            try {
                const history: ChatMessage[] = messagesRef.current.map((m) => ({
                    role: m.role,
                    content: m.content,
                }));
                await runStream(
                    '/ai/prd-builder/design',
                    {},
                    model,
                    history,
                    (full) => {
                        const parsed = parseDesignOutput(full);
                        if (parsed) setDesign(parsed);
                    },
                    false,
                );
                addNotification('Design recommendations ready!', 'success');
            } catch {
                addNotification('Failed to generate design recommendations.', 'error');
            } finally {
                setIsDesigning(false);
            }
        },
        [isDesigning, isRefining, isGenerating, runStream, addNotification],
    );

    const suggest = useCallback(
        async (model: string, opts?: { silent?: boolean }) => {
            const lastAssistant = [...messagesRef.current]
                .reverse()
                .find((m) => m.role === 'assistant');
            if (!lastAssistant || lastAssistant.failed) {
                setSuggestions([]);
                return;
            }

            const requestId = (suggestReqId.current += 1);
            if (!opts?.silent) setIsSuggesting(true);
            setSuggestions([]);

            try {
                let accumulated = '';
                await runStream(
                    '/ai/prd-builder/suggest',
                    {},
                    model,
                    messagesRef.current.map((m) => ({ role: m.role, content: m.content })),
                    (full) => {
                        accumulated = full;
                    },
                    false,
                );
                if (suggestReqId.current !== requestId) return;
                const parsed = parseSuggestionOutput(accumulated);
                if (parsed) setSuggestions(parsed);
            } catch {
                if (!opts?.silent) addNotification('Could not load suggested answers.', 'info');
            } finally {
                if (suggestReqId.current === requestId) setIsSuggesting(false);
            }
        },
        [runStream, addNotification],
    );

    const editMessage = useCallback(
        async (id: string, newContent: string, model: string) => {
            if (isRefining || isGenerating) return;
            const idx = messagesRef.current.findIndex((m) => m.id === id);
            if (idx === -1) return;
            const truncated = messagesRef.current.slice(0, idx);
            const edited: PrdMessage = {
                ...messagesRef.current[idx],
                content: newContent,
                timestamp: toIsoNow(),
            };
            const next = [...truncated, edited];
            setMessages(next);
            setStatus('refining');
            setIsRefining(true);
            await runStream(
                '/ai/prd-builder/refine',
                { prompt: newContent },
                model,
                next.map((m) => ({ role: m.role, content: m.content })),
            );
            setIsRefining(false);
        },
        [isRefining, isGenerating, runStream],
    );

    const regenerateFrom = useCallback(
        async (id: string, model: string) => {
            if (isRefining || isGenerating) return;
            const idx = messagesRef.current.findIndex((m) => m.id === id);
            if (idx === -1) return;
            const truncated = messagesRef.current.slice(0, idx);
            const lastUser = [...truncated].reverse().find((m) => m.role === 'user');
            if (!lastUser) return;
            setMessages(truncated);
            setStatus('refining');
            setIsRefining(true);
            await runStream(
                '/ai/prd-builder/refine',
                { prompt: lastUser.content },
                model,
                truncated.map((m) => ({ role: m.role, content: m.content })),
            );
            setIsRefining(false);
        },
        [isRefining, isGenerating, runStream],
    );

    const reset = useCallback(() => {
        setMessages([]);
        setStatus('idle');
        setOutputs(EMPTY_OUTPUTS);
        setDesign(null);
        setProjectTitle('');
        setSuggestions([]);
    }, []);

    const loadSession = useCallback(
        (session: {
            messages: PrdMessage[];
            outputs: PrdOutputs;
            design: PrdDesign | null;
            projectTitle: string;
            status: PrdSessionStatus;
        }) => {
            setMessages(session.messages);
            setOutputs(session.outputs);
            setDesign(session.design);
            setProjectTitle(session.projectTitle);
            setStatus(session.status);
        },
        [],
    );

    return {
        messages,
        status,
        outputs,
        design,
        projectTitle,
        suggestions,
        isRefining,
        isGenerating,
        isDesigning,
        isSuggesting,
        refine,
        generate,
        design_,
        suggest,
        editMessage,
        regenerateFrom,
        reset,
        loadSession,
    };
}


import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge } from '@/lib/bridge';
import { useNotification } from '@/context/NotificationContext';
import { useLanguage } from '@/context/useLanguage';
import type { ChatMessage, StreamEvent } from '@shared/types';
import type {
    PrdDesign,
    PrdMessage,
    PrdMockupPage,
    PrdOutputs,
    PrdSessionStatus,
    PrdSuggestion,
} from '@/types/prd';
import {
    isPrdReadyToGenerate,
    parseDesignOutput,
    parseMockupOutput,
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
    mockups: PrdMockupPage[];
    projectTitle: string;
    suggestions: PrdSuggestion[];
    isRefining: boolean;
    isGenerating: boolean;
    isDesigning: boolean;
    isGeneratingMockups: boolean;
    isSuggesting: boolean;
    refine: (prompt: string, model: string) => Promise<void>;
    generate: (model: string) => Promise<void>;
    design_: (model: string, chosenStyle?: Record<string, unknown> | null) => Promise<void>;
    mockups_: (model: string, pages: string[], chosenStyle?: Record<string, unknown> | null) => Promise<void>;
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
    const { t } = useLanguage();

    const [messages, setMessages] = useState<PrdMessage[]>([]);
    const [status, setStatus] = useState<PrdSessionStatus | 'idle'>('idle');
    const [outputs, setOutputs] = useState<PrdOutputs>(EMPTY_OUTPUTS);
    const [design, setDesign] = useState<PrdDesign | null>(null);
    const [mockups, setMockups] = useState<PrdMockupPage[]>([]);
    const [projectTitle, setProjectTitle] = useState('');
    const [suggestions, setSuggestions] = useState<PrdSuggestion[]>([]);
    const [isRefining, setIsRefining] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDesigning, setIsDesigning] = useState(false);
    const [isGeneratingMockups, setIsGeneratingMockups] = useState(false);
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
            invalidateSuggestions = true,
        ): Promise<string | null> => {
            return new Promise((resolve) => {
                const assistantId = uuid();

                // Invalidate in-flight suggestion streams for the previous turn.
                // A suggest stream must NOT invalidate itself, otherwise its own
                // request id is bumped and the parsed chips are discarded.
                if (invalidateSuggestions) {
                    suggestReqId.current += 1;
                    setIsSuggesting(false);
                    setSuggestions([]);
                }

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
                let awaiting = true;
                let off: () => void = () => {};
                let safety: ReturnType<typeof setTimeout> = setTimeout(() => {}, 0);

                const cleanup = (): void => {
                    off();
                    clearTimeout(safety);
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
                            m.id === assistantId ? { ...m, content: message, failed: true } : m,
                        ),
                    );
                };

                off = bridge.features.onStream(
                    ({ requestId: rid, event }: { requestId: string; event: StreamEvent }) => {
                        // Adopt the id from the first event — the main process
                        // may emit before `features.start` resolves.
                        if (awaiting) {
                            awaiting = false;
                            requestId = rid;
                            activeRequest.current = rid;
                        } else if (rid !== requestId) {
                            return;
                        }
                        if (event.type === 'chunk') {
                            accumulated += event.content;
                            const next = accumulated;
                            setMessages((prev) =>
                                prev.map((m) =>
                                    m.id === assistantId ? { ...m, content: next } : m,
                                ),
                            );
                        } else if (event.type === 'done') {
                            if (onDone) onDone(accumulated);
                            finish(accumulated);
                        } else if (event.type === 'cancelled') {
                            // Keep whatever streamed so far; do not treat as an error.
                            finish(accumulated);
                        } else {
                            if (addPlaceholder) markFailed(event.message);
                            addNotification(event.message, 'error');
                            finish(null);
                        }
                    },
                );

                // Safety net: never leave the stage locked if the main process
                // drops the terminal event (crash, window close, etc.).
                safety = setTimeout(
                    () => {
                        if (addPlaceholder && accumulated) return finish(accumulated);
                        if (addPlaceholder) markFailed(t('errors.requestTimeout'));
                        finish(null);
                    },
                    10 * 60 * 1000,
                );

                bridge.features
                    .start({ path, model, history, fields })
                    .then((id) => {
                        if (awaiting) {
                            awaiting = false;
                            requestId = id as string;
                            activeRequest.current = requestId;
                        }
                    })
                    .catch((err) => {
                        const message =
                            err instanceof Error ? err.message : t('errors.startFailed');
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
                addNotification(t('prd.answerRounds'), 'info');
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
        [isGenerating, isRefining, runStream, addNotification, t],
    );

    const design_ = useCallback(
        async (model: string, chosenStyle?: Record<string, unknown> | null) => {
            if (isDesigning || isRefining || isGenerating) return;
            setIsDesigning(true);
            try {
                const history: ChatMessage[] = messagesRef.current.map((m) => ({
                    role: m.role,
                    content: m.content,
                }));
                await runStream(
                    '/ai/prd-builder/design',
                    chosenStyle ? { chosenStyle: JSON.stringify(chosenStyle) } : {},
                    model,
                    history,
                    (full) => {
                        const parsed = parseDesignOutput(full);
                        if (parsed) {
                            // Echo the user's curated pick back so the UI can render
                            // the chosen catalog style even if the model omitted it.
                            setDesign(
                                chosenStyle
                                    ? {
                                          ...parsed,
                                          chosen_style: chosenStyle as unknown as NonNullable<
                                              PrdDesign['chosen_style']
                                          >,
                                      }
                                    : parsed,
                            );
                        }
                    },
                    false,
                );
                addNotification(t('prd.designReady'), 'success');
            } catch {
                addNotification(t('prd.designFail'), 'error');
            } finally {
                setIsDesigning(false);
            }
        },
        [isDesigning, isRefining, isGenerating, runStream, addNotification, t],
    );

    const mockups_ = useCallback(
        async (
            model: string,
            pages: string[],
            chosenStyle?: Record<string, unknown> | null,
        ) => {
            if (isGeneratingMockups || isRefining || isGenerating) return;
            if (!pages || pages.length === 0) {
                addNotification(t('prd.mockupNoScreens'), 'info');
                return;
            }
            setIsGeneratingMockups(true);
            try {
                const history: ChatMessage[] = messagesRef.current.map((m) => ({
                    role: m.role,
                    content: m.content,
                }));
                const fields: Record<string, string> = { pages: JSON.stringify(pages) };
                if (chosenStyle) fields.chosenStyle = JSON.stringify(chosenStyle);
                await runStream(
                    '/ai/prd-builder/mockup',
                    fields,
                    model,
                    history,
                    (full) => {
                        const parsed = parseMockupOutput(full);
                        if (parsed) setMockups(parsed);
                    },
                    false,
                );
                addNotification(t('prd.mockupReady'), 'success');
            } catch {
                addNotification(t('prd.mockupFail'), 'error');
            } finally {
                setIsGeneratingMockups(false);
            }
        },
        [isGeneratingMockups, isRefining, isGenerating, runStream, addNotification, t],
    );

    const suggest = useCallback(
        async (model: string, opts?: { silent?: boolean }) => {
            // The backend needs at least one non-empty assistant turn to base the
            // suggestions on. Bail out early (with a clear message) if the last
            // assistant message is missing, failed, or still empty — otherwise the
            // request returns "No assistant question to suggest answers for."
            const lastAssistant = [...messagesRef.current]
                .reverse()
                .find((m) => m.role === 'assistant');
            if (!lastAssistant || lastAssistant.failed || !lastAssistant.content.trim()) {
                setSuggestions([]);
                if (!opts?.silent) {
                    addNotification(t('prd.noQuestion'), 'info');
                }
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
                    messagesRef.current
                        .filter((m) => m.content.trim().length > 0)
                        .map((m) => ({ role: m.role, content: m.content })),
                    (full) => {
                        accumulated = full;
                    },
                    false,
                    false,
                );
                if (suggestReqId.current !== requestId) return;
                const parsed = parseSuggestionOutput(accumulated);
                if (parsed) setSuggestions(parsed);
            } catch {
                if (!opts?.silent) addNotification(t('prd.suggestFail'), 'info');
            } finally {
                if (suggestReqId.current === requestId) setIsSuggesting(false);
            }
        },
        [runStream, addNotification, t],
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
        setMockups([]);
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
        mockups,
        projectTitle,
        suggestions,
        isRefining,
        isGenerating,
        isDesigning,
        isGeneratingMockups,
        isSuggesting,
        refine,
        generate,
        design_,
        mockups_,
        suggest,
        editMessage,
        regenerateFrom,
        reset,
        loadSession,
    };
}

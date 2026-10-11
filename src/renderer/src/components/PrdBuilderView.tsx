import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TbBlocks,
    TbSparkles,
    TbWand,
    TbPalette,
    TbLayoutSidebarRightExpand,
    TbArchive,
    TbUpload,
    TbPlus,
    TbUser,
    TbCircleCheckFilled,
    TbFileText,
    TbDatabase,
    TbRoute,
} from 'react-icons/tb';
import type {
    CavemanMode,
    HistoryMode,
    PrdSessionPayload,
    ReasoningEffort,
    UnifiedModel,
} from '@shared/types';
import Loader from './Loader';
import { usePrdBuilder } from '@/hooks/usePrdBuilder';
import { useSessions } from '@/hooks/useSessions';
import { useSessionAutoSave } from '@/hooks/useSessionAutoSave';
import { deriveTitle, newSessionId } from '@/lib/sessions';
import {
    buildPrdArchive,
    downloadBlob,
    parsePrdSession,
    type PrdSessionPackage,
} from '@/lib/sessionTransfer';
import { useNotification } from '@/context/NotificationContext';
import ChatComposer from './ChatComposer';
import FormattedContent from './FormattedContent';
import SuggestionChips from './SuggestionChips';
import PrdResultsWorkspace from './PrdResultsWorkspace';
import DesignStylePicker from './DesignStylePicker';
import { SessionList } from './SessionList';
import { NavbarPortal } from './NavbarPortal';
import { Button } from './Button';
import type { PrdOutputTab, PrdSessionStatus, PrdMessage, PrdDesign } from '@/types/prd';
import { containsPrdOutput, getFileIcon, stripPrdPayload, toIsoNow } from '@/lib/prdHelpers';
import { getDesignStyleById, type DesignStyle } from '@/data/designStyles';
import { useLanguage } from '@/context/useLanguage';

interface Props {
    models: UnifiedModel[];
    selected: UnifiedModel | null;
    autoSave?: boolean;
}

const IDEA_CHIPS = ['prd.idea1', 'prd.idea2', 'prd.idea3', 'prd.idea4'];

/**
 * PRD Builder — a rich, multi-turn interview that produces a PRD, database
 * schema, page flow and design recommendations. Mirrors the web app's
 * `/prd-builder` page: hero empty state, stage header, streaming markdown
 * transcript, suggestion chips and a full results workspace.
 */
export function PrdBuilderView({ models, selected, autoSave = true }: Props): JSX.Element {
    const prd = usePrdBuilder();
    const sessions = useSessions('prd-builder');
    const { addNotification } = useNotification();
    const { t } = useLanguage();

    const [prompt, setPrompt] = useState('');
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [panelTab, setPanelTab] = useState<PrdOutputTab>('prd');
    const [selectedStyleId, setSelectedStyleId] = useState('');
    const [isStylePickerOpen, setIsStylePickerOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [settings, setSettings] = useState<{
        historyMode: HistoryMode;
        historyCustomCount: number;
        cavemanMode: CavemanMode;
        reasoningEffort: ReasoningEffort;
    }>({
        historyMode: 'short',
        historyCustomCount: 12,
        cavemanMode: 'off',
        reasoningEffort: 'medium',
    });

    const importInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const model = models.find((m) => m.id === selected?.id);
    const modelCode = selected?.id ?? '';
    const isEmpty = prd.messages.length === 0;

    const hasOutputs = Boolean(
        prd.outputs.prd_markdown || prd.outputs.database_schema || prd.outputs.page_flow,
    );
    const canGenerate = !prd.isRefining && !prd.isGenerating;
    const canGenerateDesign =
        !prd.design && !prd.isDesigning && !prd.isRefining && !prd.isGenerating && hasOutputs;

    /** Builds the payload for the currently selected curated style (or null). */
    const buildChosenStylePayload = useCallback(() => {
        const style = selectedStyleId ? getDesignStyleById(selectedStyleId) : undefined;
        if (!style) return null;
        return {
            id: style.id,
            name: style.name,
            tagline: style.tagline,
            mood: style.mood,
            color_palette: style.color_palette,
            palette: style.palette,
            typography: style.typography,
            layout: style.layout,
            motion: style.motion,
            implementation_notes: style.implementation_notes,
            unsplash: style.unsplash,
        };
    }, [selectedStyleId]);

    const runGenerateDesign = useCallback(() => {
        void prd.design_(modelCode, buildChosenStylePayload());
    }, [prd, modelCode, buildChosenStylePayload]);

    const handleSelectDesignStyle = useCallback(
        (style: DesignStyle | null) => {
            setSelectedStyleId(style ? style.id : '');
            addNotification(
                style ? t('prd.styleSet').replace('{name}', style.name) : t('prd.styleCleared'),
                'success',
            );
        },
        [addNotification, t],
    );

    /* ── Local session auto-save ────────────────────────────────────────── */
    const firstUserText = prd.messages.find((m) => m.role === 'user')?.content ?? '';
    const sessionTitle = useMemo(
        () => deriveTitle(prd.projectTitle || firstUserText, t('prd.sessionTitle')),
        [prd.projectTitle, firstUserText, t],
    );
    const sessionPayload = useMemo<PrdSessionPayload | null>(
        () =>
            prd.messages.length > 0
                ? {
                      messages: prd.messages,
                      outputs: prd.outputs,
                      design: prd.design,
                      projectTitle: prd.projectTitle,
                      status: prd.status === 'idle' ? 'refining' : prd.status,
                  }
                : null,
        [prd.messages, prd.outputs, prd.design, prd.projectTitle, prd.status],
    );

    useSessionAutoSave<PrdSessionPayload>({
        payload: sessionPayload,
        title: sessionTitle,
        id: sessionId,
        enabled: autoSave,
        onSave: (id, t, p) => void sessions.save({ id, title: t, payload: p }),
    });

    useEffect(() => {
        if (prd.messages.length > 0 && !sessionId) {
            const id = newSessionId('prd-builder');
            setSessionId(id);
            setActiveSessionId(id);
        }
    }, [prd.messages.length, sessionId]);

    const handleOpenSession = useCallback(
        async (id: string) => {
            const stored = await sessions.load(id);
            if (!stored) {
                addNotification(t('prd.openFailed'), 'error');
                return;
            }
            const p = stored.payload as PrdSessionPayload;
            prd.loadSession({
                messages: (p.messages ?? []) as PrdMessage[],
                outputs: p.outputs,
                design: (p.design ?? null) as PrdDesign | null,
                projectTitle: p.projectTitle,
                status: (p.status ?? 'refining') as PrdSessionStatus,
            });
            setSessionId(stored.id);
            setActiveSessionId(stored.id);
            addNotification(t('prd.restored'), 'success');
        },
        [sessions, prd, addNotification, t],
    );

    const handleNewSession = useCallback(() => {
        prd.reset();
        setPrompt('');
        setShowResults(false);
        setSessionId(null);
        setActiveSessionId(null);
    }, [prd]);

    /* ── Speech ─────────────────────────────────────────────────────────── */
    useEffect(() => {
        const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (Ctor) {
            const recognition = new Ctor();
            recognitionRef.current = recognition;
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'id-ID';
            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
            };
            recognition.onerror = (event) => {
                setIsListening(false);
                addNotification(`${t('prd.speechError')}: ${event.error}`, 'error');
            };
        }
    }, [addNotification, t]);

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) {
            addNotification(t('prd.speechUnsupported'), 'error');
            return;
        }
        if (isListening) recognitionRef.current.stop();
        else recognitionRef.current.start();
    }, [addNotification, isListening, t]);

    /* ── Keep the transcript scrolled to the newest message ─────────────── */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [prd.messages, prd.isRefining, prd.isGenerating]);

    /* ── Auto-suggest once an assistant turn completes ──────────────────── */
    const lastMessage = prd.messages[prd.messages.length - 1];
    const lastAssistantId =
        lastMessage && lastMessage.role === 'assistant' && !lastMessage.failed
            ? lastMessage.id
            : null;
    const lastAssistantContent =
        lastMessage && lastMessage.role === 'assistant' ? lastMessage.content : '';
    const suggestRef = useRef(prd.suggest);
    suggestRef.current = prd.suggest;

    useEffect(() => {
        // Only suggest for a COMPLETED assistant turn that actually asked
        // something. Firing while streaming (empty/partial content) sends a
        // history with no assistant message and the backend rejects it with
        // "No assistant question to suggest answers for."
        if (!lastAssistantId || !selected) return;
        if (prd.isRefining || prd.isGenerating || prd.isSuggesting) return;
        if (!lastAssistantContent.trim()) return;
        if (
            lastAssistantContent.includes('[READY_TO_GENERATE]') ||
            lastAssistantContent.includes('```prd-output') ||
            lastAssistantContent.includes('```design-output')
        ) {
            return;
        }
        void suggestRef.current(modelCode, { silent: true });
    }, [
        lastAssistantId,
        lastAssistantContent,
        selected,
        modelCode,
        prd.isRefining,
        prd.isGenerating,
        prd.isSuggesting,
    ]);

    /* ── Actions ────────────────────────────────────────────────────────── */
    const handleSubmit = useCallback(async () => {
        const text = prompt.trim();
        if (!text || !selected) return;
        setPrompt('');
        setAttachedFile(null);
        await prd.refine(text, modelCode);
    }, [prompt, selected, prd, modelCode]);

    const handleExport = useCallback(async () => {
        try {
            const session: PrdSessionPackage = {
                schema_type: 'prd',
                schema_version: 1,
                export_date: toIsoNow(),
                metadata: {
                    project_title: prd.projectTitle,
                    status: prd.status === 'generated' ? 'generated' : 'refining',
                    message_count: prd.messages.length,
                    has_outputs: hasOutputs,
                    has_design: Boolean(prd.design),
                },
                messages: prd.messages,
                outputs: prd.outputs,
                design: prd.design || undefined,
            };

            const filesByIndex = new Map<number, { file: File; name: string; type: string }>();
            prd.messages.forEach((m, i) => {
                const src = (m as { file?: { originalFile?: File; name?: string; type?: string } })
                    .file;
                if (src?.originalFile) {
                    filesByIndex.set(i, {
                        file: src.originalFile,
                        name: src.name ?? src.originalFile.name,
                        type: src.type ?? src.originalFile.type,
                    });
                }
            });

            const blob = await buildPrdArchive(session, filesByIndex);
            const safeTitle = (prd.projectTitle || 'prd-session')
                .replace(/[^a-z0-9-_]+/gi, '-')
                .toLowerCase();
            const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            downloadBlob(blob, `${safeTitle}_${dateStr}.zip`);
            addNotification(t('prd.exportOk'), 'success');
        } catch {
            addNotification(t('prd.exportFail'), 'error');
        }
    }, [prd, hasOutputs, addNotification, t]);

    const handleImport = useCallback(
        async (file: File) => {
            try {
                const { session } = await parsePrdSession(file);
                prd.loadSession({
                    messages: (session.messages ?? []) as PrdMessage[],
                    outputs: session.outputs ?? {
                        prd_markdown: '',
                        database_schema: '',
                        page_flow: '',
                    },
                    design: (session.design ?? null) as PrdDesign | null,
                    projectTitle: session.metadata?.project_title ?? '',
                    status: (session.metadata?.status ?? 'generated') as PrdSessionStatus,
                });
                const id = newSessionId('prd-builder');
                setSessionId(id);
                setActiveSessionId(id);
                addNotification(t('prd.importOk'), 'success');
            } catch (err) {
                addNotification(err instanceof Error ? err.message : t('prd.importFail'), 'error');
            }
        },
        [prd, addNotification, t],
    );

    const handleImportChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
            if (importInputRef.current) importInputRef.current.value = '';
        },
        [handleImport],
    );

    /* ── Open the results workspace automatically once outputs exist ────── */
    useEffect(() => {
        if (!hasOutputs) return;
        const isDesktop = window.matchMedia('(min-width: 768px)').matches;
        if (isDesktop) setShowResults(true);
    }, [hasOutputs]);

    const composerProps = {
        prompt,
        setPrompt,
        attachedFile,
        onAttachFile: (file: File) => {
            setAttachedFile(file);
            setPrompt((prev) => {
                const sep = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
                return `${prev}${sep}@${file.name} `;
            });
        },
        onRemoveAttachment: () => setAttachedFile(null),
        onSubmit: () => void handleSubmit(),
        isLoading: prd.isRefining,
        isModelReady: Boolean(selected),
        isListening,
        onToggleListening: toggleListening,
        model: model?.meta,
        messagesLength: prd.messages.length,
        selectedRole: null,
        feature: 'prd-builder',
        setIsRoleModalOpen: () => {},
        setIsFeatureModalOpen: () => {},
        historyMode: settings.historyMode,
        historyCustomCount: settings.historyCustomCount,
        onHistoryModeChange: (historyMode: HistoryMode) =>
            setSettings((prev) => ({ ...prev, historyMode })),
        onHistoryCustomCountChange: (historyCustomCount: number) =>
            setSettings((prev) => ({ ...prev, historyCustomCount })),
        cavemanMode: settings.cavemanMode,
        onCavemanModeChange: (cavemanMode: CavemanMode) =>
            setSettings((prev) => ({ ...prev, cavemanMode })),
        reasoningEffort: settings.reasoningEffort,
        onReasoningEffortChange: (reasoningEffort: ReasoningEffort) =>
            setSettings((prev) => ({ ...prev, reasoningEffort })),
    };

    return (
        <>
            <DesignStylePicker
                isOpen={isStylePickerOpen}
                selectedId={selectedStyleId}
                onSelect={handleSelectDesignStyle}
                onClose={() => setIsStylePickerOpen(false)}
            />

            {showResults && hasOutputs && (
                <PrdResultsWorkspace
                    outputs={prd.outputs}
                    design={prd.design}
                    projectTitle={prd.projectTitle}
                    activeTab={panelTab}
                    onTabChange={setPanelTab}
                    onAddNotification={addNotification}
                    onRegenerate={() => void prd.generate(modelCode)}
                    isRegenerating={prd.isGenerating}
                    onGenerateDesign={canGenerateDesign ? runGenerateDesign : undefined}
                    isDesigning={prd.isDesigning}
                    onBackToChat={() => setShowResults(false)}
                />
            )}

            <NavbarPortal>
                <SessionList
                    sessions={sessions.sessions}
                    loading={sessions.loading}
                    activeId={activeSessionId}
                    onOpen={(id) => void handleOpenSession(id)}
                    onRename={(id, t) => void sessions.rename(id, t)}
                    onDelete={(id) => void sessions.remove(id)}
                    onNew={handleNewSession}
                    onClearAll={() => void sessions.clearAll()}
                    label={t('prd.sessions')}
                />
                <Button variant="outline" size="sm" onClick={handleNewSession}>
                    <TbPlus className="h-4 w-4" />
                    {t('prd.newBtn')}
                </Button>
            </NavbarPortal>

            <div className="relative flex h-full flex-col">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-2.5">
                    {canGenerate && (
                        <Button size="sm" onClick={() => void prd.generate(modelCode)}>
                            <TbWand className="h-4 w-4" />
                            {t('prd.generate')}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsStylePickerOpen(true)}
                    >
                        <TbPalette className="h-4 w-4" />
                        {selectedStyleId
                            ? getDesignStyleById(selectedStyleId)?.name ?? t('prd.designStyle')
                            : t('prd.designStyle')}
                    </Button>
                    {canGenerateDesign && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={runGenerateDesign}
                            disabled={prd.isDesigning}
                        >
                            <TbPalette className="h-4 w-4" />
                            {prd.isDesigning ? t('prd.designing') : t('prd.generateDesign')}
                        </Button>
                    )}
                    {hasOutputs && (
                        <Button size="sm" variant="outline" onClick={() => setShowResults(true)}>
                            <TbLayoutSidebarRightExpand className="h-4 w-4" />
                            {t('prd.open')}
                        </Button>
                    )}

                    <div className="flex-1" />

                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".json,.zip"
                        onChange={handleImportChange}
                        className="hidden"
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => importInputRef.current?.click()}
                    >
                        <TbUpload className="h-4 w-4" />
                        {t('prd.import')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleExport}>
                        <TbArchive className="h-4 w-4" />
                        {t('prd.export')}
                    </Button>
                </div>

                {isEmpty ? (
                    /* ── Empty state ─────────────────────────────────────── */
                    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4">
                        <div className="pointer-events-none absolute inset-0">
                            <div className="animate-float-slow absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
                            <div
                                className="animate-float-slow absolute -right-16 bottom-1/4 h-80 w-80 rounded-full bg-accent-2/10 blur-3xl"
                                style={{ animationDelay: '1.7s' }}
                            />
                        </div>
                        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
                            <div className="mb-10 text-center">
                                <div className="relative mb-5 inline-block">
                                    <div className="absolute inset-0 bg-linear-to-r from-accent to-accent-2 opacity-20 blur-2xl" />
                                    <h1 className="relative bg-linear-to-br from-accent via-accent to-accent-2 bg-clip-text text-5xl font-black tracking-tight text-transparent md:text-6xl">
                                        {t('prd.heroTitle')}
                                    </h1>
                                </div>
                                <p className="mx-auto max-w-2xl text-base text-text md:text-lg">
                                    {t('prd.heroDesc')}
                                </p>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                                className="w-full"
                            >
                                <ChatComposer {...composerProps} />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.35 }}
                                className="mt-6 flex w-full flex-col items-center gap-3"
                            >
                                <div className="flex flex-wrap justify-center gap-2">
                                    {IDEA_CHIPS.map((ideaKey, i) => (
                                        <motion.button
                                            key={ideaKey}
                                            onClick={() => setPrompt(t(ideaKey))}
                                            animate={{ y: [0, -2, 0] }}
                                            transition={{
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: 'easeInOut',
                                                delay: 0.8 + i * 0.4,
                                            }}
                                            whileHover={{ scale: 1.04 }}
                                            whileTap={{ scale: 0.97 }}
                                            className="cursor-pointer rounded-full border border-border bg-[color:var(--surface)]/70 px-3 py-1.5 text-xs text-text-h transition-colors hover:border-accent hover:text-accent"
                                        >
                                            {t(ideaKey)}
                                        </motion.button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => importInputRef.current?.click()}
                                    className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-text transition-colors hover:text-accent"
                                >
                                    <TbUpload className="h-3.5 w-3.5" />
                                    {t('prd.haveSession')}
                                </button>
                            </motion.div>
                        </div>
                    </div>
                ) : (
                    /* ── Filled state ────────────────────────────────────── */
                    <>
                        <main className="flex-1 overflow-y-auto px-5">
                            <div className="mx-auto max-w-3xl pb-44">
                                <div className="sticky top-0 z-10 mb-6 flex items-center justify-between rounded-2xl border border-border bg-[color:var(--surface)]/80 px-4 py-3 backdrop-blur-xl">
                                    <div className="flex items-center gap-2.5">
                                        <div className="grid h-7 w-7 place-items-center rounded-lg bg-neutral-900 shadow-md dark:bg-white">
                                            <TbSparkles className="h-3.5 w-3.5 text-white dark:text-neutral-900" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-text-h">
                                                {prd.projectTitle || t('prd.refinement')}
                                            </h2>
                                            <p className="font-mono text-[10px] text-text">
                                                {t('prd.status')}: {prd.status.toUpperCase()} ·{' '}
                                                {prd.messages.length} {t('prd.messages')}
                                            </p>
                                        </div>
                                    </div>
                                    <TbBlocks className="h-5 w-5 text-accent" />
                                </div>

                                <div className="space-y-6">
                                    {prd.messages.map((message, index) => (
                                        <PrdBubble
                                            key={message.id}
                                            message={message}
                                            index={index}
                                            isLast={index === prd.messages.length - 1}
                                            isStreaming={prd.isRefining || prd.isGenerating}
                                            onEdit={(id, c) =>
                                                void prd.editMessage(id, c, modelCode)
                                            }
                                            onRegenerate={(id) =>
                                                void prd.regenerateFrom(id, modelCode)
                                            }
                                            onGeneratePrd={
                                                message.role === 'assistant' &&
                                                index === prd.messages.length - 1 &&
                                                message.content.includes('[READY_TO_GENERATE]') &&
                                                canGenerate
                                                    ? () => void prd.generate(modelCode)
                                                    : undefined
                                            }
                                            onOpenResults={
                                                message.role === 'assistant' && hasOutputs
                                                    ? () => setShowResults(true)
                                                    : undefined
                                            }
                                        />
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>
                        </main>

                        <AnimatePresence>
                            <motion.div
                                key="prd-fixed-composer"
                                initial={{ y: 80, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 80, opacity: 0 }}
                                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[color:var(--bg)] via-[color:var(--bg)]/95 to-transparent pt-6"
                            >
                                <div className="pointer-events-auto mx-auto max-w-3xl px-5 pb-5">
                                    <SuggestionChips
                                        visible={Boolean(lastAssistantId)}
                                        suggestions={prd.suggestions}
                                        isLoading={prd.isSuggesting}
                                        disabled={prd.isRefining || prd.isGenerating || !selected}
                                        onPick={(text) => setPrompt(text)}
                                        onRegenerate={() => void prd.suggest(modelCode)}
                                    />
                                    <ChatComposer {...composerProps} />
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </>
                )}
            </div>
        </>
    );
}

/* ── PRD generation progress card ────────────────────────────────────────── */
function PrdStreamProgress({ raw, isDone }: { raw: string; isDone: boolean }): JSX.Element {
    const { t } = useLanguage();
    const hasPrdMarkdown = /"prd_markdown"\s*:/.test(raw);
    const hasDbSchema = /"database_schema"\s*:/.test(raw);
    const hasPageFlow = /"page_flow"\s*:/.test(raw);
    const hasDesign = raw.includes('design_styles');

    const steps = [
        { labelKey: 'prd.stepSynthesizing', icon: TbFileText, done: true },
        { labelKey: 'prd.stepDrafting', icon: TbFileText, done: hasPrdMarkdown },
        { labelKey: 'prd.stepSchema', icon: TbDatabase, done: hasDbSchema },
        { labelKey: 'prd.stepFlow', icon: TbRoute, done: hasPageFlow },
    ];

    return (
        <div className="my-3 max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/95 p-4 text-white shadow-xl">
            <div className="mb-3 flex items-center gap-3">
                {isDone ? (
                    <TbCircleCheckFilled className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                    <Loader className="h-4 w-4 shrink-0" />
                )}
                <span className="text-xs font-bold text-neutral-200">
                    {isDone ? t('prd.artifactsReady') : t('prd.artifactsGenerating')}
                </span>
                {!isDone && hasDesign && (
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                        {t('prd.design')}
                    </span>
                )}
            </div>
            <div className="space-y-2">
                {steps.map((step) => {
                    const Icon = step.icon;
                    return (
                        <div
                            key={step.labelKey}
                            className="flex items-center gap-2.5 text-xs font-medium"
                        >
                            {step.done ? (
                                <TbCircleCheckFilled className="h-4 w-4 shrink-0 text-emerald-400" />
                            ) : isDone ? (
                                <Icon className="h-4 w-4 shrink-0 text-neutral-600" />
                            ) : (
                                <Icon className="h-4 w-4 shrink-0 animate-pulse text-neutral-500" />
                            )}
                            <span
                                className={
                                    step.done
                                        ? 'font-semibold text-neutral-100'
                                        : 'text-neutral-400'
                                }
                            >
                                {t(step.labelKey)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ── PRD message bubble ──────────────────────────────────────────────────── */
function PrdBubble({
    message,
    index,
    isLast,
    isStreaming,
    onEdit,
    onRegenerate,
    onGeneratePrd,
    onOpenResults,
}: {
    message: PrdMessage;
    index: number;
    isLast: boolean;
    isStreaming: boolean;
    onEdit: (id: string, content: string) => void;
    onRegenerate: (id: string) => void;
    onGeneratePrd?: () => void;
    onOpenResults?: () => void;
}): JSX.Element {
    const { t } = useLanguage();
    const isUser = message.role === 'user';
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(message.content);

    // Never surface the machine-readable PRD/design payload in the transcript:
    // strip the ```prd-output fence (or bare JSON object) and render a progress
    // card instead. Without this the raw JSON shows as "weird code", and its
    // long unbroken lines force a horizontal scroll.
    const isPrdOutput = !isUser && containsPrdOutput(message.content);
    const displayContent = isUser ? message.content : stripPrdPayload(message.content);

    if (isUser && editing) {
        return (
            <div className="flex flex-row-reverse gap-4">
                <div className="w-full max-w-xl rounded-2xl border border-border bg-[color:var(--surface)] p-3 shadow-lg">
                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="min-h-16 w-full resize-none bg-transparent text-sm text-text-h outline-none"
                        autoFocus
                    />
                    <div className="mt-2 flex justify-end gap-2">
                        <button
                            onClick={() => {
                                setEditing(false);
                                setDraft(message.content);
                            }}
                            className="cursor-pointer px-3 py-1 text-xs font-medium text-text hover:text-text-h"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={() => {
                                setEditing(false);
                                onEdit(message.id, draft);
                            }}
                            disabled={!draft.trim()}
                            className="cursor-pointer rounded-lg bg-accent px-3 py-1 text-xs font-medium text-[color:var(--accent-contrast)] disabled:opacity-50"
                        >
                            {t('common.saveAndSubmit')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`group flex min-w-0 gap-4 animate-slideUp ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            style={{ animationDelay: `${Math.min(index, 12) * 50}ms` }}
        >
            {isUser ? (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-accent to-accent-2 text-[color:var(--accent-contrast)] shadow-lg">
                    <TbUser className="h-5 w-5" />
                </div>
            ) : null}

            <div
                className={`flex min-w-0 max-w-[85%] flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
                {isUser ? (
                    <div className="inline-block rounded-3xl rounded-tr-md border border-accent/40 bg-linear-to-br from-accent to-accent-2 px-5 py-2 text-[color:var(--accent-contrast)] shadow-lg">
                        <span className="whitespace-pre-wrap font-medium leading-relaxed">
                            {message.attached_files.length > 0 && (
                                <span className="mb-2 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm">
                                    <span>{getFileIcon(message.attached_files[0])}</span>
                                    <span className="truncate">{message.attached_files[0]}</span>
                                </span>
                            )}
                            {message.content}
                        </span>
                    </div>
                ) : message.content === '' && isStreaming ? (
                    <div className="flex items-center gap-3 py-2 text-sm font-medium text-text">
                        <Loader className="h-5 w-5 text-accent" />
                        {t('prd.thinking')}
                    </div>
                ) : message.failed ? (
                    <div className="rounded-2xl bg-amber-500/10 px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400">
                        {t('prd.failedPrefix')} {message.content}
                    </div>
                ) : (
                    <div className="min-w-0 max-w-full text-[14px] leading-relaxed text-text-h">
                        {displayContent && (
                            <FormattedContent
                                content={displayContent}
                                className="min-w-0 break-words"
                            />
                        )}
                        {isPrdOutput && (
                            <PrdStreamProgress raw={message.content} isDone={!isStreaming} />
                        )}
                    </div>
                )}

                <div
                    className={`mt-2 flex items-center gap-2 px-2 opacity-0 transition-opacity group-hover:opacity-100 ${
                        isUser ? 'flex-row-reverse' : 'flex-row'
                    }`}
                >
                    <span className="text-xs text-text/70">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                    {isUser && (
                        <button
                            onClick={() => {
                                setDraft(message.content);
                                setEditing(true);
                            }}
                            className="cursor-pointer p-1 text-xs text-text/70 transition-colors hover:text-accent"
                        >
                            {t('prd.edit')}
                        </button>
                    )}
                    {!isUser && !isStreaming && isLast && (
                        <button
                            onClick={() => onRegenerate(message.id)}
                            className="cursor-pointer p-1 text-xs text-text/70 transition-colors hover:text-accent"
                        >
                            {t('prd.regenerate')}
                        </button>
                    )}
                    {onGeneratePrd && (
                        <button
                            onClick={onGeneratePrd}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-[color:var(--accent-contrast)]"
                        >
                            <TbWand className="h-3.5 w-3.5" />
                            {t('prd.generate')}
                        </button>
                    )}
                    {onOpenResults && (
                        <button
                            onClick={onOpenResults}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-text-h hover:text-accent"
                        >
                            <TbLayoutSidebarRightExpand className="h-3.5 w-3.5" />
                            {t('prd.open')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TbPlus } from 'react-icons/tb';
import type {
    CavemanMode,
    ChatSessionPayload,
    ChatSettings,
    HistoryMode,
    ReasoningEffort,
    UnifiedModel,
} from '@shared/types';
import { useChat } from '@/hooks/useChat';
import { useSessions } from '@/hooks/useSessions';
import { useSessionAutoSave } from '@/hooks/useSessionAutoSave';
import { deriveTitle, newSessionId } from '@/lib/sessions';
import { buildChatArchive, downloadBlob, parseChatSession } from '@/lib/sessionTransfer';
import { useNotification } from '@/context/NotificationContext';
import MessageBubble from './MessageBubble';
import ChatHero from './ChatHero';
import ChatToolbar from './ChatToolbar';
import ChatComposer from './ChatComposer';
import NeuralNetworkCanvas from './NeuralNetworkCanvas';
import RoleSelectionModal from './RoleSelectionModal';
import FeatureSelectionModal from './FeatureSelectionModal';
import { SessionList } from './SessionList';
import { NavbarPortal } from './NavbarPortal';
import { Button } from './Button';
import type { RoleTemplate } from '@/data/roles';

interface Props {
    models: UnifiedModel[];
    selected: UnifiedModel | null;
    onCloudUsed: () => void;
    autoSave?: boolean;
}

/**
 * Full chat experience, mirroring the web app's `chat.tsx`: a hero empty state
 * with the neural backdrop, markdown message bubbles, a sticky composer, role &
 * feature pickers, voice input, and export/import/reset. Every conversation is
 * also auto-saved to disk (see the `sessions` bridge) with a browsable history.
 */
export function ChatPanel({
    models,
    selected,
    onCloudUsed,
    autoSave = true,
}: Props): JSX.Element {
    const sessions = useSessions('chat');
    const chat = useChat();
    const { addNotification } = useNotification();

    const [prompt, setPrompt] = useState('');
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [selectedRole, setSelectedRole] = useState<RoleTemplate | null>(null);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [features, setFeatures] = useState({ feature: '' });
    const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [chatSettings, setChatSettings] = useState<ChatSettings>({
        historyMode: 'short',
        historyCustomCount: 12,
        cavemanMode: 'off',
        reasoningEffort: 'disabled',
    });
    /** Id of the on-disk session backing this conversation (null = unsaved). */
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const importInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const model = models.find((m) => m.id === selected?.id)?.meta;
    const isEmpty = chat.messages.length === 0;

    /* ── Local session persistence ──────────────────────────────────────── */
    const firstUserText = chat.messages.find((m) => m.role === 'user')?.content ?? '';
    const sessionTitle = useMemo(
        () => deriveTitle(firstUserText, 'New chat'),
        [firstUserText],
    );
    const sessionPayload = useMemo<ChatSessionPayload | null>(
        () =>
            chat.messages.length > 0
                ? { messages: chat.messages, modelId: selected?.id }
                : null,
        [chat.messages, selected?.id],
    );

    useSessionAutoSave<ChatSessionPayload>({
        payload: sessionPayload,
        title: sessionTitle,
        id: sessionId,
        enabled: autoSave,
        onSave: (id, title, payload) => void sessions.save({ id, title, payload }),
    });

    // Assign a fresh id the moment the first turn lands.
    useEffect(() => {
        if (chat.messages.length > 0 && !sessionId) {
            const id = newSessionId('chat');
            setSessionId(id);
            setActiveSessionId(id);
        }
    }, [chat.messages.length, sessionId]);

    const handleOpenSession = useCallback(
        async (id: string) => {
            const stored = await sessions.load(id);
            if (!stored) {
                addNotification('Could not open that session.', 'error');
                return;
            }
            const payload = stored.payload as ChatSessionPayload;
            chat.setMessages(payload.messages ?? []);
            setSessionId(stored.id);
            setActiveSessionId(stored.id);
            addNotification('Conversation restored', 'success');
        },
        [sessions, chat, addNotification],
    );

    const handleNewSession = useCallback(() => {
        chat.clear();
        setSessionId(null);
        setActiveSessionId(null);
        setPrompt('');
        setAttachedFile(null);
    }, [chat]);

    /* ── Speech recognition ─────────────────────────────────────────────── */
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
                addNotification(`Speech error: ${event.error}`, 'error');
            };
        }
    }, [addNotification]);

    const toggleListening = useCallback(() => {
        if (!recognitionRef.current) {
            addNotification('Speech recognition is not supported in this environment.', 'error');
            return;
        }
        if (isListening) recognitionRef.current.stop();
        else recognitionRef.current.start();
    }, [addNotification, isListening]);

    /* ── Submit ─────────────────────────────────────────────────────────── */
    const sendOptions = {
        feature: features.feature,
        systemPrompt: selectedRole?.systemPrompt,
        reasoningEffort:
            chatSettings.reasoningEffort === 'disabled' ? '' : chatSettings.reasoningEffort,
        settings: chatSettings,
    };

    const handleSubmit = useCallback(async () => {
        const text = prompt.trim();
        if (!text || !selected) return;
        setPrompt('');
        setAttachedFile(null);
        await chat.send(text, selected, sendOptions);
        if (selected.source === 'cloud') onCloudUsed();
    }, [prompt, selected, chat, onCloudUsed, features.feature, selectedRole, chatSettings]);

    const handleEdit = useCallback(
        async (index: number, newContent: string) => {
            if (!selected) return;
            // Edit replaces the target user turn: keep everything before it.
            await chat.sendFrom(newContent, selected, index, sendOptions);
            if (selected.source === 'cloud') onCloudUsed();
        },
        [selected, chat, onCloudUsed, features.feature, selectedRole, chatSettings],
    );

    const handleRegenerate = useCallback(
        async (index: number) => {
            if (!selected) return;
            const prev = chat.messages[index - 1];
            if (!prev || prev.role !== 'user') return;
            await chat.sendFrom(prev.content, selected, index - 1, sendOptions);
            if (selected.source === 'cloud') onCloudUsed();
        },
        [selected, chat, onCloudUsed],
    );

    /* ── Export / import / reset ────────────────────────────────────────── */
    const handleExport = useCallback(async () => {
        if (chat.messages.length === 0) return;
        try {
            const blob = await buildChatArchive(chat.messages, new Map());
            downloadBlob(blob, `iarty-chat-${new Date().toISOString().slice(0, 10)}.zip`);
            addNotification('Conversation saved successfully as ZIP!', 'success');
        } catch {
            addNotification('Failed to export conversation.', 'error');
        }
    }, [chat.messages, addNotification]);

    const importFile = useCallback(
        async (file: File) => {
            try {
                const { messages } = await parseChatSession(file);
                chat.setMessages(messages);
                const id = newSessionId('chat');
                setSessionId(id);
                setActiveSessionId(id);
                addNotification('Conversation imported successfully!', 'success');
            } catch {
                addNotification('Failed to import conversation. Invalid file format.', 'error');
            }
        },
        [chat, addNotification],
    );

    const handleImportChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) void importFile(file);
            if (importInputRef.current) importInputRef.current.value = '';
        },
        [importFile],
    );

    const handleReset = useCallback(() => {
        chat.clear();
        setAttachedFile(null);
        setPrompt('');
        setSessionId(null);
        setActiveSessionId(null);
    }, [chat]);

    const handleAttachFile = useCallback((file: File) => {
        setAttachedFile(file);
        setPrompt((prev) => {
            const sep = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return `${prev}${sep}@${file.name} `;
        });
    }, []);

    const composerProps = {
        prompt,
        setPrompt,
        attachedFile,
        onAttachFile: handleAttachFile,
        onRemoveAttachment: () => setAttachedFile(null),
        onSubmit: () => void handleSubmit(),
        onStop: chat.stop,
        isLoading: chat.streaming,
        isModelReady: Boolean(selected),
        isListening,
        onToggleListening: toggleListening,
        model,
        messagesLength: chat.messages.length,
        selectedRole,
        feature: features.feature,
        setIsRoleModalOpen,
        setIsFeatureModalOpen,
        historyMode: chatSettings.historyMode,
        historyCustomCount: chatSettings.historyCustomCount,
        onHistoryModeChange: (historyMode: HistoryMode) =>
            setChatSettings((prev) => ({ ...prev, historyMode })),
        onHistoryCustomCountChange: (historyCustomCount: number) =>
            setChatSettings((prev) => ({ ...prev, historyCustomCount })),
        cavemanMode: chatSettings.cavemanMode,
        onCavemanModeChange: (cavemanMode: CavemanMode) =>
            setChatSettings((prev) => ({ ...prev, cavemanMode })),
        reasoningEffort: chatSettings.reasoningEffort,
        onReasoningEffortChange: (reasoningEffort: ReasoningEffort) =>
            setChatSettings((prev) => ({ ...prev, reasoningEffort })),
    };

    return (
        <div className="relative flex h-full flex-col">
            {/* Chat session controls live in the navbar; model picker is global. */}
            <NavbarPortal>
                <SessionList
                    sessions={sessions.sessions}
                    loading={sessions.loading}
                    activeId={activeSessionId}
                    onOpen={(id) => void handleOpenSession(id)}
                    onRename={(id, title) => void sessions.rename(id, title)}
                    onDelete={(id) => void sessions.remove(id)}
                    onNew={handleNewSession}
                    onClearAll={() => void sessions.clearAll()}
                    label="Chats"
                />
                <Button variant="outline" size="sm" onClick={handleReset}>
                    <TbPlus className="h-4 w-4" />
                    New chat
                </Button>
            </NavbarPortal>

            {chat.error && (
                <div className="mx-5 mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                    {chat.error}
                </div>
            )}

            {isEmpty ? (
                /* ── Empty state: neural backdrop + hero + composer ───────── */
                <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4">
                    <NeuralNetworkCanvas className="opacity-80" />
                    <div className="relative z-10 w-full max-w-3xl">
                        <ChatHero
                            onExport={handleExport}
                            onImport={importFile}
                            onReset={handleReset}
                            canExport={chat.messages.length > 0}
                            isThinking={chat.streaming}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            className="mt-2 w-full"
                        >
                            <ChatComposer {...composerProps} />
                        </motion.div>
                    </div>
                </div>
            ) : (
                /* ── Filled state: transcript + sticky composer ───────────── */
                <>
                    <main className="flex-1 overflow-y-auto px-5">
                        <div className="mx-auto max-w-3xl space-y-6 py-6 pb-44">
                            {chat.messages.map((message, index) => (
                                <MessageBubble
                                    key={index}
                                    message={message}
                                    index={index}
                                    isLoading={chat.streaming}
                                    isLastAssistant={
                                        message.role === 'assistant' &&
                                        index === chat.messages.length - 1
                                    }
                                    onEdit={(i, c) => void handleEdit(i, c)}
                                    onRegenerate={(i) => void handleRegenerate(i)}
                                />
                            ))}

                            <ChatToolbar
                                hasMessages={chat.messages.length > 0}
                                isThinking={chat.streaming}
                                onExport={handleExport}
                                onImport={handleImportChange}
                                onReset={handleReset}
                            />
                        </div>
                    </main>

                    <AnimatePresence>
                        <motion.div
                            key="chat-fixed-composer"
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-[color:var(--bg)] via-[color:var(--bg)]/95 to-transparent pt-6"
                        >
                            <div className="pointer-events-auto mx-auto max-w-3xl px-5 pb-5">
                                <ChatComposer {...composerProps} />
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </>
            )}

            <input
                ref={importInputRef}
                type="file"
                accept=".json,.zip"
                onChange={handleImportChange}
                className="hidden"
            />

            <RoleSelectionModal
                isOpen={isRoleModalOpen}
                selectedRole={selectedRole}
                onClose={() => setIsRoleModalOpen(false)}
                onSelect={setSelectedRole}
            />

            <FeatureSelectionModal
                isOpen={isFeatureModalOpen}
                currentFeature={features.feature}
                onClose={() => setIsFeatureModalOpen(false)}
                onSelect={(feature) => setFeatures((prev) => ({ ...prev, feature }))}
            />
        </div>
    );
}

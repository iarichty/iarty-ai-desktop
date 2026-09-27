import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TbPlus } from 'react-icons/tb';
import type {
    CavemanMode,
    ChatSettings,
    HistoryMode,
    ReasoningEffort,
    UnifiedModel,
} from '@shared/types';
import { useChat } from '@/hooks/useChat';
import { useNotification } from '@/context/NotificationContext';
import MessageBubble from './MessageBubble';
import ChatHero from './ChatHero';
import ChatToolbar from './ChatToolbar';
import ChatComposer from './ChatComposer';
import NeuralNetworkCanvas from './NeuralNetworkCanvas';
import RoleSelectionModal from './RoleSelectionModal';
import FeatureSelectionModal from './FeatureSelectionModal';
import { ModelPicker } from './ModelPicker';
import { Button } from './Button';
import type { RoleTemplate } from '@/data/roles';
import type { ChatMessage } from '@shared/types';

interface Props {
    models: UnifiedModel[];
    selected: UnifiedModel | null;
    onSelect: (model: UnifiedModel) => void;
    onCloudUsed: () => void;
}

/**
 * Full chat experience, mirroring the web app's `chat.tsx`: a hero empty state
 * with the neural backdrop, markdown message bubbles, a sticky composer, role &
 * feature pickers, voice input, and export/import/reset.
 */
export function ChatPanel({ models, selected, onSelect, onCloudUsed }: Props): JSX.Element {
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

    const importInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const model = models.find((m) => m.id === selected?.id)?.meta;
    const isEmpty = chat.messages.length === 0;

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
        const data = { title: 'IARTY AI Chat', exportedAt: new Date().toISOString(), messages: chat.messages };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iarty-chat-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addNotification('Conversation saved successfully!', 'success');
    }, [chat.messages, addNotification]);

    const importFile = useCallback(
        async (file: File) => {
            try {
                const text = await file.text();
                const parsed = JSON.parse(text) as { messages?: ChatMessage[] } | ChatMessage[];
                const imported = Array.isArray(parsed) ? parsed : parsed.messages;
                if (!Array.isArray(imported)) throw new Error('Invalid file format');
                chat.setMessages(imported);
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
            {/* Toolbar */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-2.5">
                <ModelPicker models={models} selected={selected} onSelect={onSelect} />
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={handleReset}>
                    <TbPlus className="h-4 w-4" />
                    New chat
                </Button>
            </div>

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
                accept=".json"
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

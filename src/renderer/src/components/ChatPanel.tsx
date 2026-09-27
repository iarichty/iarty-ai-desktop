import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TbSend, TbSquare, TbPlus, TbAlertTriangle } from 'react-icons/tb';
import type { LocalProviderKind, UnifiedModel } from '@shared/types';
import { useChat } from '@/hooks/useChat';
import { MessageList } from './MessageList';
import { ModelPicker } from './ModelPicker';
import { Button } from './Button';

interface Props {
    models: UnifiedModel[];
    selected: UnifiedModel | null;
    onSelect: (model: UnifiedModel) => void;
    localReachable: boolean;
    localKind: LocalProviderKind;
    localBaseUrl: string;
    onRefreshLocal: (kind: LocalProviderKind, baseUrl: string, apiKey?: string) => Promise<void>;
    onCloudUsed: () => void;
}

/**
 * Chat transcript + composer. The app chrome (brand, credits, settings) lives
 * in `TopBar`; this view owns the model toolbar, transcript and input.
 */
export function ChatPanel({
    models,
    selected,
    onSelect,
    localReachable,
    localKind,
    localBaseUrl,
    onRefreshLocal,
    onCloudUsed,
}: Props): JSX.Element {
    const chat = useChat();
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const focus = (): void => textareaRef.current?.focus();
        focus();
        const raf = requestAnimationFrame(focus);
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const next = Math.min(el.scrollHeight, 200);
        el.style.height = `${Number.isFinite(next) && next > 0 ? next : 44}px`;
    }, [input]);

    const canSend = useMemo(
        () => Boolean(input.trim()) && Boolean(selected) && !chat.streaming,
        [input, selected, chat.streaming],
    );

    const submit = async (): Promise<void> => {
        if (!canSend || !selected) return;
        const text = input.trim();
        setInput('');
        await chat.send(text, selected);
        if (selected.source === 'cloud') onCloudUsed();
    };

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-2.5">
                <ModelPicker models={models} selected={selected} onSelect={onSelect} />
                <AnimatePresence>
                    {!localReachable && selected?.source !== 'cloud' && (
                        <motion.button
                            type="button"
                            onClick={() => void onRefreshLocal(localKind, localBaseUrl)}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-500"
                        >
                            <TbAlertTriangle className="h-3.5 w-3.5" />
                            Local provider unreachable
                        </motion.button>
                    )}
                </AnimatePresence>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={chat.clear}>
                    <TbPlus className="h-4 w-4" />
                    New chat
                </Button>
            </div>

            {/* Transcript */}
            <main className="flex-1 overflow-y-auto px-5">
                <div className="mx-auto max-w-3xl">
                    <MessageList messages={chat.messages} streaming={chat.streaming} />
                    <AnimatePresence>
                        {chat.error && (
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400"
                            >
                                {chat.error}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Composer */}
            <footer className="border-t border-border px-5 py-4">
                <div className="mx-auto max-w-3xl">
                    <div className="flex items-end gap-2 rounded-3xl border border-border bg-[color:var(--surface)] p-2 shadow-lg shadow-black/5 backdrop-blur-xl transition-colors focus-within:border-accent/60">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    void submit();
                                }
                            }}
                            rows={1}
                            autoFocus
                            spellCheck={false}
                            placeholder={
                                selected?.source === 'local'
                                    ? 'Chat with your local model…'
                                    : 'How can I help you today?'
                            }
                            className="max-h-48 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-text-h outline-none placeholder:text-text"
                        />
                        {chat.streaming ? (
                            <Button variant="danger" onClick={chat.stop}>
                                <TbSquare className="h-4 w-4" />
                                Stop
                            </Button>
                        ) : (
                            <Button onClick={() => void submit()} disabled={!canSend}>
                                <TbSend className="h-4 w-4" />
                                Send
                            </Button>
                        )}
                    </div>
                    <p className="mt-2 text-center text-[11px] text-text">
                        Enter to send · Shift+Enter for a new line
                    </p>
                </div>
            </footer>
        </div>
    );
}

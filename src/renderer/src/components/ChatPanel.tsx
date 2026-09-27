import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TbSend, TbSquare, TbSettings, TbLogout, TbPlus, TbAlertTriangle } from 'react-icons/tb';
import type { AuthSession, AppSettings, LocalProviderKind, UnifiedModel } from '@shared/types';
import { useChat } from '@/hooks/useChat';
import { useModels, usePlan } from '@/hooks/useModels';
import { MessageList } from './MessageList';
import { ModelPicker } from './ModelPicker';
import { CreditBadge } from './CreditBadge';
import { SettingsPanel } from './SettingsPanel';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './Button';
import { Logo } from './Logo';

interface Props {
    session: AuthSession;
    settings: AppSettings;
    onSaveSettings: (next: AppSettings) => Promise<void>;
    onLogout: () => void;
}

export function ChatPanel({ session, settings, onSaveSettings, onLogout }: Props): JSX.Element {
    const { models, local, refreshLocal } = useModels(true, settings);
    const plan = usePlan(true);
    const chat = useChat();
    const [selected, setSelected] = useState<UnifiedModel | null>(null);
    const [input, setInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if (selected || models.length === 0) return;
        const preferred = models.find((m) => m.source === 'local') ?? models[0];
        setSelected(preferred);
    }, [models, selected]);

    const canSend = useMemo(
        () => Boolean(input.trim()) && Boolean(selected) && !chat.streaming,
        [input, selected, chat.streaming],
    );

    const submit = async (): Promise<void> => {
        if (!canSend || !selected) return;
        const text = input.trim();
        setInput('');
        await chat.send(text, selected);
        if (selected.source === 'cloud') plan.refresh();
    };

    const probe = (kind: LocalProviderKind, baseUrl: string, apiKey?: string): Promise<void> =>
        refreshLocal(kind, baseUrl, apiKey);

    return (
        <div className="flex h-full flex-col bg-bg">
            {/* Header */}
            <header className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent/60 shadow-lg shadow-accent/20">
                        <Logo size={20} color="var(--accent-contrast)" />
                    </div>
                    <div className="leading-tight">
                        <div className="text-sm font-semibold text-text-h">IARTY AI</div>
                        <div className="text-xs text-text">{session.user.email}</div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <CreditBadge plan={plan.plan} remaining={plan.remaining} />
                    <ThemeToggle />
                    <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
                        <TbSettings className="h-4 w-4" />
                        Settings
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onLogout}>
                        <TbLogout className="h-4 w-4" />
                        Sign out
                    </Button>
                </div>
            </header>

            {/* Toolbar */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-2.5">
                <ModelPicker models={models} selected={selected} onSelect={setSelected} />
                <AnimatePresence>
                    {local && !local.reachable && (
                        <motion.span
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-500"
                        >
                            <TbAlertTriangle className="h-3.5 w-3.5" />
                            Local provider unreachable
                        </motion.span>
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
            <footer className="border-t border-border px-5 py-3">
                <div className="mx-auto flex max-w-3xl items-end gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                void submit();
                            }
                        }}
                        rows={1}
                        placeholder={
                            selected?.source === 'local'
                                ? 'Chat with your local model…'
                                : 'Ask anything (uses credits)…'
                        }
                        className="max-h-40 flex-1 resize-none rounded-2xl border border-border bg-[color:var(--surface)] px-4 py-3 text-sm text-text-h outline-none transition-colors placeholder:text-text focus:border-accent"
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
                <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-text">
                    Enter to send · Shift+Enter for a new line
                </p>
            </footer>

            <AnimatePresence>
                {showSettings && (
                    <SettingsPanel
                        settings={settings}
                        onSave={onSaveSettings}
                        onProbe={probe}
                        onClose={() => setShowSettings(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

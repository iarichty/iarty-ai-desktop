import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TbBook, TbPlus } from 'react-icons/tb';
import type { TextSessionPayload, UnifiedModel } from '@shared/types';
import { useFeatureStream } from '@/hooks/useFeatureStream';
import { useSessions } from '@/hooks/useSessions';
import { useSessionAutoSave } from '@/hooks/useSessionAutoSave';
import { deriveTitle, newSessionId } from '@/lib/sessions';
import { useNotification } from '@/context/NotificationContext';
import { Composer } from './Composer';
import { OutputPanel } from './OutputPanel';
import { SessionList } from './SessionList';
import { NavbarPortal } from './NavbarPortal';
import { Button } from './Button';
import FeatureHero from './FeatureHero';

interface Props {
    selected: UnifiedModel | null;
    autoSave?: boolean;
}

type Mode = 'material' | 'quiz';

const LANGUAGES = ['english', 'indonesian'];

/**
 * Study — summarises study material and generates a quiz. The quiz button uses
 * the material summary as input and streams the generated quiz back. Both modes
 * are auto-saved to disk with a browsable history.
 */
export function StudyView({ selected, autoSave = true }: Props): JSX.Element {
    const stream = useFeatureStream();
    const sessions = useSessions('study');
    const { addNotification } = useNotification();
    const [mode, setMode] = useState<Mode>('material');
    const [input, setInput] = useState('');
    const [language, setLanguage] = useState('english');
    const [amount, setAmount] = useState(5);
    const [summary, setSummary] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const pendingSaveRef = useRef(false);

    const payload = useMemo<TextSessionPayload | null>(
        () =>
            stream.content
                ? {
                      input,
                      output: stream.content,
                      meta: { mode, language, amount: String(amount) },
                  }
                : null,
        [input, stream.content, mode, language, amount],
    );
    const title = useMemo(
        () => deriveTitle(input, mode === 'quiz' ? 'Study quiz' : 'Study material'),
        [input, mode],
    );

    useSessionAutoSave<TextSessionPayload>({
        payload,
        title,
        id: sessionId,
        enabled: autoSave,
        onSave: (id, t, p) => void sessions.save({ id, title: t, payload: p }),
    });

    const submit = async (): Promise<void> => {
        const text = input.trim();
        if (!text || !selected) return;
        if (!sessionId) {
            const id = newSessionId('study');
            setSessionId(id);
            setActiveSessionId(id);
        }
        pendingSaveRef.current = true;
        if (mode === 'material') {
            setSummary(text);
            await stream.run({
                path: '/ai/study-material',
                model: selected.id,
                fields: { text, language, amount: String(amount) },
            });
        } else {
            await stream.runStudyQuiz({
                summaryText: text,
                language,
                amount,
                model: selected.id,
            });
        }
    };

    // Persist immediately once the stream finishes.
    useEffect(() => {
        if (!stream.streaming && pendingSaveRef.current && sessionId && stream.content) {
            pendingSaveRef.current = false;
            void sessions.save({
                id: sessionId,
                title: deriveTitle(input, mode === 'quiz' ? 'Study quiz' : 'Study material'),
                payload: {
                    input,
                    output: stream.content,
                    meta: { mode, language, amount: String(amount) },
                },
            });
        }
    }, [stream.streaming, stream.content, sessionId, input, mode, language, amount, sessions]);

    const handleOpen = useCallback(
        async (id: string) => {
            const stored = await sessions.load(id);
            if (!stored) {
                addNotification('Could not open that session.', 'error');
                return;
            }
            const p = stored.payload as TextSessionPayload;
            setInput(p.input ?? '');
            setLanguage(p.meta?.language ?? 'english');
            setAmount(Number(p.meta?.amount) || 5);
            setMode((p.meta?.mode as Mode) ?? 'material');
            stream.setContent(p.output ?? '');
            setSessionId(stored.id);
            setActiveSessionId(stored.id);
            addNotification('Session restored', 'success');
        },
        [sessions, stream, addNotification],
    );

    const handleNew = useCallback(() => {
        stream.reset();
        setInput('');
        setSummary('');
        setSessionId(null);
        setActiveSessionId(null);
    }, [stream]);

    return (
        <div className="flex h-full flex-col">
            <NavbarPortal>
                <SessionList
                    sessions={sessions.sessions}
                    loading={sessions.loading}
                    activeId={activeSessionId}
                    onOpen={(id) => void handleOpen(id)}
                    onRename={(id, t) => void sessions.rename(id, t)}
                    onDelete={(id) => void sessions.remove(id)}
                    onNew={handleNew}
                    onClearAll={() => void sessions.clearAll()}
                    label="Study"
                />
                <Button variant="outline" size="sm" onClick={handleNew}>
                    <TbPlus className="h-4 w-4" />
                    New
                </Button>
            </NavbarPortal>

            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-2.5">
                <div className="flex items-center gap-1 rounded-xl border border-border bg-[color:var(--surface)] p-1">
                    {(['material', 'quiz'] as Mode[]).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m)}
                            className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
                                mode === m
                                    ? 'bg-accent text-[color:var(--accent-contrast)]'
                                    : 'text-text hover:text-accent'
                            }`}
                        >
                            {m === 'material' ? 'Summary' : 'Quiz'}
                        </button>
                    ))}
                </div>
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="rounded-xl border border-border bg-[color:var(--surface)] px-3 py-2 text-sm text-text-h outline-none"
                >
                    {LANGUAGES.map((l) => (
                        <option key={l} value={l}>
                            {l}
                        </option>
                    ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-text">
                    Questions
                    <input
                        type="number"
                        min={1}
                        max={50}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value) || 1)}
                        className="w-16 rounded-lg border border-border bg-[color:var(--surface)] px-2 py-1 text-text-h outline-none"
                    />
                </label>
                {mode === 'quiz' && summary && (
                    <button
                        type="button"
                        onClick={() => setInput(summary)}
                        className="rounded-lg border border-border px-2 py-1 text-xs text-text hover:text-accent"
                    >
                        Use last summary
                    </button>
                )}
            </div>

            <main className="flex-1 overflow-y-auto px-5">
                {stream.content || stream.error ? (
                    <OutputPanel
                        content={stream.content}
                        streaming={stream.streaming}
                        error={stream.error}
                        emptyHint={
                            <>
                                <TbBook className="mb-2 h-8 w-8 text-accent" />
                                {mode === 'material'
                                    ? 'Paste study material to get a structured summary.'
                                    : 'Paste the material summary to generate a quiz.'}
                            </>
                        }
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                        <FeatureHero
                            icon={TbBook}
                            title="Study"
                            description="Summarise dense study material into clear notes, then generate quizzes to test yourself."
                        />
                    </div>
                )}
            </main>

            <footer className="border-t border-border px-5 py-4">
                <Composer
                    value={input}
                    onChange={setInput}
                    onSubmit={() => void submit()}
                    onStop={stream.stop}
                    streaming={stream.streaming}
                    placeholder={
                        mode === 'material'
                            ? 'Paste the text you want summarised…'
                            : 'Paste the summary to quiz yourself on…'
                    }
                />
            </footer>
        </div>
    );
}

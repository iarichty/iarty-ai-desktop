import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TbMicrophone, TbPlus } from 'react-icons/tb';
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

const LANGUAGES = ['auto', 'english', 'indonesian'];

/**
 * Minutes — turns a raw meeting transcript into structured minutes. Mirrors
 * the web app's `/ai/minutes` flow (transcript via prompt, optional language).
 * Every run is auto-saved to disk with a browsable history.
 */
export function MinutesView({ selected, autoSave = true }: Props): JSX.Element {
    const stream = useFeatureStream();
    const sessions = useSessions('minutes');
    const { addNotification } = useNotification();
    const [input, setInput] = useState('');
    const [language, setLanguage] = useState('auto');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const pendingSaveRef = useRef(false);

    const payload = useMemo<TextSessionPayload | null>(
        () =>
            stream.content
                ? { input, output: stream.content, meta: { language } }
                : null,
        [input, stream.content, language],
    );
    const title = useMemo(() => deriveTitle(input, 'Minutes session'), [input]);

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
            const id = newSessionId('minutes');
            setSessionId(id);
            setActiveSessionId(id);
        }
        pendingSaveRef.current = true;
        await stream.run({
            path: '/ai/minutes',
            model: selected.id,
            fields: { optionalPrompt: text, outputLanguage: language },
        });
    };

    // Persist immediately once the stream finishes (so a session is never lost).
    useEffect(() => {
        if (!stream.streaming && pendingSaveRef.current && sessionId && stream.content) {
            pendingSaveRef.current = false;
            void sessions.save({
                id: sessionId,
                title: deriveTitle(input, 'Minutes session'),
                payload: { input, output: stream.content, meta: { language } },
            });
        }
    }, [stream.streaming, stream.content, sessionId, input, language, sessions]);

    const handleOpen = useCallback(
        async (id: string) => {
            const stored = await sessions.load(id);
            if (!stored) {
                addNotification('Could not open that session.', 'error');
                return;
            }
            const p = stored.payload as TextSessionPayload;
            setInput(p.input ?? '');
            setLanguage(p.meta?.language ?? 'auto');
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
                    onRename={(id, title) => void sessions.rename(id, title)}
                    onDelete={(id) => void sessions.remove(id)}
                    onNew={handleNew}
                    onClearAll={() => void sessions.clearAll()}
                    label="Minutes"
                />
                <Button variant="outline" size="sm" onClick={handleNew}>
                    <TbPlus className="h-4 w-4" />
                    New
                </Button>
            </NavbarPortal>

            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-2.5">
                <label className="flex items-center gap-2 text-xs text-text">
                    Output language
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
                </label>
            </div>

            <main className="flex-1 overflow-y-auto px-5">
                {stream.content || stream.error ? (
                    <OutputPanel
                        content={stream.content}
                        streaming={stream.streaming}
                        error={stream.error}
                        emptyHint={
                            <>
                                <TbMicrophone className="mb-2 h-8 w-8 text-accent" />
                                Paste your meeting transcript to generate structured minutes.
                            </>
                        }
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                        <FeatureHero
                            icon={TbMicrophone}
                            title="Minutes"
                            description="Turn a raw meeting transcript into clean, structured minutes with action items and decisions."
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
                    placeholder="Paste the meeting transcript or notes…"
                />
            </footer>
        </div>
    );
}

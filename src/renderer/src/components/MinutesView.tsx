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
import { useLanguage } from '@/context/useLanguage';

interface Props {
    selected: UnifiedModel | null;
    autoSave?: boolean;
}

const LANGUAGES: { value: string; labelKey: string }[] = [
    { value: 'auto', labelKey: 'minutes.langAuto' },
    { value: 'english', labelKey: 'minutes.langEnglish' },
    { value: 'indonesian', labelKey: 'minutes.langIndonesian' },
];

/**
 * Minutes — turns a raw meeting transcript into structured minutes. Mirrors
 * the web app's `/ai/minutes` flow (transcript via prompt, optional language).
 * Every run is auto-saved to disk with a browsable history.
 */
export function MinutesView({ selected, autoSave = true }: Props): JSX.Element {
    const { t } = useLanguage();
    const stream = useFeatureStream();
    const sessions = useSessions('minutes');
    const { addNotification } = useNotification();
    const [input, setInput] = useState('');
    const [language, setLanguage] = useState('auto');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const pendingSaveRef = useRef(false);

    const payload = useMemo<TextSessionPayload | null>(
        () => (stream.content ? { input, output: stream.content, meta: { language } } : null),
        [input, stream.content, language],
    );
    const title = useMemo(() => deriveTitle(input, t('minutes.sessionTitle')), [input, t]);

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
                title: deriveTitle(input, t('minutes.sessionTitle')),
                payload: { input, output: stream.content, meta: { language } },
            });
        }
    }, [stream.streaming, stream.content, sessionId, input, language, sessions, t]);

    const handleOpen = useCallback(
        async (id: string) => {
            const stored = await sessions.load(id);
            if (!stored) {
                addNotification(t('minutes.openFailed'), 'error');
                return;
            }
            const p = stored.payload as TextSessionPayload;
            setInput(p.input ?? '');
            setLanguage(p.meta?.language ?? 'auto');
            stream.setContent(p.output ?? '');
            setSessionId(stored.id);
            setActiveSessionId(stored.id);
            addNotification(t('minutes.restored'), 'success');
        },
        [sessions, stream, addNotification, t],
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
                    label={t('minutes.title')}
                />
                <Button variant="outline" size="sm" onClick={handleNew}>
                    <TbPlus className="h-4 w-4" />
                    {t('common.new')}
                </Button>
            </NavbarPortal>

            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-2.5">
                <label className="flex items-center gap-2 text-xs text-text">
                    {t('minutes.outputLanguage')}
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="rounded-xl border border-border bg-[color:var(--surface)] px-3 py-2 text-sm text-text-h outline-none"
                    >
                        {LANGUAGES.map((l) => (
                            <option key={l.value} value={l.value}>
                                {t(l.labelKey)}
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
                                {t('minutes.empty')}
                            </>
                        }
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                        <FeatureHero
                            icon={TbMicrophone}
                            title={t('minutes.title')}
                            description={t('minutes.heroDesc')}
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
                    placeholder={t('minutes.placeholder')}
                />
            </footer>
        </div>
    );
}

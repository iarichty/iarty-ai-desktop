import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    TbAlertTriangle,
    TbCoins,
    TbDeviceFloppy,
    TbLoader2,
    TbMicrophone2,
    TbPlayerPause,
    TbPlayerPlay,
    TbPlus,
    TbSparkles,
    TbTrash,
    TbUsers,
} from 'react-icons/tb';
import type {
    TtsCatalog,
    TtsClipResult,
    TtsExpressionTag,
    TtsSpeakerInput,
    TtsStylePreset,
    TtsSynthesizeRequest,
    TtsTurnInput,
} from '@shared/types';
import { useLanguage } from '@/context/useLanguage';
import { useNotification } from '@/context/NotificationContext';
import FeatureHero from './FeatureHero';
import { Button } from './Button';

/**
 * Text-to-speech studio (desktop).
 *
 * Mirrors the web studio's feature set — voice choice, delivery style, inline
 * expression tags, two-voice dialogue — but exercises the desktop-specific
 * advantage: saving through the native dialog instead of a browser download.
 *
 * Audio encoding (MP3/OGG/WebM) is intentionally limited to WAV here: the main
 * process writes the bytes it is given, and shipping a second encoder into the
 * Electron bundle is not worth it while WAV is what Gemini produces natively.
 */

const DIALOGUE_KEYS = ['a', 'b'] as const;
type DialogueKey = (typeof DIALOGUE_KEYS)[number];

interface Turn {
    id: string;
    speaker: DialogueKey;
    text: string;
}

let turnSeq = 0;
const nextTurnId = (): string => `turn-${(turnSeq += 1)}`;

/** Maps a backend error message onto actionable copy. */
const describeError = (error: unknown, t: (key: string) => string): string => {
    const message = error instanceof Error ? error.message : '';
    if (/credit|limit|plan/i.test(message)) return t('tts.insufficientCredits');
    if (/busy|429|rate/i.test(message)) return t('tts.busy');
    return message || t('tts.failed');
};

export function TtsView(): JSX.Element {
    const { t } = useLanguage();
    const { addNotification } = useNotification();

    const [catalog, setCatalog] = useState<TtsCatalog | null>(null);
    const [loadError, setLoadError] = useState(false);

    const [isDialogue, setIsDialogue] = useState(false);
    const [text, setText] = useState('');
    const [style, setStyle] = useState('');
    const [voice, setVoice] = useState('Kore');
    const [model, setModel] = useState('gemini-3.8-flash-tts');

    const [names, setNames] = useState<Record<DialogueKey, string>>({ a: 'Aria', b: 'Bima' });
    const [voices, setVoices] = useState<Record<DialogueKey, string>>({ a: 'Kore', b: 'Puck' });
    const [turns, setTurns] = useState<Turn[]>([
        { id: nextTurnId(), speaker: 'a', text: '' },
        { id: nextTurnId(), speaker: 'b', text: '' },
    ]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [clip, setClip] = useState<TtsClipResult | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const textRef = useRef<HTMLTextAreaElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    /** Object URL for the current clip. State (not a ref) so `src` re-renders. */
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    // ── Catalog ──────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        const load = async (): Promise<void> => {
            try {
                const live = await window.iarty.tts.catalog();
                if (cancelled) return;
                setCatalog(live);
                setModel(live.defaultModel);
                setVoice(live.defaultVoice);
                setVoices({ a: live.defaultVoice, b: live.voices[1]?.name ?? live.defaultVoice });
            } catch {
                if (!cancelled) setLoadError(true);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    // ── Derived ──────────────────────────────────────────────────────────
    const activeTurns = useMemo<TtsTurnInput[]>(() => {
        if (!isDialogue) return text.trim() ? [{ text, style }] : [];
        return turns
            .filter((turn) => turn.text.trim().length > 0)
            .map((turn) => ({
                text: turn.text,
                speaker: names[turn.speaker].trim() || turn.speaker.toUpperCase(),
                ...(style ? { style } : {}),
            }));
    }, [isDialogue, text, style, turns, names]);

    const speakers = useMemo<TtsSpeakerInput[]>(() => {
        if (!isDialogue) return [{ name: 'Speaker 1', voice }];
        return DIALOGUE_KEYS.map((key) => ({ name: names[key].trim() || key.toUpperCase(), voice: voices[key] }));
    }, [isDialogue, voice, names, voices]);

    const charCount = activeTurns.reduce((total, turn) => total + turn.text.length, 0);
    const maxChars = catalog?.limits.maxChars ?? 4000;
    const overLimit = charCount > maxChars;
    const hasContent = charCount > 0;

    const request = useMemo<TtsSynthesizeRequest>(() => (
        isDialogue
            ? { model, speakers, turns: activeTurns }
            : { model, text, style, voice }
    ), [isDialogue, model, speakers, activeTurns, text, style, voice]);

    // ── Audio URL lifecycle ──────────────────────────────────────────────
    useEffect(() => {
        if (!clip) return;

        const bytes = Uint8Array.from(atob(clip.audioBase64), (char) => char.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: clip.mimeType }));
        setAudioUrl(url);
        setIsPlaying(false);

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [clip]);

    // Drop the rendered clip when the script changes, so "Save audio as…" can
    // never write audio that no longer matches the visible script.
    useEffect(() => {
        setClip(null);
    }, [text, turns, isDialogue]);

    // ── Actions ──────────────────────────────────────────────────────────
    /** Inserts a tag at the caret of the single-speaker textarea. */
    const insertAtCaret = useCallback((tag: string): void => {
        const element = textRef.current;
        if (!element) {
            setText((prev) => `${prev}${tag}`);
            return;
        }
        const start = element.selectionStart ?? element.value.length;
        const end = element.selectionEnd ?? start;
        setText(`${element.value.slice(0, start)}${tag}${element.value.slice(end)}`);
        const caret = start + tag.length;
        requestAnimationFrame(() => {
            element.focus();
            element.setSelectionRange(caret, caret);
        });
    }, []);

    const handleTag = (tag: string): void => {
        if (!isDialogue) {
            insertAtCaret(tag);
            return;
        }
        // Dialogue mode has no single caret; append to the turn being written.
        setTurns((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last) copy[copy.length - 1] = { ...last, text: `${last.text}${tag}` };
            return copy;
        });
    };

    const generate = async (): Promise<void> => {
        if (!hasContent || overLimit || isGenerating) return;

        setIsGenerating(true);
        try {
            const result = await window.iarty.tts.synthesize(request);
            setClip(result);
            addNotification(t('tts.success'), 'success');
        } catch (error) {
            addNotification(describeError(error, t), 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const togglePlay = async (): Promise<void> => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isPlaying) {
            audio.pause();
            return;
        }
        try {
            await audio.play();
        } catch {
            setIsPlaying(false);
        }
    };

    const saveClip = async (): Promise<void> => {
        if (!clip || isSaving) return;
        setIsSaving(true);
        try {
            const title = (activeTurns[0]?.text ?? 'iarty-speech').slice(0, 40)
                .replace(/[^a-zA-Z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .toLowerCase() || 'iarty-speech';
            const result = await window.iarty.tts.saveAs({
                base64: clip.audioBase64,
                filename: `${title}.wav`,
            });
            if (result.saved) addNotification(t('tts.saved'), 'success');
        } catch (error) {
            addNotification(describeError(error, t), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────
    const stylePresets: TtsStylePreset[] = catalog?.stylePresets ?? [];
    const tagGroups = catalog?.expressionTags ?? [];

    return (
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-y-auto px-6 pb-10 pt-6">
            <FeatureHero icon={TbSparkles} title={t('tts.title')} description={t('tts.subtitle')} />

            {loadError && (
                <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                    <TbAlertTriangle className="mt-0.5 shrink-0" />
                    <span>{t('tts.catalogError')}</span>
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
                {/* ── Script editor ───────────────────────────────────── */}
                <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <h2 className="text-sm font-bold text-text-h">{t('tts.script')}</h2>
                        <div className="flex rounded-full bg-[color:var(--bg)] p-0.5">
                            <button
                                type="button"
                                onClick={() => setIsDialogue(false)}
                                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                    !isDialogue ? 'bg-accent text-[color:var(--accent-contrast)]' : 'text-text'
                                }`}
                            >
                                <TbMicrophone2 /> {t('tts.single')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsDialogue(true)}
                                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                                    isDialogue ? 'bg-accent text-[color:var(--accent-contrast)]' : 'text-text'
                                }`}
                            >
                                <TbUsers /> {t('tts.dialogue')}
                            </button>
                        </div>
                    </div>

                    {!isDialogue ? (
                        <textarea
                            ref={textRef}
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            placeholder={t('tts.placeholder')}
                            rows={9}
                            className="w-full resize-y rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 text-sm leading-relaxed text-text-h outline-none focus:border-accent"
                        />
                    ) : (
                        <div className="space-y-2">
                            {turns.map((turn, index) => (
                                <div
                                    key={turn.id}
                                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] p-2.5"
                                >
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-accent">
                                            {index + 1}. {names[turn.speaker]}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setTurns((prev) => prev.map((item) => (
                                                    item.id === turn.id
                                                        ? { ...item, speaker: item.speaker === 'a' ? 'b' : 'a' }
                                                        : item
                                                )))}
                                                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-text hover:text-accent"
                                            >
                                                {t('tts.swap')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTurns((prev) => (
                                                    prev.length <= 2 ? prev : prev.filter((item) => item.id !== turn.id)
                                                ))}
                                                disabled={turns.length <= 2}
                                                aria-label={t('common.remove')}
                                                className="rounded-full p-1 text-text hover:text-red-500 disabled:opacity-30"
                                            >
                                                <TbTrash />
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        value={turn.text}
                                        onChange={(event) => setTurns((prev) => prev.map((item) => (
                                            item.id === turn.id ? { ...item, text: event.target.value } : item
                                        )))}
                                        rows={2}
                                        className="w-full resize-y rounded-xl border-0 bg-transparent text-sm leading-relaxed text-text-h outline-none"
                                    />
                                </div>
                            ))}
                            <div className="flex gap-2">
                                {DIALOGUE_KEYS.map((key) => (
                                    <Button
                                        key={key}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setTurns((prev) => [
                                            ...prev,
                                            { id: nextTurnId(), speaker: key, text: '' },
                                        ])}
                                    >
                                        <span className="flex items-center gap-1">
                                            <TbPlus /> {names[key]}
                                        </span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className={overLimit ? 'font-bold text-red-500' : 'text-text'}>
                            {charCount.toLocaleString()} / {maxChars.toLocaleString()}
                        </span>
                        {overLimit && <span className="text-red-500">{t('tts.tooLong')}</span>}
                    </div>
                </section>

                {/* ── Controls ────────────────────────────────────────── */}
                <div className="space-y-4">
                    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
                        <h2 className="mb-2 text-sm font-bold text-text-h">{t('tts.voice')}</h2>
                        {!isDialogue ? (
                            <select
                                value={voice}
                                onChange={(event) => setVoice(event.target.value)}
                                className="w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-xs font-semibold text-text-h outline-none focus:border-accent"
                            >
                                {(catalog?.voices ?? []).map((item) => (
                                    <option key={item.name} value={item.name}>
                                        {item.name} — {item.tone}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="space-y-2">
                                {DIALOGUE_KEYS.map((key) => (
                                    <div key={key} className="flex gap-1.5">
                                        <input
                                            type="text"
                                            value={names[key]}
                                            maxLength={catalog?.limits.maxSpeakerNameChars ?? 32}
                                            onChange={(event) => setNames((prev) => ({ ...prev, [key]: event.target.value }))}
                                            className="w-24 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-1.5 text-xs font-bold text-text-h outline-none focus:border-accent"
                                        />
                                        <select
                                            value={voices[key]}
                                            onChange={(event) => setVoices((prev) => ({ ...prev, [key]: event.target.value }))}
                                            className="min-w-0 flex-1 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-2 py-1.5 text-xs text-text-h outline-none focus:border-accent"
                                        >
                                            {(catalog?.voices ?? []).map((item) => (
                                                <option key={item.name} value={item.name}>
                                                    {item.name} — {item.tone}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
                        <h2 className="mb-1 text-sm font-bold text-text-h">{t('tts.style')}</h2>
                        <p className="mb-2 text-[10px] leading-snug text-text">{t('tts.styleHint')}</p>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => setStyle('')}
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                    style === '' ? 'border-accent bg-accent text-[color:var(--accent-contrast)]' : 'border-[color:var(--border)] text-text'
                                }`}
                            >
                                {t('tts.natural')}
                            </button>
                            {stylePresets.map((preset) => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    title={preset.style}
                                    onClick={() => setStyle(preset.style)}
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                                        style === preset.style
                                            ? 'border-accent bg-accent text-[color:var(--accent-contrast)]'
                                            : 'border-[color:var(--border)] text-text hover:border-accent'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={style}
                            maxLength={catalog?.limits.maxStyleChars ?? 200}
                            onChange={(event) => setStyle(event.target.value)}
                            placeholder={t('tts.stylePlaceholder')}
                            className="mt-2 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-2.5 py-1.5 text-xs text-text-h outline-none focus:border-accent"
                        />
                    </section>

                    <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
                        <h2 className="mb-1 text-sm font-bold text-text-h">{t('tts.expression')}</h2>
                        <p className="mb-2 text-[10px] leading-snug text-text">{t('tts.expressionHint')}</p>
                        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                            {tagGroups.map((group) => (
                                <div key={group.id}>
                                    <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-text">
                                        {group.label}
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        {group.tags.map((item: TtsExpressionTag) => (
                                            <button
                                                key={item.tag}
                                                type="button"
                                                title={item.hint}
                                                onClick={() => handleTag(item.tag)}
                                                className="rounded-full border border-[color:var(--border)] px-2 py-0.5 text-[10px] font-semibold text-text transition-colors hover:border-accent hover:text-accent"
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <Button
                        variant="primary"
                        size="lg"
                        onClick={() => void generate()}
                        disabled={!hasContent || overLimit || isGenerating}
                        className="w-full"
                    >
                        <span className="flex items-center justify-center gap-2">
                            {isGenerating ? <TbLoader2 className="animate-spin" /> : <TbSparkles />}
                            {isGenerating ? t('tts.generating') : t('tts.generate')}
                        </span>
                    </Button>
                    <p className="flex items-center justify-center gap-1 text-[10px] text-text">
                        <TbCoins /> {t('tts.creditNote')}
                    </p>
                </div>
            </div>

            {/* ── Result ─────────────────────────────────────────────── */}
            {clip && (
                <section className="mt-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-2)] p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => void togglePlay()}
                            aria-label={isPlaying ? t('tts.pause') : t('tts.play')}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-[color:var(--accent-contrast)] shadow-lg shadow-accent/25"
                        >
                            {isPlaying ? <TbPlayerPause size={20} /> : <TbPlayerPlay size={20} className="ml-0.5" />}
                        </button>
                        <div className="min-w-0 flex-1 text-xs text-text">
                            <p className="font-bold text-text-h">
                                {(clip.durationMs / 1000).toFixed(1)}s · {clip.credits} {t('tts.credits')}
                            </p>
                            <p className="text-[10px]">
                                {clip.multiSpeaker ? t('tts.dialogue') : t('tts.single')} · {clip.model}
                            </p>
                        </div>
                        <Button variant="outline" size="md" onClick={() => void saveClip()} disabled={isSaving}>
                            <span className="flex items-center gap-1.5">
                                {isSaving ? <TbLoader2 className="animate-spin" /> : <TbDeviceFloppy />}
                                {t('tts.saveAs')}
                            </span>
                        </Button>
                    </div>

                    <audio
                        ref={audioRef}
                        src={audioUrl ?? undefined}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        className="mt-3 w-full"
                        controls
                    />
                </section>
            )}
        </div>
    );
}

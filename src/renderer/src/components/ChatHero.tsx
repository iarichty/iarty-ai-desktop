import { useRef } from 'react';
import { TbDownload, TbRestore, TbUpload, TbWand } from 'react-icons/tb';
import { STARTER_PROMPTS } from '@/config/StarterPrompts';
import { useLanguage } from '@/context/useLanguage';

interface Props {
    onExport?: () => void;
    onImport?: (file: File) => void;
    onReset?: () => void;
    /** Called with a ready-made prompt when a starter chip is tapped. */
    onPickPrompt?: (prompt: string) => void;
    canExport?: boolean;
    isThinking?: boolean;
}

/**
 * Empty-state hero for the chat view — the huge gradient "IARTY AI" wordmark
 * plus quick-start suggestions and export / import / reset actions, mirroring
 * the web app's `ChatHero`.
 */
export default function ChatHero({
    onExport,
    onImport,
    onReset,
    onPickPrompt,
    canExport = false,
    isThinking = false,
}: Props): JSX.Element {
    const { t } = useLanguage();
    const importInputRef = useRef<HTMLInputElement>(null);

    const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file && onImport) onImport(file);
        if (importInputRef.current) importInputRef.current.value = '';
    };

    return (
        <div className="relative z-10 mb-6 animate-fadeIn text-center">
            <div className="relative mb-6 inline-block">
                <div className="absolute inset-0 animate-pulse bg-linear-to-r from-accent to-accent-2 opacity-30 blur-2xl" />
                <h1 className="relative bg-linear-to-br from-accent via-accent to-accent-2 bg-clip-text text-6xl font-black tracking-tight text-transparent md:text-8xl">
                    IARTY AI
                </h1>
            </div>

            <p className="mx-auto max-w-2xl animate-slideUp text-base text-text md:text-lg">
                {t('chatHero.subtitle')}
            </p>

            {onPickPrompt && (
                <div
                    className="mt-8 flex flex-wrap items-center justify-center gap-2 animate-slideUp"
                    style={{ animationDelay: '250ms' }}
                >
                    <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text">
                        <TbWand className="h-3.5 w-3.5" /> {t('chatHero.quickStart')}
                    </span>
                    {STARTER_PROMPTS.map(({ labelKey, promptKey }) => (
                        <button
                            key={labelKey}
                            type="button"
                            disabled={isThinking}
                            onClick={() => onPickPrompt(t(promptKey))}
                            className="cursor-pointer rounded-full border border-border bg-[color:var(--surface)] px-3.5 py-1.5 text-sm font-medium text-text-h shadow-sm transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {t(labelKey)}
                        </button>
                    ))}
                </div>
            )}

            {(onExport || onImport || onReset) && (
                <div
                    className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-slideUp"
                    style={{ animationDelay: '300ms' }}
                >
                    {onExport && (
                        <button
                            onClick={onExport}
                            disabled={!canExport || isThinking}
                            className="flex cursor-pointer items-center gap-2 rounded-2xl bg-linear-to-r from-accent to-accent-2 px-5 py-2.5 font-medium text-[color:var(--accent-contrast)] shadow-lg transition-all duration-300 hover:opacity-90 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <TbDownload className="h-4 w-4" />
                            {t('chatHero.exportSession')}
                        </button>
                    )}

                    {onImport && (
                        <>
                            <input
                                ref={importInputRef}
                                type="file"
                                accept=".json,.zip"
                                onChange={handleImportChange}
                                className="hidden"
                            />
                            <button
                                onClick={() => importInputRef.current?.click()}
                                disabled={isThinking}
                                className="flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-border bg-[color:var(--surface)] px-5 py-2.5 font-medium text-text-h shadow-lg transition-all duration-300 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <TbUpload className="h-4 w-4" />
                                {t('chatHero.importSession')}
                            </button>
                        </>
                    )}

                    {onReset && (
                        <button
                            onClick={onReset}
                            disabled={isThinking}
                            className="group flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-border bg-[color:var(--surface)] px-5 py-2.5 font-medium text-text-h shadow-lg transition-all duration-300 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <TbRestore
                                className={`h-4 w-4 ${isThinking ? '' : 'transition-transform duration-500 group-hover:-rotate-180'}`}
                            />
                            {t('chatHero.reset')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

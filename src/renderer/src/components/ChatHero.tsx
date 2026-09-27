import { useRef } from 'react';
import { TbDownload, TbRestore, TbUpload } from 'react-icons/tb';

interface Props {
    onExport?: () => void;
    onImport?: (file: File) => void;
    onReset?: () => void;
    canExport?: boolean;
    isThinking?: boolean;
}

/**
 * Empty-state hero for the chat view — the huge gradient "IARTY AI" wordmark
 * plus export / import / reset actions, mirroring the web app's `ChatHero`.
 */
export default function ChatHero({
    onExport,
    onImport,
    onReset,
    canExport = false,
    isThinking = false,
}: Props): JSX.Element {
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
                Welcome to the future of AI-powered conversations. Ask me anything, and let&apos;s
                explore together.
            </p>

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
                            Export Session
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
                                Import Session
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
                            Reset
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

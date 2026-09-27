import { useRef } from 'react';
import { TbDownload, TbRestore, TbBrain } from 'react-icons/tb';

interface Props {
    hasMessages: boolean;
    isThinking?: boolean;
    onExport: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onReset: () => void;
}

/**
 * Chat action bar (Save / Import / Reset) shown beneath the transcript. The
 * Save button morphs into a shimmering "Thinking…" pill while streaming.
 */
export default function ChatToolbar({
    hasMessages,
    isThinking = false,
    onExport,
    onImport,
    onReset,
}: Props): JSX.Element {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-wrap justify-center gap-4 animate-slideUp" style={{ animationDelay: '300ms' }}>
            {isThinking ? (
                <button
                    disabled
                    className="relative flex cursor-not-allowed items-center gap-2 overflow-hidden rounded-2xl border border-accent/30 bg-linear-to-r from-accent to-accent-2 px-6 py-3 font-medium text-[color:var(--accent-contrast)] shadow-lg transition-all duration-300"
                >
                    <div className="absolute inset-0 h-full w-full animate-shimmer-slide bg-linear-to-r from-transparent via-white/40 to-transparent" />
                    <span className="relative z-10 flex items-center gap-2">
                        <TbBrain className="h-5 w-5 animate-pulse" />
                        Thinking...
                    </span>
                </button>
            ) : (
                <button
                    onClick={onExport}
                    disabled={!hasMessages}
                    className="flex cursor-pointer items-center gap-2 rounded-2xl bg-linear-to-r from-accent to-accent-2 px-6 py-3 font-medium text-[color:var(--accent-contrast)] shadow-lg transition-all duration-300 hover:opacity-90 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <TbDownload className="h-5 w-5" />
                    Save Conversation
                </button>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={onImport}
                accept=".json,.zip"
                className="hidden"
            />

            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isThinking}
                className="group flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-border bg-[color:var(--surface)] px-6 py-3 font-medium text-text-h shadow-lg transition-all duration-300 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
                <TbDownload className="h-5 w-5 rotate-180" />
                Import
            </button>

            <button
                onClick={onReset}
                disabled={isThinking}
                className="group flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-border bg-[color:var(--surface)] px-6 py-3 font-medium text-text-h shadow-lg transition-all duration-300 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
                <TbRestore
                    className={`h-5 w-5 ${isThinking ? '' : 'transition-transform duration-500 group-hover:-rotate-180'}`}
                />
                Reset
            </button>
        </div>
    );
}

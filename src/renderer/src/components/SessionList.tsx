import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TbHistory, TbTrash, TbPencil, TbCheck, TbX, TbPlus } from 'react-icons/tb';
import Loader from './Loader';
import type { SessionSummary } from '@shared/types';
import { formatSessionTime } from '@/lib/sessions';
import { useLanguage } from '@/context/useLanguage';

interface Props {
    sessions: SessionSummary[];
    loading: boolean;
    /** Id of the session currently open, highlighted in the list. */
    activeId?: string | null;
    onOpen: (id: string) => void;
    onRename: (id: string, title: string) => void;
    onDelete: (id: string) => void;
    /** Start a fresh session (clears the current view + active id). */
    onNew: () => void;
    /** Optional: clear every saved session for this feature. */
    onClearAll?: () => void;
    label?: string;
}

/**
 * Dropdown list of locally-saved sessions for a feature. Supports open,
 * inline rename, delete, and starting a new session. Mirrors the floating
 * popover styling used elsewhere in the app.
 */
export function SessionList({
    sessions,
    loading,
    activeId,
    onOpen,
    onRename,
    onDelete,
    onNew,
    onClearAll,
    label,
}: Props): JSX.Element {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent): void => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
                setEditingId(null);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const startRename = (s: SessionSummary): void => {
        setEditingId(s.id);
        setDraft(s.title);
    };

    const commitRename = (id: string): void => {
        const title = draft.trim();
        if (title) onRename(id, title);
        setEditingId(null);
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 rounded-xl border border-border bg-[color:var(--surface)] px-3 py-2 text-sm text-text-h transition-colors hover:border-accent/60"
                title={t('sessionList.triggerTitle')}
            >
                <TbHistory className="h-4 w-4 text-accent" />
                {label ?? t('sessionList.sessions')}
                {sessions.length > 0 && (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                        {sessions.length}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 z-30 mt-1 max-h-96 w-80 overflow-y-auto rounded-xl border border-border bg-[color:var(--surface)] p-1.5 shadow-2xl"
                    >
                        <div className="flex items-center justify-between px-2 py-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wide text-text">
                                {t('sessionList.heading')}
                            </span>
                            {loading && <Loader className="h-3.5 w-3.5 text-accent" />}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                onNew();
                                setOpen(false);
                            }}
                            className="mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-accent transition-colors hover:bg-[color:var(--surface-2)]"
                        >
                            <TbPlus className="h-4 w-4" />
                            {t('sessionList.newSession')}
                        </button>

                        {sessions.length === 0 && !loading && (
                            <div className="px-3 py-4 text-center text-xs text-text">
                                {t('sessionList.empty')}
                            </div>
                        )}

                        <div className="flex flex-col gap-0.5">
                            {sessions.map((s) => {
                                const isActive = s.id === activeId;
                                const isEditing = editingId === s.id;
                                return (
                                    <div
                                        key={s.id}
                                        className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                                            isActive
                                                ? 'bg-accent/10'
                                                : 'hover:bg-[color:var(--surface-2)]'
                                        }`}
                                    >
                                        {isEditing ? (
                                            <>
                                                <input
                                                    autoFocus
                                                    value={draft}
                                                    onChange={(e) => setDraft(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') commitRename(s.id);
                                                        if (e.key === 'Escape') setEditingId(null);
                                                    }}
                                                    className="min-w-0 flex-1 rounded-md border border-accent/40 bg-[color:var(--surface-2)] px-2 py-1 text-xs text-text-h outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => commitRename(s.id)}
                                                    className="text-emerald-500 hover:opacity-80"
                                                    aria-label={t('sessionList.saveName')}
                                                >
                                                    <TbCheck className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingId(null)}
                                                    className="text-text hover:text-text-h"
                                                    aria-label={t('sessionList.cancel')}
                                                >
                                                    <TbX className="h-4 w-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onOpen(s.id);
                                                        setOpen(false);
                                                    }}
                                                    className="flex min-w-0 flex-1 flex-col text-left"
                                                >
                                                    <span
                                                        className={`truncate text-xs font-medium ${
                                                            isActive ? 'text-accent' : 'text-text-h'
                                                        }`}
                                                    >
                                                        {s.title}
                                                    </span>
                                                    <span className="text-[10px] text-text">
                                                        {formatSessionTime(s.updatedAt)} ·{' '}
                                                        {s.itemCount} {t('sessionList.items')}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => startRename(s)}
                                                    className="opacity-0 transition-opacity group-hover:opacity-100 text-text hover:text-accent"
                                                    aria-label={t('sessionList.rename')}
                                                >
                                                    <TbPencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(s.id)}
                                                    className="opacity-0 transition-opacity group-hover:opacity-100 text-text hover:text-red-500"
                                                    aria-label={t('sessionList.delete')}
                                                >
                                                    <TbTrash className="h-3.5 w-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {onClearAll && sessions.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClearAll();
                                    setOpen(false);
                                }}
                                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] text-text transition-colors hover:bg-red-500/10 hover:text-red-500"
                            >
                                <TbTrash className="h-3.5 w-3.5" />
                                {t('sessionList.deleteAll')}
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

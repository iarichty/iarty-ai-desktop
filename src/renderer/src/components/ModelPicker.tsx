import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TbCloud, TbCpu, TbChevronDown, TbCheck } from 'react-icons/tb';
import type { UnifiedModel } from '@shared/types';
import { useLanguage } from '@/context/useLanguage';

interface Props {
    models: UnifiedModel[];
    selected: UnifiedModel | null;
    onSelect: (model: UnifiedModel) => void;
    /** Compact pill styling for the floating navbar. */
    compact?: boolean;
}

/** Dropdown grouping cloud and local models, with animated reveal. */
export function ModelPicker({ models, selected, onSelect, compact = false }: Props): JSX.Element {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent): void => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const cloud = models.filter((m) => m.source === 'cloud');
    const local = models.filter((m) => m.source === 'local');

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={
                    compact
                        ? 'flex max-w-[12rem] items-center justify-between gap-2 rounded-full border border-border bg-[color:var(--surface-2)] px-3 py-1.5 text-left text-xs text-text-h transition-colors hover:border-accent/60'
                        : 'flex w-64 items-center justify-between gap-2 rounded-xl border border-border bg-[color:var(--surface)] px-3 py-2 text-left text-sm text-text-h transition-colors hover:border-accent/60'
                }
            >
                <span className="flex items-center gap-2 truncate">
                    {selected?.source === 'local' ? (
                        <TbCpu className="h-4 w-4 shrink-0 text-accent" />
                    ) : (
                        <TbCloud className="h-4 w-4 shrink-0 text-accent" />
                    )}
                    <span className="truncate">
                        {selected ? selected.label : t('models.select')}
                    </span>
                </span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-text">
                    <TbChevronDown className="h-4 w-4" />
                </motion.span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 z-20 mt-1 max-h-80 w-72 overflow-y-auto rounded-xl border border-border bg-[color:var(--surface)] p-1 shadow-2xl"
                    >
                        {cloud.length > 0 && (
                            <Group
                                label={t('models.cloud')}
                                icon={<TbCloud className="h-3 w-3" />}
                                items={cloud}
                                selected={selected}
                                onSelect={(m) => {
                                    onSelect(m);
                                    setOpen(false);
                                }}
                            />
                        )}
                        {local.length > 0 && (
                            <Group
                                label={t('models.local')}
                                icon={<TbCpu className="h-3 w-3" />}
                                items={local}
                                selected={selected}
                                onSelect={(m) => {
                                    onSelect(m);
                                    setOpen(false);
                                }}
                            />
                        )}
                        {models.length === 0 && (
                            <div className="px-3 py-2 text-xs text-text">{t('models.none')}</div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Group({
    label,
    icon,
    items,
    selected,
    onSelect,
}: {
    label: string;
    icon: JSX.Element;
    items: UnifiedModel[];
    selected: UnifiedModel | null;
    onSelect: (m: UnifiedModel) => void;
}): JSX.Element {
    return (
        <div className="mb-1">
            <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wide text-text">
                {icon}
                {label}
            </div>
            {items.map((m) => {
                const isActive = selected?.source === m.source && selected?.id === m.id;
                return (
                    <button
                        key={`${m.source}:${m.id}`}
                        type="button"
                        onClick={() => onSelect(m)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-text-h transition-colors hover:bg-[color:var(--surface-2)]"
                    >
                        <span className="truncate">{m.label}</span>
                        {isActive && <TbCheck className="h-4 w-4 shrink-0 text-accent" />}
                    </button>
                );
            })}
        </div>
    );
}

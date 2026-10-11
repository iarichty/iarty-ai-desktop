import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TbSearch,
    TbCheck,
    TbPalette,
    TbTypography,
    TbLayoutGrid,
    TbSparkles,
    TbArrowLeft,
} from 'react-icons/tb';
import Modal from './Modal';
import { DESIGN_STYLES, unsplashUrl, type DesignStyle } from '@/data/designStyles';
import { useLanguage } from '@/context/useLanguage';

interface Props {
    isOpen: boolean;
    selectedId: string;
    onSelect: (style: DesignStyle | null) => void;
    onClose: () => void;
}

/**
 * Grid of the 20 curated design styles with Unsplash mood previews. Selecting a
 * style stores it as the PRD's chosen direction so the AI design step implements
 * exactly that style instead of inventing its own.
 */
export default function DesignStylePicker({
    isOpen,
    selectedId,
    onSelect,
    onClose,
}: Props): JSX.Element {
    const { t } = useLanguage();
    const [query, setQuery] = useState('');
    const [detailId, setDetailId] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return DESIGN_STYLES;
        return DESIGN_STYLES.filter((s) =>
            [s.name, s.tagline, s.mood, ...s.best_for].join(' ').toLowerCase().includes(q),
        );
    }, [query]);

    const detail = useMemo(() => DESIGN_STYLES.find((s) => s.id === detailId) || null, [detailId]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={detail ? detail.name : t('prd.chooseStyle')}
            subtitle={detail ? detail.tagline : t('prd.chooseStyleSub')}
            icon={TbPalette}
        >
            <div className="flex flex-col gap-4">
                {/* Toolbar */}
                <div className="flex items-center gap-2">
                    {detail ? (
                        <button
                            onClick={() => setDetailId(null)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-text hover:bg-surface"
                        >
                            <TbArrowLeft className="h-3.5 w-3.5" />
                            {t('prd.allStyles')}
                        </button>
                    ) : (
                        <div className="relative flex-1">
                            <TbSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t('prd.searchStyles')}
                                className="w-full rounded-xl border border-border bg-transparent py-2 pl-9 pr-3 text-xs text-text-h outline-none placeholder:text-text"
                            />
                        </div>
                    )}
                </div>

                <div className="max-h-[55vh] overflow-y-auto pr-1">
                    <AnimatePresence mode="wait">
                        {detail ? (
                            <StyleDetail
                                key={detail.id}
                                style={detail}
                                selected={selectedId === detail.id}
                                selectedLabel={t('prd.styleSelected')}
                                useLabel={t('prd.useStyle')}
                                onSelect={() => {
                                    onSelect(detail);
                                    onClose();
                                }}
                            />
                        ) : (
                            <motion.div
                                key="grid"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-3"
                            >
                                <button
                                    onClick={() => {
                                        onSelect(null);
                                        onClose();
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                                        !selectedId
                                            ? 'border-accent bg-accent/10 text-text-h'
                                            : 'border-border hover:border-accent/60'
                                    }`}
                                >
                                    <TbSparkles className="h-5 w-5 shrink-0 text-accent" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-text-h">
                                            {t('prd.letAiDecide')}
                                        </p>
                                        <p className="text-[11px] text-text">
                                            {t('prd.letAiDecideSub')}
                                        </p>
                                    </div>
                                    {!selectedId && <TbCheck className="h-4 w-4 shrink-0 text-accent" />}
                                </button>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {filtered.map((style) => (
                                        <StyleCard
                                            key={style.id}
                                            style={style}
                                            selected={selectedId === style.id}
                                            chooseLabel={t('prd.choose')}
                                            detailsLabel={t('prd.details')}
                                            selectedLabel={t('prd.styleSelected')}
                                            onOpen={() => setDetailId(style.id)}
                                            onSelect={() => {
                                                onSelect(style);
                                                onClose();
                                            }}
                                        />
                                    ))}
                                    {filtered.length === 0 && (
                                        <p className="col-span-full py-8 text-center text-sm text-text">
                                            {t('prd.noStylesMatch')} “{query}”.
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */

function StyleCard({
    style,
    selected,
    chooseLabel,
    detailsLabel,
    selectedLabel,
    onOpen,
    onSelect,
}: {
    style: DesignStyle;
    selected: boolean;
    chooseLabel: string;
    detailsLabel: string;
    selectedLabel: string;
    onOpen: () => void;
    onSelect: () => void;
}): JSX.Element {
    return (
        <div
            className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all ${
                selected ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-accent/60'
            }`}
        >
            <button onClick={onOpen} className="relative block aspect-[16/10] w-full overflow-hidden">
                <img
                    src={unsplashUrl(style.unsplash[0], 600)}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span
                    className="absolute inset-0"
                    style={{
                        background: `linear-gradient(160deg, transparent 40%, ${style.palette.accent}cc)`,
                        mixBlendMode: 'multiply',
                    }}
                />
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">
                    {style.mood}
                </span>
                {selected && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent shadow-lg">
                        <TbCheck className="h-3.5 w-3.5 text-white" />
                    </span>
                )}
            </button>
            <div className="flex flex-1 flex-col p-3">
                <div className="mb-2 flex items-center gap-1.5">
                    {[style.palette.background, style.palette.accent, style.palette.secondary, style.palette.text].map(
                        (c, i) => (
                            <span
                                key={`${c}-${i}`}
                                className="h-4 w-4 rounded-full border border-border"
                                style={{ backgroundColor: c }}
                                title={c}
                            />
                        ),
                    )}
                </div>
                <h4 className="text-sm font-black leading-tight text-text-h">{style.name}</h4>
                <p className="mt-0.5 text-[11px] leading-snug text-text">{style.tagline}</p>
                <div className="mt-3 flex items-center gap-2">
                    <button
                        onClick={onSelect}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-95 ${
                            selected
                                ? 'bg-accent text-white'
                                : 'border border-border text-text-h hover:bg-surface'
                        }`}
                    >
                        {selected ? (
                            <>
                                <TbCheck className="h-3.5 w-3.5" /> {selectedLabel}
                            </>
                        ) : (
                            chooseLabel
                        )}
                    </button>
                    <button
                        onClick={onOpen}
                        className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-text hover:bg-surface"
                    >
                        {detailsLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function StyleDetail({
    style,
    selected,
    selectedLabel,
    useLabel,
    onSelect,
}: {
    style: DesignStyle;
    selected: boolean;
    selectedLabel: string;
    useLabel: string;
    onSelect: () => void;
}): JSX.Element {
    const { t } = useLanguage();
    return (
        <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
        >
            <div className="grid h-40 grid-cols-3 gap-2 overflow-hidden rounded-2xl">
                {style.unsplash.slice(0, 3).map((id) => (
                    <div key={id} className="relative overflow-hidden">
                        <img
                            src={unsplashUrl(id, 500)}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                        <span
                            className="absolute inset-0"
                            style={{
                                background: `linear-gradient(160deg, transparent 50%, ${style.palette.accent}b3)`,
                                mixBlendMode: 'multiply',
                            }}
                        />
                    </div>
                ))}
            </div>

            <p className="text-sm leading-relaxed text-text">{style.description}</p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Section icon={TbPalette} title={t('prd.colorPalette')}>
                    <div className="flex flex-wrap gap-2">
                        {(['background', 'accent', 'secondary', 'text'] as const).map((role) => (
                            <div key={role} className="flex flex-col items-center gap-1">
                                <span
                                    className="h-10 w-10 rounded-xl border border-border"
                                    style={{ backgroundColor: style.palette[role] }}
                                />
                                <span className="text-[9px] font-mono text-text">{role}</span>
                            </div>
                        ))}
                    </div>
                </Section>

                <Section icon={TbTypography} title={t('prd.typographyLabel')}>
                    <p
                        className="mb-1 text-lg text-text-h"
                        style={{ fontFamily: style.typography.headline }}
                    >
                        {style.name}
                    </p>
                    <p className="text-xs font-mono text-text">
                        {style.typography.headline} — {style.typography.headline_style}
                    </p>
                    <p className="mt-1 text-xs font-mono text-text">
                        {style.typography.body} — {style.typography.body_style}
                    </p>
                </Section>

                <Section icon={TbLayoutGrid} title={t('prd.layout')}>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-text">
                        {style.layout.map((l) => (
                            <li key={l}>{l}</li>
                        ))}
                    </ul>
                </Section>

                <Section icon={TbSparkles} title={t('prd.motion')}>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-text">
                        {style.motion.map((m) => (
                            <li key={m}>{m}</li>
                        ))}
                    </ul>
                </Section>
            </div>

            <button
                onClick={onSelect}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all active:scale-[0.99] ${
                    selected ? 'bg-emerald-600 text-white' : 'bg-accent text-white hover:opacity-90'
                }`}
            >
                <TbCheck className="h-4 w-4" />
                {selected ? selectedLabel : useLabel}
            </button>
        </motion.div>
    );
}

function Section({
    icon: Icon,
    title,
    children,
}: {
    icon: typeof TbPalette;
    title: string;
    children: React.ReactNode;
}): JSX.Element {
    return (
        <div className="rounded-2xl border border-border bg-surface/40 p-4">
            <div className="mb-3 flex items-center gap-2">
                <Icon className="h-4 w-4 text-accent" />
                <h5 className="text-[11px] font-black uppercase tracking-wider text-text-h">
                    {title}
                </h5>
            </div>
            {children}
        </div>
    );
}

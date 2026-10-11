import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    TbDeviceDesktop,
    TbDeviceMobile,
    TbRefresh,
    TbCopy,
    TbCheck,
    TbDownload,
    TbCoin,
} from 'react-icons/tb';
import Loader from './Loader';
import { useLanguage } from '@/context/useLanguage';
import {
    MOCKUP_CATEGORY_LABELS,
    MOCKUP_CATEGORY_ORDER,
    type MockupPageCategory,
    type MockupTarget,
} from '@/lib/mockupScreens';
import type { PrdMockupPage, PrdMockupProgress } from '@/types/prd';

interface Props {
    pages: PrdMockupPage[];
    /** Screens the mockups would be generated for (from the PRD / page flow). */
    screenNames: string[];
    /** Page targets with auto-detected categories (for the type filter). */
    targets?: MockupTarget[];
    /** Categories actually present in the PRD. */
    availableCategories?: MockupPageCategory[];
    /** Selected category filter (empty = all). */
    categoryFilter?: MockupPageCategory[];
    onCategoryFilterChange?: (next: MockupPageCategory[]) => void;
    /** Live progress of a running generation (one AI call per page). */
    progress?: PrdMockupProgress | null;
    /** Credits charged per page. */
    creditsPerPage?: number;
    styleName?: string;
    isGenerating: boolean;
    onGenerate: () => void;
    onNotify: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    projectTitle: string;
}

type DeviceMode = 'desktop' | 'mobile';

/**
 * Per-page UI mockups generated from the PRD / page flow, each rendered in a
 * live, sandboxed iframe. Generation runs one page per AI call; this panel lets
 * the user narrow the run to specific page types and shows live progress plus
 * the credit cost of the run.
 */
export default function PageMockupsPanel({
    pages,
    screenNames,
    targets = [],
    availableCategories = [],
    categoryFilter = [],
    onCategoryFilterChange,
    progress = null,
    creditsPerPage = 12,
    styleName,
    isGenerating,
    onGenerate,
    onNotify,
    projectTitle,
}: Props): JSX.Element {
    const { t } = useLanguage();
    const [activeIdxRaw, setActiveIdx] = useState(0);
    const [device, setDevice] = useState<DeviceMode>('desktop');
    const [copied, setCopied] = useState(false);

    // Clamp during render so a shrinking page list never leaves a stale index.
    const activeIdx = activeIdxRaw < pages.length ? activeIdxRaw : 0;
    const active = pages[activeIdx];

    const pageCount = screenNames.length;
    const estimatedCredits = pageCount * creditsPerPage;

    // Category chips let the user narrow which page types get mockups. Only
    // categories that actually exist in the PRD are shown.
    const handleToggleCategory = (cat: MockupPageCategory): void => {
        if (!onCategoryFilterChange) return;
        const isOn = categoryFilter.includes(cat);
        const next = isOn ? categoryFilter.filter((c) => c !== cat) : [...categoryFilter, cat];
        onCategoryFilterChange(next);
    };

    const categoryChips =
        availableCategories.length > 0 && onCategoryFilterChange ? (
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-0.5 text-[11px] font-semibold text-text">
                    {t('prd.mockupPageTypes')}
                </span>
                {MOCKUP_CATEGORY_ORDER.filter((c) => availableCategories.includes(c)).map((cat) => {
                    // Empty filter = "all selected", so render as active.
                    const on = categoryFilter.length === 0 || categoryFilter.includes(cat);
                    const count = targets.filter((tt) => tt.category === cat).length;
                    return (
                        <button
                            key={cat}
                            onClick={() => handleToggleCategory(cat)}
                            className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                on
                                    ? 'border-accent bg-accent text-[color:var(--accent-contrast)]'
                                    : 'border-border text-text hover:bg-surface'
                            }`}
                            title={`${count} ${MOCKUP_CATEGORY_LABELS[cat]}`}
                        >
                            {t(`prd.mockupCat_${cat}`)}
                            <span className="ml-1 opacity-70">{count}</span>
                        </button>
                    );
                })}
            </div>
        ) : null;

    if (isGenerating) {
        const total = progress?.total ?? pageCount;
        const done = progress?.completed ?? 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const usedCredits = done * creditsPerPage;
        const totalCredits = total * creditsPerPage;

        return (
            <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 py-16">
                <Loader className="h-8 w-8" />
                <div className="w-full space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-text-h">
                        <span className="animate-pulse">
                            {progress?.current
                                ? t('prd.mockupGeneratingPage').replace('{name}', progress.current)
                                : t('prd.mockupFinalizing')}
                        </span>
                        <span>
                            {done} / {total}
                        </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                        <div
                            className="h-full bg-accent transition-all duration-500"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-text">
                        <span className="inline-flex items-center gap-1">
                            <TbCoin className="h-3.5 w-3.5" />
                            {t('prd.mockupCreditsUsed')
                                .replace('{used}', String(usedCredits))
                                .replace('{total}', String(totalCredits))}
                        </span>
                        <span>{pct}%</span>
                    </div>
                    <p className="pt-1 text-center text-[11px] text-text/70">
                        {t('prd.mockupOnePerCall')}
                    </p>
                </div>
            </div>
        );
    }

    if (pages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
                <TbDeviceDesktop className="h-8 w-8 text-text/40" />
                <p className="max-w-lg text-center text-sm text-text">
                    {t('prd.mockupEmpty')}
                    {styleName ? (
                        <>
                            {' '}
                            <span className="font-bold text-text-h">“{styleName}”</span>
                        </>
                    ) : null}
                </p>

                {categoryChips && (
                    <div className="flex flex-col items-center gap-2 pt-1">
                        <p className="text-[11px] text-text/70">{t('prd.mockupChooseTypes')}</p>
                        {categoryChips}
                    </div>
                )}

                {screenNames.length > 0 && (
                    <p className="max-w-lg text-center text-[11px] font-mono text-text/70">
                        {screenNames.length} {t('prd.screens')}:{' '}
                        {screenNames.slice(0, 6).join(' · ')}
                        {screenNames.length > 6 ? ' …' : ''}
                    </p>
                )}

                <p className="inline-flex items-center gap-1 text-xs text-text">
                    <TbCoin className="h-3.5 w-3.5" />
                    {t('prd.mockupEstimatedCredits')
                        .replace('{total}', String(estimatedCredits))
                        .replace('{pages}', String(pageCount))
                        .replace('{per}', String(creditsPerPage))}
                </p>

                <button
                    onClick={onGenerate}
                    disabled={pageCount === 0}
                    className="mt-2 flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-[color:var(--accent-contrast)] transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <TbDeviceDesktop className="h-4 w-4" />
                    {t('prd.generateMockups')}
                </button>
            </div>
        );
    }

    const copyHtml = async (): Promise<void> => {
        if (!active) return;
        try {
            await navigator.clipboard.writeText(active.html);
            setCopied(true);
            onNotify(t('prd.mockupCopied'), 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            onNotify(t('prd.mockupCopyFail'), 'error');
        }
    };

    const downloadHtml = (): void => {
        if (!active) return;
        const blob = new Blob([active.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safe = active.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
        a.download = `${safe}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-text-h">
                        {t('prd.mockups')}{' '}
                        {styleName && (
                            <span className="font-medium text-text">· {styleName}</span>
                        )}
                    </h3>
                    <p className="text-[11px] text-text">
                        {pages.length} {t('prd.screens')} · {t('prd.mockupsHint')}
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center overflow-hidden rounded-xl border border-border">
                        <button
                            onClick={() => setDevice('desktop')}
                            className={`px-2.5 py-1.5 transition-colors ${
                                device === 'desktop'
                                    ? 'bg-accent text-[color:var(--accent-contrast)]'
                                    : 'text-text hover:bg-surface'
                            }`}
                            title={t('prd.desktopWidth')}
                        >
                            <TbDeviceDesktop className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setDevice('mobile')}
                            className={`px-2.5 py-1.5 transition-colors ${
                                device === 'mobile'
                                    ? 'bg-accent text-[color:var(--accent-contrast)]'
                                    : 'text-text hover:bg-surface'
                            }`}
                            title={t('prd.mobileWidth')}
                        >
                            <TbDeviceMobile className="h-4 w-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => void copyHtml()}
                        className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface"
                    >
                        {copied ? (
                            <TbCheck className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                            <TbCopy className="h-3.5 w-3.5" />
                        )}
                        {t('prd.copyHtml')}
                    </button>
                    <button
                        onClick={downloadHtml}
                        className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface"
                    >
                        <TbDownload className="h-3.5 w-3.5" />
                        {t('prd.download')}
                    </button>
                    <button
                        onClick={onGenerate}
                        title={t('prd.mockupEstimatedCredits')
                            .replace('{total}', String(estimatedCredits))
                            .replace('{pages}', String(pageCount))
                            .replace('{per}', String(creditsPerPage))}
                        className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-[color:var(--accent-contrast)] transition-all hover:opacity-90"
                    >
                        <TbRefresh className="h-3.5 w-3.5" />
                        {t('prd.regenerate')}
                    </button>
                </div>
            </div>

            {categoryChips && <div className="flex flex-col gap-2">{categoryChips}</div>}

            {/* Screen tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {pages.map((p, i) => (
                    <button
                        key={p.id}
                        onClick={() => setActiveIdx(i)}
                        className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                            i === activeIdx
                                ? 'bg-accent text-[color:var(--accent-contrast)] shadow-md'
                                : 'border border-border text-text hover:bg-surface'
                        }`}
                        title={p.description || p.name}
                    >
                        {p.name}
                    </button>
                ))}
            </div>

            {/* Preview */}
            {active && (
                <div className="space-y-2">
                    {active.description && (
                        <p className="text-xs text-text">{active.description}</p>
                    )}
                    <motion.div
                        key={`${active.id}-${device}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden rounded-2xl border border-border bg-white"
                    >
                        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                            <span className="flex gap-1">
                                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                            </span>
                            <span className="truncate text-[10px] font-mono text-text">
                                {projectTitle ? `${projectTitle} · ` : ''}
                                {active.name}
                            </span>
                        </div>
                        <div
                            className={`mx-auto bg-white transition-all ${
                                device === 'mobile' ? 'w-[390px] max-w-full' : 'w-full'
                            }`}
                        >
                            <iframe
                                title={`${active.name} mockup`}
                                srcDoc={active.html}
                                className="h-[70vh] w-full border-0 bg-white"
                            />
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

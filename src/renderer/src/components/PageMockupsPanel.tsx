import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    TbDeviceDesktop,
    TbDeviceMobile,
    TbRefresh,
    TbCopy,
    TbCheck,
    TbDownload,
} from 'react-icons/tb';
import Loader from './Loader';
import { useLanguage } from '@/context/useLanguage';
import type { PrdMockupPage } from '@/types/prd';

interface Props {
    pages: PrdMockupPage[];
    /** Screens the mockups would be generated for (from the PRD / page flow). */
    screenNames: string[];
    styleName?: string;
    isGenerating: boolean;
    onGenerate: () => void;
    onNotify: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    projectTitle: string;
}

type DeviceMode = 'desktop' | 'mobile';

/**
 * Per-page UI mockups generated from the PRD / page flow, each rendered in a
 * live, sandboxed iframe. Screens are switchable and previewable at desktop or
 * mobile width, and each mockup can be copied or downloaded as standalone HTML.
 */
export default function PageMockupsPanel({
    pages,
    screenNames,
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

    if (isGenerating) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader className="h-8 w-8" />
                <span className="animate-pulse text-xs font-semibold text-text">
                    {t('prd.mockupGenerating')}
                </span>
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
                {screenNames.length > 0 && (
                    <p className="max-w-lg text-center text-[11px] font-mono text-text/70">
                        {screenNames.length} {t('prd.screens')}:{' '}
                        {screenNames.slice(0, 6).join(' · ')}
                        {screenNames.length > 6 ? ' …' : ''}
                    </p>
                )}
                <button
                    onClick={onGenerate}
                    className="mt-2 flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-[color:var(--accent-contrast)] transition-all hover:opacity-90"
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
                        className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-[color:var(--accent-contrast)] transition-all hover:opacity-90"
                    >
                        <TbRefresh className="h-3.5 w-3.5" />
                        {t('prd.regenerate')}
                    </button>
                </div>
            </div>

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

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TbFileText,
    TbDatabase,
    TbRoute,
    TbPalette,
    TbSparkles,
    TbRefresh,
    TbCopy,
    TbCheck,
    TbDownload,
    TbArrowLeft,
} from 'react-icons/tb';
import type { IconType } from 'react-icons';
import type { PrdDesign, PrdOutputs, PrdOutputTab, ParsedErDiagram, ParsedFlow } from '@/types/prd';
import { parseErDiagram, parseFlowchart } from '@/lib/prdHelpers';
import Loader from './Loader';
import FormattedContent from './FormattedContent';
import { DatabaseTableView, PageFlowView } from './ArtifactViews';
import { useLanguage } from '@/context/useLanguage';

interface Props {
    outputs: PrdOutputs;
    design: PrdDesign | null;
    projectTitle: string;
    activeTab: PrdOutputTab;
    onTabChange: (tab: PrdOutputTab) => void;
    onAddNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    onRegenerate: () => void;
    isRegenerating: boolean;
    onGenerateDesign?: () => void;
    isDesigning?: boolean;
    onBackToChat: () => void;
}

const TABS: { key: PrdOutputTab; labelKey: string; icon: IconType }[] = [
    { key: 'prd', labelKey: 'prdWorkspace.tabDocument', icon: TbFileText },
    { key: 'database', labelKey: 'prdWorkspace.tabSchema', icon: TbDatabase },
    { key: 'flow', labelKey: 'prdWorkspace.tabFlow', icon: TbRoute },
    { key: 'design', labelKey: 'prdWorkspace.tabDesign', icon: TbPalette },
];

/**
 * Full-screen PRD results workspace, mirroring the web app's
 * `PrdResultsWorkspace`: a top action bar + left tab rail with PRD document,
 * database schema, page flow and design-recommendation views.
 */
export default function PrdResultsWorkspace({
    outputs,
    design,
    projectTitle,
    activeTab,
    onTabChange,
    onAddNotification,
    onRegenerate,
    isRegenerating,
    onGenerateDesign,
    isDesigning = false,
    onBackToChat,
}: Props): JSX.Element {
    const { t } = useLanguage();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const copyPrd = async (): Promise<void> => {
        if (!outputs.prd_markdown) return;
        await navigator.clipboard.writeText(outputs.prd_markdown);
        setCopied(true);
        onAddNotification(t('prdWorkspace.copied'), 'success');
        window.setTimeout(() => setCopied(false), 2000);
    };

    const buildAllMarkdown = (): string => {
        const title = projectTitle || t('prdWorkspace.docTitle');
        const parts = [
            `# ${title} — ${t('prdWorkspace.fullPrompt')}\n\n> ${t('prdWorkspace.generatedBy')}\n`,
        ];
        if (outputs.prd_markdown)
            parts.push(`---\n\n## ${t('prdWorkspace.docTitle')}\n\n${outputs.prd_markdown}`);
        if (outputs.database_schema)
            parts.push(
                `---\n\n## ${t('prdWorkspace.tabSchema')}\n\n\`\`\`mermaid\n${outputs.database_schema}\n\`\`\``,
            );
        if (outputs.page_flow)
            parts.push(
                `---\n\n## ${t('prdWorkspace.tabFlow')}\n\n\`\`\`mermaid\n${outputs.page_flow}\n\`\`\``,
            );
        return parts.join('\n\n');
    };

    const downloadAll = (): void => {
        const blob = new Blob([buildAllMarkdown()], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (projectTitle || 'prd').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
        a.download = `${safeTitle}-full-prompt.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onAddNotification(t('prdWorkspace.downloaded'), 'success');
    };

    const parsedDb: ParsedErDiagram | null = outputs.database_schema
        ? parseErDiagram(outputs.database_schema)
        : null;
    const parsedFlow: ParsedFlow | null = outputs.page_flow
        ? parseFlowchart(outputs.page_flow)
        : null;

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-white">
            {/* Top bar */}
            <header className="shrink-0 border-b border-border bg-[color:var(--surface)]/80 backdrop-blur-xl">
                <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
                    <button
                        onClick={onBackToChat}
                        className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[color:var(--surface-2)] px-3 py-2 text-xs font-bold text-text-h transition-colors hover:opacity-80"
                    >
                        <TbArrowLeft className="h-4 w-4" />
                        {t('prdWorkspace.backToChat')}
                    </button>
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-neutral-900 shadow-md dark:bg-white">
                            <TbSparkles className="h-3.5 w-3.5 text-white dark:text-neutral-900" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-sm font-bold">
                                {projectTitle || t('prdWorkspace.fallbackTitle')}
                            </h1>
                            <p className="font-mono text-[10px] text-text">
                                {t('prdWorkspace.fullWorkspace')}
                            </p>
                        </div>
                    </div>

                    <div className="ml-auto flex flex-wrap items-center gap-1.5">
                        {onGenerateDesign && (
                            <button
                                onClick={() => {
                                    onTabChange('design');
                                    onGenerateDesign();
                                }}
                                disabled={isDesigning}
                                className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-900/20 transition-all active:scale-95 disabled:opacity-40"
                            >
                                {isDesigning ? (
                                    <Loader className="h-3.5 w-3.5" />
                                ) : (
                                    <TbPalette className="h-4 w-4" />
                                )}
                                <span className="hidden sm:inline">
                                    {isDesigning
                                        ? t('prdWorkspace.designing')
                                        : t('prdWorkspace.generateDesign')}
                                </span>
                            </button>
                        )}
                        <button
                            onClick={onRegenerate}
                            disabled={isRegenerating}
                            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-text-h transition-all hover:opacity-80 active:scale-95 disabled:opacity-40"
                        >
                            {isRegenerating ? (
                                <Loader className="h-3.5 w-3.5" />
                            ) : (
                                <TbRefresh className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">{t('prdWorkspace.regenerate')}</span>
                        </button>
                        <button
                            onClick={copyPrd}
                            disabled={!outputs.prd_markdown}
                            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-text-h transition-all hover:opacity-80 active:scale-95 disabled:opacity-40"
                        >
                            {copied ? (
                                <TbCheck className="h-4 w-4 text-emerald-500" />
                            ) : (
                                <TbCopy className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">{t('prdWorkspace.copyPrd')}</span>
                        </button>
                        <button
                            onClick={downloadAll}
                            disabled={!outputs.prd_markdown}
                            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 dark:bg-white dark:text-neutral-900"
                        >
                            <TbDownload className="h-4 w-4" />
                            <span className="hidden sm:inline">
                                {t('prdWorkspace.downloadAll')}
                            </span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Body: left rail + content */}
            <div className="flex min-h-0 flex-1">
                <nav className="flex w-16 shrink-0 flex-col gap-1 border-r border-border bg-[color:var(--surface)]/60 p-2 md:w-60 md:p-3">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => onTabChange(tab.key)}
                                className={`relative flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                                    isActive
                                        ? 'text-white dark:text-neutral-900'
                                        : 'text-text hover:bg-[color:var(--surface-2)] hover:text-text-h'
                                }`}
                            >
                                {isActive && (
                                    <motion.span
                                        layoutId="prd-workspace-tab-bg"
                                        className="absolute inset-0 rounded-xl bg-neutral-900 shadow-md dark:bg-white"
                                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                                    />
                                )}
                                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                                <span className="relative z-10 hidden truncate md:inline">
                                    {t(tab.labelKey)}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <main className="min-w-0 flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
                        <AnimatePresence mode="wait">
                            {activeTab === 'prd' && (
                                <motion.div
                                    key="prd"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    {outputs.prd_markdown ? (
                                        <article className="max-w-none break-words text-sm leading-relaxed">
                                            <FormattedContent content={outputs.prd_markdown} />
                                        </article>
                                    ) : (
                                        <p className="py-12 text-center text-sm text-text">
                                            {t('prdWorkspace.noPrd')}
                                        </p>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'database' && (
                                <motion.div
                                    key="database"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <DatabaseTableView parsed={parsedDb} />
                                </motion.div>
                            )}

                            {activeTab === 'flow' && (
                                <motion.div
                                    key="flow"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <PageFlowView parsed={parsedFlow} />
                                </motion.div>
                            )}

                            {activeTab === 'design' && (
                                <motion.div
                                    key="design"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    {isDesigning ? (
                                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                                            <Loader className="h-8 w-8" />
                                            <span className="animate-pulse text-xs font-semibold text-text">
                                                {t('prdWorkspace.curating')}
                                            </span>
                                        </div>
                                    ) : design && design.design_styles.length > 0 ? (
                                        <DesignPanel design={design} />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center gap-3 py-12">
                                            <TbPalette className="h-8 w-8 text-text/40" />
                                            <p className="text-center text-sm text-text">
                                                {t('prdWorkspace.noDesign')}
                                            </p>
                                            {onGenerateDesign && (
                                                <button
                                                    onClick={onGenerateDesign}
                                                    className="flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:opacity-90"
                                                >
                                                    <TbPalette className="h-4 w-4" />
                                                    {t('prdWorkspace.generateDesignRecs')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}

/* ── Design panel ────────────────────────────────────────────────────────── */
function DesignPanel({ design }: { design: PrdDesign }): JSX.Element {
    const { t } = useLanguage();
    return (
        <div className="space-y-5">
            {design.design_summary && (
                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm leading-relaxed text-text-h">
                    {design.design_summary}
                </div>
            )}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {design.design_styles.map((style) => {
                    const isPrimary = style.id === design.primary_recommendation;
                    return (
                        <motion.div
                            key={style.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-2xl border p-5 shadow-sm ${
                                isPrimary
                                    ? 'border-indigo-500/50 bg-indigo-500/5'
                                    : 'border-border bg-[color:var(--surface)]'
                            }`}
                        >
                            <div className="mb-2 flex items-center gap-2">
                                <h3 className="text-base font-bold text-text-h">{style.name}</h3>
                                {isPrimary && (
                                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                        {t('prdWorkspace.primary')}
                                    </span>
                                )}
                            </div>
                            {style.tagline && (
                                <p className="mb-2 text-xs font-medium italic text-accent">
                                    {style.tagline}
                                </p>
                            )}
                            <p className="mb-3 text-sm leading-relaxed text-text">
                                {style.description}
                            </p>

                            {style.color_palette.length > 0 && (
                                <div className="mb-3">
                                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-text">
                                        {t('prdWorkspace.palette')}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {style.color_palette.map((color, i) => (
                                            <span
                                                key={i}
                                                className="grid h-7 w-7 place-items-center rounded-lg border border-border"
                                                style={{ background: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mb-3 text-xs text-text">
                                <span className="font-bold uppercase tracking-wider">
                                    {t('prdWorkspace.typography')}
                                </span>{' '}
                                {style.typography.headline} / {style.typography.body}
                            </div>

                            {style.key_principles.length > 0 && (
                                <ul className="list-disc space-y-1 pl-4 text-xs text-text">
                                    {style.key_principles.map((p, i) => (
                                        <li key={i}>{p}</li>
                                    ))}
                                </ul>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import {
    TbTerminal2,
    TbCheck,
    TbCopy,
    TbDownload,
    TbListCheck,
    TbCode,
    TbLayersLinked,
    TbCpu,
} from 'react-icons/tb';
import type { PrdTaskPhase, PrdAgentRules, PrdArchitectureCanvas } from '@/types/prd';
import { CODEBASE_TEMPLATES } from '@/data/codebaseTemplates';

interface PrdTasksViewProps {
    phases: PrdTaskPhase[];
    onAddNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const PrdTasksView: React.FC<PrdTasksViewProps> = ({ phases, onAddNotification }) => {
    const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);

    const copyPrompt = async (id: string, prompt: string) => {
        try {
            await navigator.clipboard.writeText(prompt);
            setCopiedTaskId(id);
            setTimeout(() => setCopiedTaskId(null), 2000);
            onAddNotification('Prompt task berhasil disalin untuk AI Coding Agent!', 'success');
        } catch {
            onAddNotification('Gagal menyalin prompt task.', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <TbListCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        PRDTask — Step-by-Step AI Coding Plan
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Daftar sprint task terstruktur untuk dimasukkan ke AI coding agent (Cursor /
                        Windsurf / Claude Code) secara bertahap.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {phases.map((phase) => (
                    <div
                        key={phase.id}
                        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 p-5 space-y-4"
                    >
                        <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                            <span className="text-[10px] uppercase tracking-widest font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md">
                                Phase {phase.phaseNumber}
                            </span>
                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white mt-2">
                                {phase.phaseTitle}
                            </h4>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                {phase.summary}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {phase.tasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="p-4 rounded-xl border border-neutral-200/70 dark:border-neutral-800/80 bg-neutral-50/60 dark:bg-neutral-800/30 hover:border-blue-400/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                <h5 className="text-xs font-bold text-neutral-900 dark:text-white">
                                                    {task.title}
                                                </h5>
                                            </div>
                                            <p className="text-xs text-neutral-600 dark:text-neutral-300">
                                                {task.description}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => copyPrompt(task.id, task.promptForAgent)}
                                            className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-colors active:scale-95 shadow-sm"
                                        >
                                            {copiedTaskId === task.id ? (
                                                <>
                                                    <TbCheck className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                                                    Disalin!
                                                </>
                                            ) : (
                                                <>
                                                    <TbCopy className="w-3.5 h-3.5" />
                                                    Copy Prompt
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {task.acceptanceCriteria.length > 0 && (
                                        <div className="mt-3 pt-2 border-t border-neutral-200/50 dark:border-neutral-700/50">
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500 mb-1.5">
                                                Acceptance Criteria
                                            </p>
                                            <ul className="space-y-1">
                                                {task.acceptanceCriteria.map((ac, idx) => (
                                                    <li
                                                        key={idx}
                                                        className="text-[11px] text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5"
                                                    >
                                                        <span className="text-blue-500">✓</span>
                                                        <span>{ac}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface AgentRulesViewProps {
    rules: PrdAgentRules;
    onAddNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AgentRulesView: React.FC<AgentRulesViewProps> = ({ rules, onAddNotification }) => {
    const [selectedTab, setSelectedTab] = useState<'cursor' | 'claude' | 'agents' | 'system'>(
        'cursor',
    );
    const [copied, setCopied] = useState(false);

    const activeContent =
        selectedTab === 'cursor'
            ? rules.cursorrules
            : selectedTab === 'claude'
              ? rules.claudeMd
              : selectedTab === 'agents'
                ? rules.agentsMd
                : rules.systemPrompt;

    const copyContent = async () => {
        try {
            await navigator.clipboard.writeText(activeContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            onAddNotification(`Rules untuk ${selectedTab} berhasil disalin!`, 'success');
        } catch {
            onAddNotification('Gagal menyalin ke clipboard.', 'error');
        }
    };

    const downloadRuleFile = () => {
        const filename =
            selectedTab === 'cursor'
                ? '.cursorrules'
                : selectedTab === 'claude'
                  ? 'CLAUDE.md'
                  : selectedTab === 'agents'
                    ? 'AGENTS.md'
                    : 'system-prompt.txt';

        const blob = new Blob([activeContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onAddNotification(`File ${filename} berhasil di-download!`, 'success');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                        <TbTerminal2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Coding Agent Rules & Instructions
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        Instruksi terstandarisasi untuk Cursor, Windsurf, Claude Code, Cline, Roo
                        Code, atau Custom System Prompt.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={copyContent}
                        className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 transition-all shadow-sm"
                    >
                        {copied ? (
                            <TbCheck className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                            <TbCopy className="w-3.5 h-3.5" />
                        )}
                        {copied ? 'Tersalin' : 'Copy'}
                    </button>
                    <button
                        type="button"
                        onClick={downloadRuleFile}
                        className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 transition-all shadow-xs"
                    >
                        <TbDownload className="w-3.5 h-3.5" />
                        Download File
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                {[
                    { id: 'cursor', label: '.cursorrules (Cursor / Windsurf)' },
                    { id: 'claude', label: 'CLAUDE.md (Claude Code)' },
                    { id: 'agents', label: 'AGENTS.md (General Agents)' },
                    { id: 'system', label: 'System Prompt' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
                        className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            selectedTab === tab.id
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <pre className="p-4 rounded-2xl bg-neutral-900 text-neutral-100 font-mono text-xs overflow-x-auto border border-neutral-800 whitespace-pre-wrap leading-relaxed">
                {activeContent}
            </pre>
        </div>
    );
};

interface CodebaseTemplatesViewProps {
    onAddNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const CodebaseTemplatesView: React.FC<CodebaseTemplatesViewProps> = ({
    onAddNotification,
}) => {
    const copyCommand = async (cmd: string) => {
        try {
            await navigator.clipboard.writeText(cmd);
            onAddNotification('Setup command disalin ke clipboard!', 'success');
        } catch {
            onAddNotification('Gagal menyalin command.', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-linear-to-r from-blue-600/10 via-blue-500/10 to-indigo-600/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                        Quick Scaffold CLI
                    </span>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                        Scaffold Project ke Direktori Lokal
                    </h4>
                    <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                        Inisialisasi repo baru dan download semua file rules agent (.cursorrules,
                        CLAUDE.md, PRD, TASKS) dalam satu perintah.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <code className="px-3 py-1.5 rounded-xl bg-neutral-900 text-neutral-100 font-mono text-[11px] select-all">
                        npx iarty-scaffold my-app
                    </code>
                    <button
                        type="button"
                        onClick={() => copyCommand('npx iarty-scaffold my-app')}
                        className="cursor-pointer p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-blue-500 text-neutral-700 dark:text-neutral-200 transition-colors"
                        title="Copy Scaffold Command"
                    >
                        <TbCopy className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <TbCode className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Codebase Starter Templates
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Template codebase yang teruji, irit token, dan siap produksi untuk langsung
                    dieksekusi bersama PRD ini.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CODEBASE_TEMPLATES.map((tmpl) => (
                    <div
                        key={tmpl.id}
                        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 p-5 flex flex-col justify-between space-y-4 hover:border-blue-500/50 transition-colors shadow-xs"
                    >
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                    {tmpl.category}
                                </span>
                            </div>
                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                                {tmpl.name}
                            </h4>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                {tmpl.tagline}
                            </p>

                            <div className="flex flex-wrap gap-1.5 pt-2">
                                {tmpl.techStack.map((tech) => (
                                    <span
                                        key={tech}
                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 font-mono text-[11px] text-neutral-800 dark:text-neutral-200">
                                <span className="truncate">{tmpl.setupCommand}</span>
                                <button
                                    type="button"
                                    onClick={() => copyCommand(tmpl.setupCommand)}
                                    className="cursor-pointer p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white shrink-0"
                                    title="Copy Command"
                                >
                                    <TbCopy className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic">
                                {tmpl.recommendedFor}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface ArchitectureCanvasViewProps {
    canvas: PrdArchitectureCanvas;
}

export const ArchitectureCanvasView: React.FC<ArchitectureCanvasViewProps> = ({ canvas }) => {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <TbLayersLinked className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Interactive Architecture Canvas
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Pemetaan visual komponen arsitektur modular dari sistem PRD.
                </p>
            </div>

            <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 overflow-x-auto">
                <div className="min-w-[700px] flex items-center justify-between gap-6 py-6">
                    {canvas.nodes.map((node, index) => (
                        <React.Fragment key={node.id}>
                            <div className="flex-1 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm text-center space-y-1.5">
                                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto text-xs font-bold">
                                    <TbCpu className="w-4 h-4" />
                                </div>
                                <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                                    {node.label}
                                </h4>
                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                                    {node.description}
                                </p>
                            </div>

                            {index < canvas.nodes.length - 1 && (
                                <div className="shrink-0 flex flex-col items-center">
                                    <span className="text-[10px] font-mono text-neutral-400 mb-1">
                                        {canvas.edges[index]?.label || 'connect'}
                                    </span>
                                    <span className="text-neutral-400 text-sm">→</span>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

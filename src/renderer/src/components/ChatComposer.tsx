import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IconType } from 'react-icons';
import {
    TbMicrophone,
    TbPaperclip,
    TbUserSearch,
    TbHierarchy2,
    TbHistory,
    TbBone,
    TbSearch,
    TbBrain,
    TbFile,
    TbPhoto,
    TbVideo,
    TbMusic,
    TbFileDescription,
} from 'react-icons/tb';
import { IoSend } from 'react-icons/io5';
import type { CloudModel } from '@shared/types';
import type { CavemanMode, HistoryMode, ReasoningEffort } from '@shared/types';
import type { RoleTemplate } from '@/data/roles';


interface Props {
    prompt: string;
    setPrompt: (value: string) => void;
    attachedFile: File | null;
    onAttachFile: (file: File) => void;
    onRemoveAttachment: () => void;
    onSubmit: () => void;
    onStop?: () => void;
    isLoading: boolean;
    isModelReady: boolean;
    isListening: boolean;
    onToggleListening: () => void;
    model: CloudModel | undefined;
    messagesLength: number;
    selectedRole: RoleTemplate | null;
    feature: string;
    setIsRoleModalOpen: (open: boolean) => void;
    setIsFeatureModalOpen: (open: boolean) => void;
    historyMode: HistoryMode;
    historyCustomCount: number;
    onHistoryModeChange: (mode: HistoryMode) => void;
    onHistoryCustomCountChange: (count: number) => void;
    cavemanMode: CavemanMode;
    onCavemanModeChange: (mode: CavemanMode) => void;
    reasoningEffort: ReasoningEffort;
    onReasoningEffortChange: (effort: ReasoningEffort) => void;
}

const HISTORY_MODES: { key: HistoryMode; label: string; hint: string }[] = [
    { key: 'short', label: 'Short', hint: '6 msgs' },
    { key: 'long', label: 'Long', hint: '40 msgs' },
    { key: 'full', label: 'Full', hint: 'all' },
    { key: 'custom', label: 'Custom', hint: 'pick' },
];

const CAVEMAN_MODES: { key: CavemanMode; label: string; hint: string }[] = [
    { key: 'off', label: 'Off', hint: 'normal' },
    { key: 'lite', label: 'Lite', hint: 'short' },
    { key: 'full', label: 'Full', hint: 'caveman' },
];

const REASONING_LEVELS: ReasoningEffort[] = ['disabled', 'low', 'medium', 'high'];

const BUTTON_HOVER = { y: -1, scale: 1.05 };
const BUTTON_TAP = { scale: 0.94 };
const BUTTON_SPRING = { type: 'spring' as const, stiffness: 400, damping: 25 };
const MENU_INITIAL = { opacity: 0, y: 8, scale: 0.96 };
const MENU_ANIMATE = { opacity: 1, y: 0, scale: 1 };
const MENU_EXIT = { opacity: 0, y: 8, scale: 0.96 };
const MENU_TRANSITION = { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const };

type MenuKey = 'history' | 'caveman' | 'reasoning' | 'attach' | null;

/**
 * Chat composer with the full toolbar (attach, role, feature, history,
 * caveman, reasoning, deep-search, voice) — a desktop adaptation of the web
 * app's `ChatComposer`, keeping the same interaction style and spring motions.
 */
export default function ChatComposer(props: Props): JSX.Element {
    const {
        prompt,
        setPrompt,
        attachedFile,
        onAttachFile,
        onRemoveAttachment,
        onSubmit,
        onStop,
        isLoading,
        isModelReady,
        isListening,
        onToggleListening,
        model,
        messagesLength,
        selectedRole,
        feature,
        setIsRoleModalOpen,
        setIsFeatureModalOpen,
        historyMode,
        historyCustomCount,
        onHistoryModeChange,
        onHistoryCustomCountChange,
        cavemanMode,
        onCavemanModeChange,
        reasoningEffort,
        onReasoningEffortChange,
    } = props;

    const [openMenu, setOpenMenu] = useState<MenuKey>(null);
    const [isDeepSearch, setIsDeepSearch] = useState(false);
    const containerRef = useRef<HTMLFormElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent): void => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        const next = Math.min(el.scrollHeight, 200);
        el.style.height = `${Number.isFinite(next) && next > 0 ? next : 44}px`;
    }, [prompt]);

    const toggleMenu = (key: MenuKey): void => setOpenMenu((prev) => (prev === key ? null : key));
    const closeMenu = (): void => setOpenMenu(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file) onAttachFile(file);
        if (e.target) e.target.value = '';
        closeMenu();
    };

    const canSend = prompt.trim().length > 0 && isModelReady && !isLoading;

    const submit = (e: React.FormEvent): void => {
        e.preventDefault();
        if (!canSend) return;
        closeMenu();
        onSubmit();
    };

    const toolButton = (
        icon: IconType,
        title: string,
        onClick: () => void,
        opts: { active?: boolean; disabled?: boolean; label?: string; accent?: string } = {},
    ): JSX.Element => {
        const Icon = icon;
        return (
            <motion.button
                type="button"
                disabled={opts.disabled}
                onClick={onClick}
                whileHover={!opts.disabled ? BUTTON_HOVER : undefined}
                whileTap={!opts.disabled ? BUTTON_TAP : undefined}
                transition={BUTTON_SPRING}
                title={title}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full p-1.5 text-[10px] font-black transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 md:rounded-xl md:px-3 md:py-1.5 ${
                    opts.active
                        ? (opts.accent ?? 'bg-accent/15 text-accent')
                        : 'text-text hover:bg-[color:var(--surface-2)] hover:text-accent'
                }`}
            >
                <Icon className="h-5 w-5 md:h-4 md:w-4" />
                {opts.label && <span className="hidden uppercase tracking-widest md:inline">{opts.label}</span>}
            </motion.button>
        );
    };

    return (
        <form onSubmit={submit} ref={containerRef} className="w-full">
            <div className="relative rounded-3xl border border-border bg-[color:var(--surface)]/80 p-2 shadow-xl shadow-black/5 backdrop-blur-2xl transition-colors focus-within:border-accent/50">
                {/* Attachment preview */}
                <AnimatePresence>
                    {attachedFile && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-2 flex items-center gap-2 rounded-2xl border border-border bg-[color:var(--surface-2)] px-3 py-2 text-xs text-text-h"
                        >
                            <TbFile className="shrink-0 text-accent" />
                            <span className="truncate">{attachedFile.name}</span>
                            <button
                                type="button"
                                onClick={onRemoveAttachment}
                                className="ml-auto shrink-0 cursor-pointer text-text hover:text-red-500"
                            >
                                Remove
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-end gap-1">
                    <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (canSend) {
                                    closeMenu();
                                    onSubmit();
                                }
                            }
                        }}
                        rows={1}
                        spellCheck={false}
                        placeholder={
                            !isModelReady
                                ? 'Select a model to start chatting…'
                                : 'How can I help you today?'
                        }
                        className="max-h-48 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-text-h outline-none placeholder:text-text"
                    />
                </div>

                {/* Toolbar */}
                <div className="mt-1 flex items-center justify-between gap-1 border-t border-border/60 pt-1.5">
                    <div className="flex flex-wrap items-center gap-0.5">
                        {/* Attach */}
                        <div className="relative">
                            {toolButton(TbPaperclip, 'Attach file', () => toggleMenu('attach'), {
                                active: openMenu === 'attach',
                            })}
                            <Menu open={openMenu === 'attach'} onClose={closeMenu}>
                                <MenuLabel>Attach</MenuLabel>
                                <AttachItem icon={TbFile} label="Any file" accept="" onPick={handleFileChange} closeMenu={closeMenu} />
                                <AttachItem icon={TbPhoto} label="Image" accept="image/*" onPick={handleFileChange} closeMenu={closeMenu} />
                                <AttachItem icon={TbVideo} label="Video" accept="video/*" onPick={handleFileChange} closeMenu={closeMenu} />
                                <AttachItem icon={TbMusic} label="Audio" accept="audio/*" onPick={handleFileChange} closeMenu={closeMenu} />
                                <AttachItem icon={TbFileDescription} label="PDF" accept="application/pdf" onPick={handleFileChange} closeMenu={closeMenu} />
                            </Menu>
                        </div>

                        {/* Role */}
                        {toolButton(
                            TbUserSearch,
                            selectedRole ? `Role: ${selectedRole.name}` : 'Select role',
                            () => {
                                closeMenu();
                                setIsRoleModalOpen(true);
                            },
                            {
                                active: Boolean(selectedRole),
                                accent: 'bg-blue-600 text-white',
                                label: selectedRole ? selectedRole.name.split(' ')[0] : undefined,
                            },
                        )}

                        {/* Feature */}
                        {toolButton(
                            TbHierarchy2,
                            feature ? `Feature: ${feature}` : 'Select feature',
                            () => {
                                closeMenu();
                                setIsFeatureModalOpen(true);
                            },
                            {
                                active: Boolean(feature),
                                accent: 'bg-emerald-600 text-white',
                                label: feature ? feature.split('-')[0] : undefined,
                            },
                        )}

                        {/* History */}
                        <div className="relative">
                            {toolButton(
                                TbHistory,
                                'History context length',
                                () => toggleMenu('history'),
                                {
                                    disabled: isLoading,
                                    active: openMenu === 'history',
                                    accent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
                                    label:
                                        historyMode === 'custom'
                                            ? `x${historyCustomCount}`
                                            : historyMode,
                                },
                            )}
                            <Menu open={openMenu === 'history'} onClose={closeMenu}>
                                <MenuLabel>History Context</MenuLabel>
                                {HISTORY_MODES.map((mode) => (
                                    <MenuRow
                                        key={mode.key}
                                        label={mode.label}
                                        hint={mode.hint}
                                        active={historyMode === mode.key}
                                        onClick={() => onHistoryModeChange(mode.key)}
                                    />
                                ))}
                                {historyMode === 'custom' && (
                                    <div className="flex items-center gap-3 px-3 py-2.5">
                                        <span className="shrink-0 text-xs font-medium text-text">
                                            Messages
                                        </span>
                                        <input
                                            type="range"
                                            min={1}
                                            max={200}
                                            value={historyCustomCount}
                                            onChange={(e) =>
                                                onHistoryCustomCountChange(Number(e.target.value))
                                            }
                                            className="w-full cursor-pointer accent-amber-500"
                                        />
                                        <span className="w-7 shrink-0 text-right text-xs font-black text-amber-600 dark:text-amber-400">
                                            {historyCustomCount}
                                        </span>
                                    </div>
                                )}
                            </Menu>
                        </div>

                        {/* Caveman */}
                        <div className="relative">
                            {toolButton(
                                TbBone,
                                `Caveman mode: ${cavemanMode}`,
                                () => toggleMenu('caveman'),
                                {
                                    disabled: isLoading,
                                    active: cavemanMode !== 'off',
                                    accent: 'bg-orange-700 text-white',
                                    label: cavemanMode !== 'off' ? cavemanMode : undefined,
                                },
                            )}
                            <Menu open={openMenu === 'caveman'} onClose={closeMenu}>
                                <MenuLabel>Caveman Mode</MenuLabel>
                                {CAVEMAN_MODES.map((mode) => (
                                    <MenuRow
                                        key={mode.key}
                                        label={mode.label}
                                        hint={mode.hint}
                                        active={cavemanMode === mode.key}
                                        onClick={() => onCavemanModeChange(mode.key)}
                                    />
                                ))}
                            </Menu>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Deep search */}
                        {model?.deepsearch === true &&
                            toolButton(
                                TbSearch,
                                isDeepSearch ? 'Deep search active' : 'Enable deep search',
                                () => {
                                    closeMenu();
                                    setIsDeepSearch((v) => !v);
                                },
                                {
                                    active: isDeepSearch,
                                    accent:
                                        'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
                                    label: 'Deep search',
                                },
                            )}

                        {/* Reasoning */}
                        {model?.thinking === true && (
                            <div className="relative">
                                {toolButton(
                                    TbBrain,
                                    `Reasoning: ${reasoningEffort}`,
                                    () => {
                                        if (reasoningEffort === 'disabled')
                                            onReasoningEffortChange('medium');
                                        toggleMenu('reasoning');
                                    },
                                    {
                                        disabled: isLoading,
                                        active: reasoningEffort !== 'disabled',
                                        accent:
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
                                        label:
                                            reasoningEffort === 'disabled'
                                                ? undefined
                                                : reasoningEffort,
                                    },
                                )}
                                <Menu open={openMenu === 'reasoning'} onClose={closeMenu} align="right">
                                    <MenuLabel>Reasoning effort</MenuLabel>
                                    {REASONING_LEVELS.map((level) => (
                                        <MenuRow
                                            key={level}
                                            label={level}
                                            hint={level === 'disabled' ? 'off' : 'thinking'}
                                            active={reasoningEffort === level}
                                            onClick={() => onReasoningEffortChange(level)}
                                        />
                                    ))}
                                </Menu>
                            </div>
                        )}

                        {/* Voice */}
                        {toolButton(
                            TbMicrophone,
                            isListening ? 'Recording… click to stop' : 'Voice input',
                            () => {
                                closeMenu();
                                onToggleListening();
                            },
                            {
                                disabled: isLoading,
                                active: isListening,
                                accent: 'bg-red-500 text-white',
                            },
                        )}

                        {/* Send / Stop */}
                        {isLoading ? (
                            <motion.button
                                type="button"
                                onClick={onStop}
                                whileHover={BUTTON_HOVER}
                                whileTap={BUTTON_TAP}
                                transition={BUTTON_SPRING}
                                className="shrink-0 cursor-pointer rounded-full bg-red-500/90 p-2 text-white transition-colors hover:bg-red-500 md:p-2.5"
                                title="Stop"
                            >
                                <span className="block h-4 w-4 rounded-sm bg-white md:h-5 md:w-5" />
                            </motion.button>
                        ) : (
                            <motion.button
                                type="submit"
                                disabled={!canSend}
                                whileHover={canSend ? BUTTON_HOVER : undefined}
                                whileTap={canSend ? BUTTON_TAP : undefined}
                                transition={BUTTON_SPRING}
                                className={`shrink-0 rounded-full p-2 transition-colors duration-300 md:p-2.5 ${
                                    canSend
                                        ? 'cursor-pointer text-accent hover:bg-accent/10'
                                        : 'cursor-not-allowed text-text/40'
                                }`}
                                title="Send message"
                            >
                                <IoSend className="h-5 w-5 md:h-6 md:w-6" />
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>

            {messagesLength === 0 && !attachedFile && (
                <p className="mt-3 hidden text-center text-xs text-text/60 md:block">
                    Press Enter to send • Shift + Enter for new line
                </p>
            )}
        </form>
    );
}

/* ── sub-components ─────────────────────────────────────────────────────── */

function Menu({
    open,
    onClose,
    align = 'left',
    children,
}: {
    open: boolean;
    onClose: () => void;
    align?: 'left' | 'right';
    children: React.ReactNode;
}): JSX.Element {
    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={MENU_INITIAL}
                    animate={MENU_ANIMATE}
                    exit={MENU_EXIT}
                    transition={MENU_TRANSITION}
                    onClick={onClose}
                    className={`absolute bottom-14 z-50 w-56 overflow-hidden rounded-2xl border border-border bg-[color:var(--surface)]/90 p-2 shadow-2xl backdrop-blur-2xl ${
                        align === 'right' ? 'right-0' : 'left-0'
                    }`}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function MenuLabel({ children }: { children: React.ReactNode }): JSX.Element {
    return (
        <span className="block px-3 py-2 text-xs font-black uppercase tracking-wider text-text">
            {children}
        </span>
    );
}

function MenuRow({
    label,
    hint,
    active,
    onClick,
}: {
    label: string;
    hint: string;
    active: boolean;
    onClick: () => void;
}): JSX.Element {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            whileHover={{ x: 2 }}
            transition={BUTTON_SPRING}
            className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-h hover:bg-[color:var(--surface-2)]'
            }`}
        >
            <span className="capitalize">{label}</span>
            <span className="text-[11px] capitalize text-text">{hint}</span>
        </motion.button>
    );
}

function AttachItem({
    icon: Icon,
    label,
    accept,
    onPick,
    closeMenu,
}: {
    icon: IconType;
    label: string;
    accept: string;
    onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
    closeMenu: () => void;
}): JSX.Element {
    return (
        <motion.label
            whileHover={{ x: 2 }}
            transition={BUTTON_SPRING}
            onClick={closeMenu}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-h transition-colors hover:bg-[color:var(--surface-2)] hover:text-accent"
        >
            <Icon className="text-lg" />
            <span>{label}</span>
            <input type="file" className="hidden" accept={accept} onChange={onPick} />
        </motion.label>
    );
}


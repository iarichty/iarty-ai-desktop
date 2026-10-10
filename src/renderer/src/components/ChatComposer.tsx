import { useEffect, useMemo, useRef, useState } from 'react';
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
import { matchSlashCommand, type SlashCommand, type SlashCommandKey } from '@/config/SlashCommands';
import { useLanguage } from '@/context/useLanguage';

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
    /** Runs a slash command (e.g. `/new`, `/clear`, `/compact`). */
    onRunCommand?: (command: SlashCommandKey) => void;
}

const HISTORY_MODES: { key: HistoryMode; labelKey: string; hintKey: string }[] = [
    { key: 'short', labelKey: 'composer.historyShort', hintKey: 'composer.historyShortHint' },
    { key: 'long', labelKey: 'composer.historyLong', hintKey: 'composer.historyLongHint' },
    { key: 'full', labelKey: 'composer.historyFull', hintKey: 'composer.historyFullHint' },
    { key: 'custom', labelKey: 'composer.historyCustom', hintKey: 'composer.historyCustomHint' },
];

const CAVEMAN_MODES: { key: CavemanMode; labelKey: string; hintKey: string }[] = [
    { key: 'off', labelKey: 'composer.cavemanOff', hintKey: 'composer.cavemanOffHint' },
    { key: 'lite', labelKey: 'composer.cavemanLite', hintKey: 'composer.cavemanLiteHint' },
    { key: 'full', labelKey: 'composer.cavemanFull', hintKey: 'composer.cavemanFullHint' },
];

const REASONING_LEVELS: ReasoningEffort[] = ['disabled', 'low', 'medium', 'high'];

const REASONING_LABEL_KEY: Record<ReasoningEffort, string> = {
    disabled: 'composer.reasoningDisabled',
    low: 'composer.reasoningLow',
    medium: 'composer.reasoningMedium',
    high: 'composer.reasoningHigh',
};

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
        onRunCommand,
    } = props;

    const { t } = useLanguage();
    const [openMenu, setOpenMenu] = useState<MenuKey>(null);
    const [isDeepSearch, setIsDeepSearch] = useState(false);
    const [commandIndex, setCommandIndex] = useState(0);
    const containerRef = useRef<HTMLFormElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const slashMatch = useMemo(() => matchSlashCommand(prompt), [prompt]);
    const showCommandMenu =
        Boolean(onRunCommand) && slashMatch.isCommand && slashMatch.matches.length > 0;

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

    const handlePromptChange = (value: string): void => {
        setPrompt(value);
        setCommandIndex(0);
    };

    const runCommand = (command: SlashCommand): void => {
        if (!onRunCommand) return;
        setPrompt('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        onRunCommand(command.key);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files?.[0];
        if (file) onAttachFile(file);
        if (e.target) e.target.value = '';
        closeMenu();
    };

    const canSend = prompt.trim().length > 0 && isModelReady && !isLoading;

    const submit = (e: React.FormEvent): void => {
        e.preventDefault();
        // Slash input is command territory, never a chat message: run an exact
        // command, otherwise just keep the autocomplete open.
        if (slashMatch.isCommand && onRunCommand) {
            if (slashMatch.exact) runCommand(slashMatch.exact);
            return;
        }
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
                {opts.label && (
                    <span className="hidden uppercase tracking-widest md:inline">{opts.label}</span>
                )}
            </motion.button>
        );
    };

    return (
        <form onSubmit={submit} ref={containerRef} className="w-full">
            <div className="relative rounded-3xl border border-border bg-[color:var(--surface)]/80 p-2 shadow-xl shadow-black/5 backdrop-blur-2xl transition-colors focus-within:border-accent/50">
                {/* Slash-command autocomplete */}
                <AnimatePresence>
                    {showCommandMenu && (
                        <motion.div
                            key="slash-command-menu"
                            initial={MENU_INITIAL}
                            animate={MENU_ANIMATE}
                            exit={MENU_EXIT}
                            transition={MENU_TRANSITION}
                            className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-2xl border border-border bg-[color:var(--surface)]/95 p-2 shadow-2xl backdrop-blur-2xl sm:w-80"
                        >
                            <span className="block px-3 py-2 text-xs font-black uppercase tracking-wider text-text">
                                {t('commands.title')}
                            </span>
                            <div className="flex flex-col gap-1">
                                {slashMatch.matches.map((cmd, index) => (
                                    <motion.button
                                        key={cmd.key}
                                        type="button"
                                        onMouseEnter={() => setCommandIndex(index)}
                                        onClick={() => runCommand(cmd)}
                                        whileHover={{ x: 2 }}
                                        transition={BUTTON_SPRING}
                                        className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                            index === commandIndex
                                                ? 'bg-accent/15 text-accent'
                                                : 'text-text-h hover:bg-[color:var(--surface-2)]'
                                        }`}
                                    >
                                        <span className="flex min-w-0 flex-col">
                                            <span className="truncate text-sm font-bold">
                                                /{cmd.key}
                                            </span>
                                            <span className="truncate text-[11px] text-text">
                                                {t(cmd.descKey)}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-[11px] font-medium text-text">
                                            {t(cmd.titleKey)}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                                {t('common.remove')}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex items-end gap-1">
                    <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={(e) => handlePromptChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (showCommandMenu) {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setCommandIndex((i) =>
                                        Math.min(slashMatch.matches.length - 1, i + 1),
                                    );
                                    return;
                                }
                                if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setCommandIndex((i) => Math.max(0, i - 1));
                                    return;
                                }
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setPrompt('');
                                    return;
                                }
                                if (e.key === 'Tab') {
                                    e.preventDefault();
                                    const cmd = slashMatch.matches[commandIndex];
                                    if (cmd) setPrompt(`/${cmd.key} `);
                                    return;
                                }
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    const cmd =
                                        slashMatch.exact ??
                                        slashMatch.matches[commandIndex] ??
                                        null;
                                    if (cmd) runCommand(cmd);
                                    return;
                                }
                            }
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
                                ? t('composer.placeholderNoModel')
                                : t('composer.placeholder')
                        }
                        className="max-h-48 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-text-h outline-none placeholder:text-text"
                    />
                </div>

                {/* Toolbar */}
                <div className="mt-1 flex items-center justify-between gap-1 border-t border-border/60 pt-1.5">
                    <div className="flex flex-wrap items-center gap-0.5">
                        {/* Attach */}
                        <div className="relative">
                            {toolButton(
                                TbPaperclip,
                                t('composer.attachFile'),
                                () => toggleMenu('attach'),
                                {
                                    active: openMenu === 'attach',
                                },
                            )}
                            <Menu open={openMenu === 'attach'} onClose={closeMenu}>
                                <MenuLabel>{t('composer.attach')}</MenuLabel>
                                <AttachItem
                                    icon={TbFile}
                                    label={t('composer.anyFile')}
                                    accept=""
                                    onPick={handleFileChange}
                                    closeMenu={closeMenu}
                                />
                                <AttachItem
                                    icon={TbPhoto}
                                    label={t('composer.image')}
                                    accept="image/*"
                                    onPick={handleFileChange}
                                    closeMenu={closeMenu}
                                />
                                <AttachItem
                                    icon={TbVideo}
                                    label={t('composer.video')}
                                    accept="video/*"
                                    onPick={handleFileChange}
                                    closeMenu={closeMenu}
                                />
                                <AttachItem
                                    icon={TbMusic}
                                    label={t('composer.audio')}
                                    accept="audio/*"
                                    onPick={handleFileChange}
                                    closeMenu={closeMenu}
                                />
                                <AttachItem
                                    icon={TbFileDescription}
                                    label={t('composer.pdf')}
                                    accept="application/pdf"
                                    onPick={handleFileChange}
                                    closeMenu={closeMenu}
                                />
                            </Menu>
                        </div>

                        {/* Role */}
                        {toolButton(
                            TbUserSearch,
                            selectedRole
                                ? `${t('composer.rolePrefix')}: ${selectedRole.name}`
                                : t('composer.selectRole'),
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
                            feature
                                ? `${t('composer.featurePrefix')}: ${feature}`
                                : t('composer.selectFeature'),
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
                                t('composer.historyTitle'),
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
                                <MenuLabel>{t('composer.historyHeading')}</MenuLabel>
                                {HISTORY_MODES.map((mode) => (
                                    <MenuRow
                                        key={mode.key}
                                        label={t(mode.labelKey)}
                                        hint={t(mode.hintKey)}
                                        active={historyMode === mode.key}
                                        onClick={() => onHistoryModeChange(mode.key)}
                                    />
                                ))}
                                {historyMode === 'custom' && (
                                    <div className="flex items-center gap-3 px-3 py-2.5">
                                        <span className="shrink-0 text-xs font-medium text-text">
                                            {t('composer.messages')}
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
                                `${t('composer.cavemanPrefix')}: ${cavemanMode}`,
                                () => toggleMenu('caveman'),
                                {
                                    disabled: isLoading,
                                    active: cavemanMode !== 'off',
                                    accent: 'bg-orange-700 text-white',
                                    label: cavemanMode !== 'off' ? cavemanMode : undefined,
                                },
                            )}
                            <Menu open={openMenu === 'caveman'} onClose={closeMenu}>
                                <MenuLabel>{t('composer.cavemanHeading')}</MenuLabel>
                                {CAVEMAN_MODES.map((mode) => (
                                    <MenuRow
                                        key={mode.key}
                                        label={t(mode.labelKey)}
                                        hint={t(mode.hintKey)}
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
                                isDeepSearch
                                    ? t('composer.deepSearchActive')
                                    : t('composer.deepSearchEnable'),
                                () => {
                                    closeMenu();
                                    setIsDeepSearch((v) => !v);
                                },
                                {
                                    active: isDeepSearch,
                                    accent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
                                    label: t('composer.deepSearch'),
                                },
                            )}

                        {/* Reasoning */}
                        {model?.thinking === true && (
                            <div className="relative">
                                {toolButton(
                                    TbBrain,
                                    `${t('composer.reasoningPrefix')}: ${reasoningEffort}`,
                                    () => {
                                        if (reasoningEffort === 'disabled')
                                            onReasoningEffortChange('medium');
                                        toggleMenu('reasoning');
                                    },
                                    {
                                        disabled: isLoading,
                                        active: reasoningEffort !== 'disabled',
                                        accent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
                                        label:
                                            reasoningEffort === 'disabled'
                                                ? undefined
                                                : reasoningEffort,
                                    },
                                )}
                                <Menu
                                    open={openMenu === 'reasoning'}
                                    onClose={closeMenu}
                                    align="right"
                                >
                                    <MenuLabel>{t('composer.reasoningHeading')}</MenuLabel>
                                    {REASONING_LEVELS.map((level) => (
                                        <MenuRow
                                            key={level}
                                            label={t(REASONING_LABEL_KEY[level])}
                                            hint={
                                                level === 'disabled'
                                                    ? t('composer.reasoningOffHint')
                                                    : t('composer.reasoningOnHint')
                                            }
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
                            isListening ? t('composer.recording') : t('composer.voice'),
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
                                title={t('composer.stop')}
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
                                title={t('composer.send')}
                            >
                                <IoSend className="h-5 w-5 md:h-6 md:w-6" />
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>

            {messagesLength === 0 && !attachedFile && (
                <p className="mt-3 hidden text-center text-xs text-text/60 md:block">
                    {t('composer.hint')}
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

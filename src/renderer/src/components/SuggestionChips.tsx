import { motion, AnimatePresence } from 'framer-motion';
import { TbBulb, TbRefresh } from 'react-icons/tb';
import type { PrdSuggestion } from '@/types/prd';

interface Props {
    suggestions: PrdSuggestion[];
    isLoading: boolean;
    onPick: (text: string) => void;
    onRegenerate: () => void;
    disabled?: boolean;
    visible?: boolean;
}

/** AI-proposed quick-reply chips, mirroring the web app's `SuggestionChips`. */
export default function SuggestionChips({
    suggestions,
    isLoading,
    onPick,
    onRegenerate,
    disabled = false,
    visible = true,
}: Props): JSX.Element | null {
    if (!visible) return null;
    const hasChips = suggestions.length > 0;

    return (
        <div className="mb-3 px-1">
            <div className="mb-2 flex items-center gap-1.5">
                <TbBulb className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-text">
                    Suggested answers
                </span>
                {!isLoading && (
                    <button
                        type="button"
                        onClick={onRegenerate}
                        disabled={disabled}
                        className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text transition-colors hover:bg-[color:var(--surface-2)] hover:text-text-h disabled:cursor-not-allowed disabled:opacity-40"
                        title="Generate suggested answers"
                    >
                        <TbRefresh className="h-3.5 w-3.5" />
                        {hasChips ? 'Refresh' : 'Suggest answers'}
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait" initial={false}>
                {isLoading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-wrap gap-2"
                    >
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className="h-7 animate-pulse rounded-full bg-[color:var(--surface-2)]"
                                style={{ width: `${90 + i * 32}px` }}
                            />
                        ))}
                    </motion.div>
                ) : hasChips ? (
                    <motion.div
                        key="chips"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-wrap gap-2"
                    >
                        {suggestions.map((suggestion, i) => (
                            <motion.button
                                key={suggestion.text}
                                type="button"
                                initial={{ opacity: 0, scale: 0.94 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05, duration: 0.25 }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                disabled={disabled}
                                onClick={() => onPick(suggestion.text)}
                                title={suggestion.text}
                                className="cursor-pointer rounded-full border border-border bg-[color:var(--surface)] px-3 py-1.5 text-xs font-semibold text-text-h transition-colors hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-amber-900/20"
                            >
                                {suggestion.label}
                            </motion.button>
                        ))}
                    </motion.div>
                ) : (
                    <motion.p
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[11px] text-text/70"
                    >
                        No suggestions yet — click &ldquo;Suggest answers&rdquo; to generate some.
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}

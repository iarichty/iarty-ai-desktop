import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TbX } from 'react-icons/tb';
import type { IconType } from 'react-icons';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: IconType;
    accent?: string;
    children: ReactNode;
}

/**
 * Frosted-glass centered modal, matching the web app's modals (blurred
 * backdrop, gradient header, glass body). Collapses to a bottom sheet on
 * small viewports.
 */
export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    icon: Icon,
    accent = 'text-accent',
    children,
}: Props): JSX.Element {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                    className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm md:items-center"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.97 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-border bg-[color:var(--surface)]/80 shadow-2xl backdrop-blur-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-border p-6">
                            <div>
                                <h2 className="flex items-center gap-2 text-xl font-black text-text-h">
                                    {Icon && <Icon className={`text-xl ${accent}`} />}
                                    {title}
                                </h2>
                                {subtitle && (
                                    <p className="mt-1 text-xs font-medium text-text">{subtitle}</p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="cursor-pointer rounded-xl p-2 transition-colors hover:bg-[color:var(--surface-2)]"
                                aria-label="Close"
                            >
                                <TbX className="text-2xl text-text" />
                            </button>
                        </div>
                        <div className="scrollbar-thin flex-1 overflow-y-auto p-6">{children}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

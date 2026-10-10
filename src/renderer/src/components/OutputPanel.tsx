import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TbAlertTriangle } from 'react-icons/tb';
import FormattedContent from './FormattedContent';
import { useLanguage } from '@/context/useLanguage';

interface Props {
    content: string;
    streaming: boolean;
    error: string | null;
    emptyHint?: ReactNode;
}

/** Read-only streamed output surface rendering markdown, with an error banner. */
export function OutputPanel({ content, streaming, error, emptyHint }: Props): JSX.Element {
    const { t } = useLanguage();
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [content, streaming]);

    return (
        <div className="mx-auto max-w-3xl">
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400"
                    >
                        <TbAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {content ? (
                <div className="pb-6 text-sm leading-relaxed">
                    <FormattedContent content={content} />
                    {streaming && (
                        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />
                    )}
                    <div ref={endRef} />
                </div>
            ) : (
                !error && (
                    <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-text">
                        {emptyHint ?? t('outputPanel.empty')}
                    </div>
                )
            )}
        </div>
    );
}

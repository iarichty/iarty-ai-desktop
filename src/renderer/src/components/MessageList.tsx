import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TbSparkles, TbUser } from 'react-icons/tb';
import type { ChatMessage } from '@shared/types';
import { Logo } from './Logo';

interface Props {
    messages: ChatMessage[];
    streaming: boolean;
}

/** Scrollable transcript with entrance animations per message. */
export function MessageList({ messages, streaming }: Props): JSX.Element {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streaming]);

    if (messages.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="flex flex-col gap-4 py-6">
            <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                    <Bubble
                        key={i}
                        message={m}
                        streaming={streaming && i === messages.length - 1}
                    />
                ))}
            </AnimatePresence>
            <div ref={endRef} />
        </div>
    );
}

function Bubble({ message, streaming }: { message: ChatMessage; streaming: boolean }): JSX.Element {
    const isUser = message.role === 'user';
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        >
            <div
                className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                    isUser
                        ? 'bg-[color:var(--surface-2)] text-text-h'
                        : 'bg-gradient-to-br from-accent to-accent/60'
                }`}
            >
                {isUser ? (
                    <TbUser className="h-4 w-4" />
                ) : (
                    <Logo size={15} color="var(--accent-contrast)" />
                )}
            </div>

            <div
                className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isUser
                        ? 'bg-accent text-[color:var(--accent-contrast)]'
                        : 'border border-border bg-[color:var(--surface)] text-text-h'
                }`}
            >
                {message.content}
                {streaming && message.content === '' && (
                    <span className="inline-flex gap-1">
                        <Dot delay={0} />
                        <Dot delay={0.15} />
                        <Dot delay={0.3} />
                    </span>
                )}
                {streaming && message.content !== '' && (
                    <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />
                )}
            </div>
        </motion.div>
    );
}

function Dot({ delay }: { delay: number }): JSX.Element {
    return (
        <motion.span
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay }}
            className="inline-block h-1.5 w-1.5 rounded-full bg-text"
        />
    );
}

function EmptyState(): JSX.Element {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent/60 shadow-lg shadow-accent/20"
            >
                <TbSparkles className="h-7 w-7 text-[color:var(--accent-contrast)]" />
            </motion.div>
            <div>
                <p className="text-sm font-medium text-text-h">Start a conversation</p>
                <p className="text-xs text-text">
                    Pick a cloud model (uses credits) or a local model (unlimited).
                </p>
            </div>
        </div>
    );
}

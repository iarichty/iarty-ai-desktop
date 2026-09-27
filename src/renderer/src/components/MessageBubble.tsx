import { useState } from 'react';
import { motion } from 'framer-motion';
import { TbCheck, TbCopy, TbEdit, TbRefresh, TbAlertTriangle } from 'react-icons/tb';
import type { ChatMessage } from '@shared/types';
import FormattedContent from './FormattedContent';

interface Props {
    message: ChatMessage;
    index: number;
    isLoading: boolean;
    isLastAssistant: boolean;
    onEdit?: (index: number, newContent: string) => void;
    onRegenerate?: (index: number) => void;
}

/**
 * A single chat turn: user messages render as a gradient bubble on the right,
 * assistant messages render as bare markdown on the left (no avatar) — exactly
 * like the web app's `MessageBubble`.
 */
export default function MessageBubble({
    message,
    index,
    isLoading,
    isLastAssistant,
    onEdit,
    onRegenerate,
}: Props): JSX.Element {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [copied, setCopied] = useState(false);

    const isUser = message.role === 'user';

    const handleCopy = (): void => {
        void navigator.clipboard.writeText(message.content);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    const saveEdit = (): void => {
        if (editContent.trim() && onEdit) {
            setIsEditing(false);
            onEdit(index, editContent);
            setEditContent('');
        }
    };

    return (
        <div
            className={`flex gap-4 animate-slideUp ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            style={{ animationDelay: `${Math.min(index, 12) * 50}ms` }}
        >
            {isUser ? (
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-accent to-accent-2 text-[color:var(--accent-contrast)] shadow-lg">
                    <span className="text-sm font-black">You</span>
                </div>
            ) : null}

            <div className={`group flex max-w-[85%] flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                {isUser ? (
                    <div className="inline-block rounded-3xl rounded-tr-md border border-accent/40 bg-linear-to-br from-accent to-accent-2 px-5 py-2 text-[color:var(--accent-contrast)] shadow-lg transition-all duration-300 hover:shadow-xl">
                        <span className="whitespace-pre-wrap font-medium leading-relaxed">
                            {message.content}
                        </span>
                    </div>
                ) : message.content === '' && isLoading ? (
                    <div className="flex items-center gap-3 py-2 text-sm font-medium text-text">
                        <span className="loader h-5 w-5 text-accent" />
                        Thinking...
                    </div>
                ) : message.failed ? (
                    <div className="inline-flex items-center gap-3 rounded-2xl px-4 py-2.5">
                        <TbAlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                Failed to generate a response
                            </p>
                            <p className="break-words text-xs text-amber-600/90 dark:text-amber-400/90">
                                {message.content}
                            </p>
                        </div>
                        {onRegenerate && (
                            <button
                                onClick={() => onRegenerate(index)}
                                disabled={isLoading}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-amber-600 disabled:opacity-40"
                            >
                                <TbRefresh className="h-3.5 w-3.5" />
                                Try Again
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="max-w-none text-[14px] leading-relaxed text-text-h">
                        <FormattedContent content={message.content} />
                        {isLastAssistant && isLoading && (
                            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />
                        )}
                    </div>
                )}

                {message.content !== '' && (
                    <div
                        className={`mt-2 flex items-center gap-2 px-2 opacity-0 transition-opacity group-hover:opacity-100 ${
                            isUser ? 'flex-row-reverse' : 'flex-row'
                        }`}
                    >
                        <div className="text-xs text-text/70">
                            {message.timestamp
                                ? new Date(message.timestamp).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                  })
                                : ''}
                        </div>

                        <button
                            onClick={handleCopy}
                            className="cursor-pointer p-1 text-text/70 transition-colors hover:text-accent"
                            title="Copy message"
                        >
                            {copied ? (
                                <TbCheck className="h-4 w-4 text-emerald-500" />
                            ) : (
                                <TbCopy className="h-4 w-4" />
                            )}
                        </button>

                        {isUser && !isLoading && onEdit && (
                            <button
                                onClick={() => {
                                    setIsEditing(true);
                                    setEditContent(message.content);
                                }}
                                className="cursor-pointer p-1 text-text/70 transition-colors hover:text-accent"
                                title="Edit prompt"
                            >
                                <TbEdit className="h-4 w-4" />
                            </button>
                        )}

                        {!isUser && !isLoading && isLastAssistant && !message.failed && onRegenerate && (
                            <button
                                onClick={() => onRegenerate(index)}
                                className="cursor-pointer p-1 text-text/70 transition-colors hover:text-accent"
                                title="Regenerate response"
                            >
                                <TbRefresh className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                )}

                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 w-full max-w-xl rounded-xl border border-border bg-[color:var(--surface)] p-3 shadow-lg"
                    >
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-15 w-full resize-none bg-transparent text-sm text-text-h outline-none"
                            autoFocus
                        />
                        <div className="mt-2 flex justify-end gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="cursor-pointer px-3 py-1 text-xs font-medium text-text hover:text-text-h"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveEdit}
                                disabled={!editContent.trim()}
                                className="cursor-pointer rounded-lg bg-accent px-3 py-1 text-xs font-medium text-[color:var(--accent-contrast)] transition-colors hover:opacity-90 disabled:opacity-50"
                            >
                                Save &amp; Submit
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

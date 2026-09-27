import { useMemo, type ReactNode } from 'react';
import { TbCopy, TbCheck } from 'react-icons/tb';
import { useState } from 'react';

interface Props {
    content: string;
    /** Applied to the outer wrapper. */
    className?: string;
}

/**
 * Lightweight, dependency-free markdown renderer for assistant messages.
 *
 * The desktop app ships without `react-markdown`/`remark` (kept off the bundle
 * to stay small and CSP-friendly), so this covers the subset of Markdown the
 * models actually emit: fenced + inline code, headings, lists, blockquotes,
 * horizontal rules, images, links, bold/italic, and paragraph breaks. It aims
 * to *look* like the web app's `FormattedContent` rather than be a full parser.
 */

/** Copy-to-clipboard button shared by code blocks. */
function CopyButton({ text }: { text: string }): JSX.Element {
    const [copied, setCopied] = useState(false);
    const copy = (): void => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            type="button"
            onClick={copy}
            className="absolute right-2 top-2 rounded-lg border border-border bg-[color:var(--surface)] p-1.5 text-text opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
            title="Copy code"
        >
            {copied ? (
                <TbCheck className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
                <TbCopy className="h-3.5 w-3.5" />
            )}
        </button>
    );
}

/** Inline spans: bold, italic, inline code, links, images, bare URLs. */
function renderInline(text: string): ReactNode[] {
    const pattern =
        /(`[^`]+`)|(!\[[^\]]*\]\([^)]*\))|(\[[^\]]+\]\([^)]*\))|(\*\*[^*]+\*\*)|(__[^_]+__)|(\*[^*]+\*)|(_[^_]+_)|(https?:\/\/[^\s)]+)/g;

    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
        const token = match[0];
        const key = `${match.index}-${token.slice(0, 6)}`;

        if (token.startsWith('`')) {
            nodes.push(
                <code
                    key={key}
                    className="rounded-md border border-border bg-[color:var(--surface-2)] px-1.5 py-0.5 font-mono text-[0.85em] text-accent"
                >
                    {token.slice(1, -1)}
                </code>,
            );
        } else if (token.startsWith('![')) {
            const m = token.match(/!\[(.*?)\]\((.*?)\)/);
            if (m) {
                nodes.push(
                    <span key={key} className="my-4 block overflow-hidden rounded-2xl border border-border shadow-md">
                        <img src={m[2]} alt={m[1]} className="h-auto max-w-full bg-white object-contain dark:bg-neutral-900" />
                        <span className="block border-t border-border bg-[color:var(--surface-2)] py-1.5 text-center text-[10px] font-bold uppercase tracking-widest text-text">
                            {m[1] || 'Generated image'}
                        </span>
                    </span>,
                );
            }
        } else if (token.startsWith('[')) {
            const m = token.match(/\[(.*?)\]\((.*?)\)/);
            if (m) {
                nodes.push(
                    <a
                        key={key}
                        href={m[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-accent underline decoration-2 underline-offset-2 hover:opacity-80"
                    >
                        {m[1]}
                    </a>,
                );
            }
        } else if (token.startsWith('**') || token.startsWith('__')) {
            nodes.push(
                <strong key={key} className="font-semibold text-text-h">
                    {token.slice(2, -2)}
                </strong>,
            );
        } else if (token.startsWith('*') || token.startsWith('_')) {
            nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
        } else if (/^https?:\/\//.test(token)) {
            nodes.push(
                <a
                    key={key}
                    href={token}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent underline decoration-2 underline-offset-2 hover:opacity-80"
                >
                    {token}
                </a>,
            );
        }
        lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
    return nodes;
}

/** A fenced code block with a language label and copy button. */
function CodeBlock({ code, lang }: { code: string; lang: string }): JSX.Element {
    return (
        <div className="group relative my-3 overflow-hidden rounded-xl border border-border bg-[color:var(--surface-2)]">
            <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-text">
                    {lang || 'code'}
                </span>
            </div>
            <pre className="overflow-x-auto px-3 py-2.5 text-[12.5px] leading-relaxed text-text-h">
                <code className="font-mono">{code}</code>
            </pre>
            <CopyButton text={code} />
        </div>
    );
}

function renderBlocks(content: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    // Split out fenced code blocks first, preserving order.
    const segments = content.split(/```/);

    segments.forEach((segment, segIndex) => {
        if (segIndex % 2 === 1) {
            // Odd segments are fenced code: first line may be the language.
            const newline = segment.indexOf('\n');
            const lang = newline === -1 ? segment.trim() : segment.slice(0, newline).trim();
            const code = newline === -1 ? '' : segment.slice(newline + 1).replace(/\n$/, '');
            nodes.push(<CodeBlock key={`code-${segIndex}`} code={code} lang={lang} />);
            return;
        }

        const lines = segment.split('\n');
        let listBuffer: string[] = [];
        let ordered = false;

        const flushList = (): void => {
            if (listBuffer.length === 0) return;
            const items = listBuffer;
            const isOrdered = ordered;
            listBuffer = [];
            const ListTag = isOrdered ? 'ol' : 'ul';
            nodes.push(
                <ListTag
                    key={`list-${segIndex}-${nodes.length}`}
                    className={`my-2 space-y-1 pl-5 ${isOrdered ? 'list-decimal' : 'list-disc'}`}
                >
                    {items.map((item, i) => (
                        <li key={i} className="leading-relaxed">
                            {renderInline(item)}
                        </li>
                    ))}
                </ListTag>,
            );
        };

        lines.forEach((rawLine, lineIndex) => {
            const line = rawLine.trimEnd();
            const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
            const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

            if (bullet) {
                if (ordered) flushList();
                ordered = false;
                listBuffer.push(bullet[1]);
                return;
            }
            if (numbered) {
                if (!ordered && listBuffer.length) flushList();
                ordered = true;
                listBuffer.push(numbered[1]);
                return;
            }
            flushList();

            if (!line.trim()) {
                nodes.push(<div key={`gap-${segIndex}-${lineIndex}`} className="h-2" />);
                return;
            }

            const heading = line.match(/^(#{1,6})\s+(.*)$/);
            if (heading) {
                const level = heading[1].length;
                const size = level <= 1 ? 'text-xl' : level === 2 ? 'text-lg' : 'text-base';
                nodes.push(
                    <p
                        key={`h-${segIndex}-${lineIndex}`}
                        className={`mt-3 mb-1 font-bold text-text-h ${size}`}
                    >
                        {renderInline(heading[2])}
                    </p>,
                );
                return;
            }

            if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
                nodes.push(<hr key={`hr-${segIndex}-${lineIndex}`} className="my-3 border-border" />);
                return;
            }

            const quote = line.match(/^>\s?(.*)$/);
            if (quote) {
                nodes.push(
                    <blockquote
                        key={`q-${segIndex}-${lineIndex}`}
                        className="my-2 border-l-4 border-accent/50 bg-[color:var(--surface-2)] py-1.5 pl-3 italic text-text"
                    >
                        {renderInline(quote[1])}
                    </blockquote>,
                );
                return;
            }

            nodes.push(
                <p key={`p-${segIndex}-${lineIndex}`} className="leading-relaxed">
                    {renderInline(line)}
                </p>,
            );
        });

        flushList();
    });

    return nodes;
}

export default function FormattedContent({ content, className = '' }: Props): JSX.Element {
    const blocks = useMemo(() => renderBlocks(content), [content]);
    return <div className={`break-words text-text-h ${className}`}>{blocks}</div>;
}

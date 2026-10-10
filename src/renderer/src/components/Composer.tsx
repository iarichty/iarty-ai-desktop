import { useEffect, useRef } from 'react';
import { TbSend, TbSquare } from 'react-icons/tb';
import { Button } from './Button';
import { useLanguage } from '@/context/useLanguage';

interface Props {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onStop?: () => void;
    placeholder?: string;
    disabled?: boolean;
    streaming?: boolean;
    hint?: string;
}

/** Rounded, auto-growing prompt box shared by every feature view. */
export function Composer({
    value,
    onChange,
    onSubmit,
    onStop,
    placeholder,
    disabled,
    streaming,
    hint,
}: Props): JSX.Element {
    const { t } = useLanguage();
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = 'auto';
        const next = Math.min(el.scrollHeight, 200);
        el.style.height = `${Number.isFinite(next) && next > 0 ? next : 44}px`;
    }, [value]);

    const canSend = Boolean(value.trim()) && !disabled && !streaming;

    return (
        <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-3xl border border-border bg-[color:var(--surface)] p-2 shadow-lg shadow-black/5 transition-colors focus-within:border-accent/60">
                <textarea
                    ref={ref}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (canSend) onSubmit();
                        }
                    }}
                    rows={1}
                    spellCheck={false}
                    placeholder={placeholder ?? t('composer.placeholder')}
                    className="max-h-48 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-base text-text-h outline-none placeholder:text-text"
                />
                {streaming ? (
                    <Button variant="danger" onClick={onStop}>
                        <TbSquare className="h-4 w-4" />
                        {t('composer.stop')}
                    </Button>
                ) : (
                    <Button onClick={onSubmit} disabled={!canSend}>
                        <TbSend className="h-4 w-4" />
                        {t('composer.send')}
                    </Button>
                )}
            </div>
            <p className="mt-2 text-center text-[11px] text-text">{hint ?? t('composer.hint')}</p>
        </div>
    );
}

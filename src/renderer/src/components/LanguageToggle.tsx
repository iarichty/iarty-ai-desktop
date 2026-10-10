import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TbWorld, TbCheck } from 'react-icons/tb';
import { useLanguage } from '@/context/useLanguage';
import { SUPPORTED_LANGUAGES } from '@/context/languageUtils';
import type { Language } from '@/data/translations';

/** Human-readable label + flag-ish short code for each supported language. */
const LANGUAGE_LABELS: Record<Language, string> = {
    en: 'English',
    id: 'Bahasa Indonesia',
    zh: '中文',
};

/**
 * Language switcher for the navbar — mirrors the theme toggle interaction and
 * lets the user flip between every supported locale. The choice is persisted
 * by the `LanguageProvider`.
 */
export function LanguageToggle(): JSX.Element {
    const { language, switchLanguage, t } = useLanguage();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent): void => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    return (
        <div ref={ref} className="relative">
            <motion.button
                type="button"
                onClick={() => setOpen((o) => !o)}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                aria-label={t('nav.changeLanguage')}
                title={t('nav.language')}
                className="grid h-9 place-items-center rounded-xl border border-border bg-[color:var(--surface)] px-2 text-text-h transition-colors hover:border-accent hover:text-accent"
            >
                <span className="flex items-center gap-1">
                    <TbWorld className="h-4.5 w-4.5" />
                    <span className="text-[10px] font-black uppercase tracking-wide">
                        {language}
                    </span>
                </span>
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-[color:var(--surface)]/95 p-1.5 shadow-2xl backdrop-blur-xl"
                    >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                                key={lang}
                                type="button"
                                onClick={() => {
                                    switchLanguage(lang);
                                    setOpen(false);
                                }}
                                className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                                    lang === language
                                        ? 'bg-accent/15 text-accent'
                                        : 'text-text-h hover:bg-[color:var(--surface-2)]'
                                }`}
                            >
                                {LANGUAGE_LABELS[lang]}
                                {lang === language && <TbCheck className="h-4 w-4" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

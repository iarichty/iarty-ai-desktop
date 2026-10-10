import { useState, useEffect, type ReactNode } from 'react';
import { translations, type Language } from '@/data/translations';
import { SUPPORTED_LANGUAGES, LANGUAGE_STORAGE_KEY, detectBrowserLanguage } from './languageUtils';
import { LanguageContext } from './useLanguage';

/**
 * Resolve the initial language at construction time so we never need to call
 * setState inside an effect:
 *  1. If the user has an explicit saved choice, honor it.
 *  2. Otherwise (first-visit), auto-detect from the browser/OS locale.
 *
 * The resolved value is persisted to localStorage so subsequent visits keep it.
 */
const resolveInitialLanguage = (): Language => {
    if (typeof window === 'undefined') return 'en';

    try {
        const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
        if (saved && SUPPORTED_LANGUAGES.includes(saved)) return saved;
    } catch {
        // localStorage may throw; fall through to detection.
    }

    const detected = detectBrowserLanguage();
    try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, detected);
    } catch {
        // Ignore storage write errors — language still works for the session.
    }
    return detected;
};

/** Provides the active language and a `t()` translation helper to the tree. */
export function LanguageProvider({ children }: { children: ReactNode }): JSX.Element {
    const [language, setLanguage] = useState<Language>(resolveInitialLanguage);

    // Sync state when the saved language changes in another window.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onStorage = (e: StorageEvent): void => {
            if (e.key !== LANGUAGE_STORAGE_KEY || !e.newValue) return;
            const next = e.newValue as Language;
            if (SUPPORTED_LANGUAGES.includes(next) && next !== language) {
                setLanguage(next);
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [language]);

    const switchLanguage = (lang: Language): void => {
        setLanguage(lang);
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
            } catch {
                // Ignore storage write errors.
            }
        }
    };

    // Helper translation function with dotted-key lookup and key fallback.
    const t = (key: string): string => {
        const keys = key.split('.');
        let value: unknown = translations[language];
        for (const k of keys) {
            if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
                value = (value as Record<string, unknown>)[k];
            } else {
                return key;
            }
        }
        return typeof value === 'string' ? value : key;
    };

    return (
        <LanguageContext.Provider value={{ language, switchLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

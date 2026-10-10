import type { Language } from '../data/translations';

// Supported app languages. Keep in sync with `data/translations.ts`.
export const SUPPORTED_LANGUAGES: Language[] = ['en', 'id', 'zh'];

// Storage key for the user-chosen language (set explicitly via the language switcher).
export const LANGUAGE_STORAGE_KEY = 'language';

/**
 * Map a BCP-47 language tag (e.g. "id-ID", "en-US", "zh-Hans-CN") to a supported app
 * language. Matching is performed in order: full tag → primary subtag → English fallback.
 *
 * Extend the SUPPORTED_LANGUAGES table when adding new languages to `data/translations.ts`.
 */
export const resolveLanguageFromLocale = (locale: string): Language => {
    const normalized = String(locale || '')
        .toLowerCase()
        .replace(/_/g, '-');
    if (!normalized) return 'en';

    // 1. Direct match on a supported code (covers "id", "en", "zh" exactly).
    for (const code of SUPPORTED_LANGUAGES) {
        if (normalized === code) return code;
    }

    const primary = normalized.split('-')[0];

    // 2. Primary subtag match (covers "id-ID", "en-GB", "zh-Hans-CN").
    for (const code of SUPPORTED_LANGUAGES) {
        if (primary === code) return code;
    }

    // 3. Chinese has multiple locales (zh-Hans, zh-Hant, zh-CN, zh-TW…). Map them all to "zh".
    if (primary === 'zh') return 'zh';

    // 4. Default fallback: English.
    return 'en';
};

/**
 * Read the user's preferred language from the browser. Tries `navigator.languages`
 * (array) first, then `navigator.language` (single value), and finally falls back
 * to English when the browser exposes nothing.
 */
export const detectBrowserLanguage = (): Language => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'en';

    const candidates: string[] = [];
    if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
    if (navigator.language) candidates.push(navigator.language);

    for (const candidate of candidates) {
        const resolved = resolveLanguageFromLocale(candidate);
        if (SUPPORTED_LANGUAGES.includes(resolved)) return resolved;
    }

    return 'en';
};

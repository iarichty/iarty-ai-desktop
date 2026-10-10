import { createContext, useContext } from 'react';
import type { Language } from '../data/translations';

export type LanguageContextType = {
    language: Language; // current language (e.g., 'id' or 'en')
    switchLanguage: (lang: Language) => void; // function to update language
    t: (key: string) => string;
};

// Context lives here (not in the Provider file) so the Provider can be
// hot-reloaded in isolation by react-refresh. The Provider is created in
// `LanguageContext.tsx` and re-imports this symbol.
export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Hook for easy access to the language context.
 * Lives in its own file (sibling of the Provider) so fast-refresh can reload
 * the Provider component independently.
 */
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        // Fallback for SSR or when context is not available
        return {
            language: 'en' as Language,
            switchLanguage: () => {},
            t: (key: string) => key,
        };
    }
    return context;
};

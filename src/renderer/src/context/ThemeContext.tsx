import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: (event?: { clientX: number; clientY: number }) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const BLOOM_DURATION_MS = 700;
const STORAGE_KEY = 'iarty-desktop-theme';

/**
 * Circle-bloom reveal, matching the IARTY web app. Uses the View Transitions
 * API when available and honours `prefers-reduced-motion`.
 */
function applyCircleBloom(x: number, y: number): boolean {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (
        !doc.startViewTransition ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
        return false;
    }

    const root = document.documentElement;
    const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
    );

    root.classList.add('theme-transitioning');
    root.style.setProperty('--bloom-x', `${x}px`);
    root.style.setProperty('--bloom-y', `${y}px`);
    root.style.setProperty('--bloom-r', `${Math.ceil(radius * 1.15) + 30}px`);

    return true;
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        root.style.colorScheme = theme;
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    // Tracks the bloom cleanup timer so rapid toggles can't stack timeouts, and
    // so the class is always removed on unmount.
    const bloomTimer = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (bloomTimer.current !== null) {
                window.clearTimeout(bloomTimer.current);
                document.documentElement.classList.remove('theme-transitioning');
            }
        };
    }, []);

    const toggleTheme = (event?: { clientX: number; clientY: number }): void => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        const bloomed = event ? applyCircleBloom(event.clientX, event.clientY) : false;

        if (bloomed) {
            const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
            doc.startViewTransition?.(() => setTheme(next));
            if (bloomTimer.current !== null) window.clearTimeout(bloomTimer.current);
            bloomTimer.current = window.setTimeout(() => {
                document.documentElement.classList.remove('theme-transitioning');
                bloomTimer.current = null;
            }, BLOOM_DURATION_MS);
        } else {
            setTheme(next);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}

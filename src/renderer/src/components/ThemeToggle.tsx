import { TbSun, TbMoon } from 'react-icons/tb';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/useLanguage';

/** Light/dark toggle with the same circle-bloom transition as the web app. */
export function ThemeToggle(): JSX.Element {
    const { theme, toggleTheme } = useTheme();
    const { t } = useLanguage();
    const isDark = theme === 'dark';

    return (
        <motion.button
            type="button"
            onClick={(e) => toggleTheme(e)}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            aria-label={isDark ? t('nav.switchLight') : t('nav.switchDark')}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-[color:var(--surface)] text-text-h transition-colors hover:border-accent hover:text-accent"
        >
            <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                    <motion.span
                        key="moon"
                        initial={{ rotate: -90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 90, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <TbMoon className="h-4.5 w-4.5" />
                    </motion.span>
                ) : (
                    <motion.span
                        key="sun"
                        initial={{ rotate: 90, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: -90, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <TbSun className="h-4.5 w-4.5" />
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );
}

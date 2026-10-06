import { motion } from 'framer-motion';
import { TbLock } from 'react-icons/tb';
import Loader from './Loader';
import { Button } from './Button';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

interface Props {
    loading: boolean;
    error: string | null;
    status?: string | null;
    onLogin: (method?: 'inApp' | 'browser') => void;
}

/** Full-screen sign-in prompt with an animated backdrop. */
export function LoginView({ loading, error, status, onLogin }: Props): JSX.Element {
    return (
        <div className="relative flex h-full flex-col items-center justify-center overflow-hidden px-8">
            {/* Ambient animated backdrop */}
            <div className="pointer-events-none absolute inset-0">
                <div className="animate-float-slow absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
                <div
                    className="animate-float-slow absolute -right-16 bottom-1/4 h-80 w-80 rounded-full bg-accent-2/20 blur-3xl"
                    style={{ animationDelay: '1.7s' }}
                />
            </div>

            <div className="absolute right-5 top-5">
                <ThemeToggle />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border border-border bg-[color:var(--surface)]/70 p-8 backdrop-blur-xl"
            >
                <div className="relative grid h-20 w-20 place-items-center">
                    <span className="animate-pulse-ring absolute inset-0 rounded-2xl border border-accent/40" />
                    <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 shadow-xl shadow-accent/30">
                        <Logo size={44} color="var(--accent-contrast)" />
                    </div>
                </div>

                <div className="text-center">
                    <h1 className="text-2xl font-semibold tracking-tight">IARTY AI Desktop</h1>
                    <p className="mt-2 text-sm text-text">
                        Sign in with your IARTY account to use cloud models and credits — then bring
                        your own local models alongside.
                    </p>
                </div>

                <Button
                    size="lg"
                    onClick={() => onLogin('inApp')}
                    disabled={loading}
                    className="w-full"
                    aria-busy={loading}
                >
                    {loading ? (
                        <>
                            <Loader className="h-4 w-4" />
                            Waiting for sign-in…
                        </>
                    ) : (
                        <>
                            <TbLock className="h-5 w-5" />
                            Sign in to IARTY
                        </>
                    )}
                </Button>

                <button
                    type="button"
                    onClick={() => onLogin('browser')}
                    disabled={loading}
                    className="text-xs text-text underline-offset-4 transition-colors hover:text-accent hover:underline disabled:opacity-50"
                >
                    Or continue in your browser
                </button>

                <p className="text-center text-xs text-text">
                    Sign in securely inside the app. Your session is kept on this device so cloud
                    models, credits and every feature stay available until you sign out.
                </p>

                {status && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-center text-xs text-accent"
                    >
                        {status}
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-400"
                    >
                        {error}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

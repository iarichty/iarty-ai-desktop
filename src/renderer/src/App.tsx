import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { ThemeProvider } from '@/context/ThemeContext';
import { ChatPanel } from '@/components/ChatPanel';
import { LoginView } from '@/components/LoginView';

export default function App(): JSX.Element {
    const auth = useAuth();
    const [settings, saveSettings] = useSettings();

    return (
        <ThemeProvider>
            {auth.loading && !auth.session ? (
                <div className="flex h-full items-center justify-center text-sm text-text">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                </div>
            ) : !auth.session ? (
                <LoginView loading={auth.loading} error={auth.error} onLogin={auth.login} />
            ) : (
                <ChatPanel
                    session={auth.session}
                    settings={settings}
                    onSaveSettings={saveSettings}
                    onLogout={auth.logout}
                />
            )}
        </ThemeProvider>
    );
}

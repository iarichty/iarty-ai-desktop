import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { ThemeProvider } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { NotificationContainer } from '@/components/Notification';
import { MainLayout } from '@/components/MainLayout';
import { LoginView } from '@/components/LoginView';

export default function App(): JSX.Element {
    const auth = useAuth();
    const [settings, saveSettings] = useSettings();

    return (
        <ThemeProvider>
            <NotificationProvider>
                {auth.loading && !auth.session ? (
                    <div className="flex h-full items-center justify-center text-sm text-text">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    </div>
                ) : !auth.session ? (
                    <LoginView
                        loading={auth.loading}
                        error={auth.error}
                        status={auth.status}
                        onLogin={auth.login}
                    />
                ) : (
                    <MainLayout
                        session={auth.session}
                        settings={settings}
                        onSaveSettings={saveSettings}
                        onLogout={auth.logout}
                    />
                )}
                <NotificationContainer />
            </NotificationProvider>
        </ThemeProvider>
    );
}

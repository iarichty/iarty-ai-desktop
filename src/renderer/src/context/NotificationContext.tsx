import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface AppNotification {
    id: string;
    message: string;
    type: NotificationType;
}

interface NotificationContextValue {
    notifications: AppNotification[];
    addNotification: (message: string, type?: NotificationType) => void;
    removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 4000;

/**
 * Toast notifications, mirroring the web app's `NotificationContext`. Each
 * toast auto-dismisses after a short delay but can also be closed manually.
 */
export function NotificationProvider({ children }: { children: ReactNode }): JSX.Element {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const addNotification = useCallback(
        (message: string, type: NotificationType = 'info') => {
            const id =
                typeof crypto !== 'undefined' && 'randomUUID' in crypto
                    ? crypto.randomUUID()
                    : `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            setNotifications((prev) => [...prev, { id, message, type }]);
            window.setTimeout(() => removeNotification(id), AUTO_DISMISS_MS);
        },
        [removeNotification],
    );

    const value = useMemo(
        () => ({ notifications, addNotification, removeNotification }),
        [notifications, addNotification, removeNotification],
    );

    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotification(): NotificationContextValue {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
    return ctx;
}

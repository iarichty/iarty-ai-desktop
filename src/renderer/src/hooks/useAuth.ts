import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge } from '@/lib/bridge';
import type { AuthSession, LoginResult } from '@shared/types';

interface UseAuth {
    session: AuthSession | null;
    loading: boolean;
    error: string | null;
    status: string | null;
    login: (method?: 'inApp' | 'browser') => Promise<void>;
    logout: () => Promise<void>;
    reload: () => Promise<void>;
}

/** Loads and mutates the auth session held in the main process. */
export function useAuth(): UseAuth {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const mounted = useRef(true);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const current = await bridge.auth.getSession();
            if (mounted.current) setSession(current);
        } catch (err) {
            if (mounted.current) {
                setError(err instanceof Error ? err.message : 'Failed to load session');
            }
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        mounted.current = true;
        void reload();
        const offChange = bridge.auth.onChange((payload) => {
            if (mounted.current && payload) setSession(payload);
        });
        const offLog = bridge.auth.onLog((message) => {
            if (mounted.current) setStatus(message);
        });
        return () => {
            mounted.current = false;
            offChange();
            offLog();
        };
    }, [reload]);

    const login = useCallback(async (method: 'inApp' | 'browser' = 'browser') => {
        setError(null);
        setStatus(null);
        setLoading(true);
        try {
            const result = (await bridge.auth.login(method)) as LoginResult;
            if (result.status === 'success') {
                setSession(result.session);
            } else if (result.status === 'error') {
                setError(result.message);
            }
        } finally {
            setLoading(false);
            setStatus(null);
        }
    }, []);

    const logout = useCallback(async () => {
        await bridge.auth.logout();
        setSession(null);
    }, []);

    return { session, loading, error, status, login, logout, reload };
}

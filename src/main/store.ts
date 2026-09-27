/**
 * Persistent state (tokens, user, settings).
 *
 * electron-store writes a JSON file under the OS app-data directory. The
 * renderer never touches this directly — it only receives the non-sensitive
 * projection it needs (user + settings), never the raw refresh cookie.
 */
import Store from 'electron-store';
import type { AppSettings, AuthSession, AuthUser, LocalProviderConfig } from '@shared/types';
import { DEFAULT_OLLAMA_URL } from './config';

interface StoreSchema {
    accessToken: string;
    refreshCookie: string;
    expire: number;
    user: AuthUser | null;
    settings: AppSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
    localProvider: {
        kind: 'ollama',
        baseUrl: DEFAULT_OLLAMA_URL,
        apiKey: '',
    } satisfies LocalProviderConfig,
    defaultModelId: '',
};

const store = new Store<StoreSchema>({
    name: 'iarty-ai-desktop',
    defaults: {
        accessToken: '',
        refreshCookie: '',
        expire: 0,
        user: null,
        settings: DEFAULT_SETTINGS,
    },
});

export const persistence = {
    getSession(): AuthSession | null {
        const accessToken = store.get('accessToken');
        const user = store.get('user');
        const expire = store.get('expire');
        if (!accessToken || !user) return null;
        return { accessToken, user, expire };
    },

    setSession(session: AuthSession): void {
        store.set('accessToken', session.accessToken);
        store.set('user', session.user);
        store.set('expire', session.expire);
    },

    clearSession(): void {
        store.set('accessToken', '');
        store.set('user', null);
        store.set('expire', 0);
        store.set('refreshCookie', '');
    },

    getRefreshCookie(): string {
        return store.get('refreshCookie');
    },

    setRefreshCookie(cookie: string): void {
        store.set('refreshCookie', cookie);
    },

    getSettings(): AppSettings {
        return store.get('settings');
    },

    setSettings(settings: AppSettings): void {
        store.set('settings', settings);
    },
};

/**
 * Persistent state (tokens, user, settings).
 *
 * electron-store writes a JSON file under the OS app-data directory. The
 * renderer never touches this directly — it only receives the non-sensitive
 * projection it needs (user + settings), never the raw refresh cookie.
 */
import Store from 'electron-store';
import type {
    AppSettings,
    AuthSession,
    AuthUser,
    LocalProviderConfig,
    SessionFeature,
    SessionSummary,
    StoredSession,
} from '@shared/types';
import { DEFAULT_OLLAMA_URL } from './config';

interface StoreSchema {
    accessToken: string;
    refreshCookie: string;
    expire: number;
    user: AuthUser | null;
    settings: AppSettings;
    sessions: StoredSession[];
}

const DEFAULT_SETTINGS: AppSettings = {
    localProvider: {
        kind: 'ollama',
        baseUrl: DEFAULT_OLLAMA_URL,
        apiKey: '',
    } satisfies LocalProviderConfig,
    defaultModelId: '',
    autoSaveSessions: true,
};

const store = new Store<StoreSchema>({
    name: 'iarty-ai-desktop',
    defaults: {
        accessToken: '',
        refreshCookie: '',
        expire: 0,
        user: null,
        settings: DEFAULT_SETTINGS,
        sessions: [],
    },
});

/** Number of turns in a session payload, used for the summary list. */
function countItems(feature: SessionFeature, payload: unknown): number {
    const p = payload as { messages?: unknown[]; outputs?: { prd_markdown?: string } } | null;
    if (!p) return 0;
    if (feature === 'prd-builder') {
        return Array.isArray(p.messages) ? p.messages.length : 0;
    }
    if (feature === 'chat') {
        return Array.isArray(p.messages) ? p.messages.length : 0;
    }
    return 1;
}

function toSummary(session: StoredSession): SessionSummary {
    return {
        id: session.id,
        feature: session.feature,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        itemCount: countItems(session.feature, session.payload),
    };
}

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
        // Merge with defaults so settings added after an upgrade are populated.
        return { ...DEFAULT_SETTINGS, ...store.get('settings') };
    },

    setSettings(settings: AppSettings): void {
        store.set('settings', settings);
    },
};

/**
 * Local session history.
 *
 * Sessions live as a single array in the electron-store JSON file under the OS
 * app-data directory. Everything (chat, PRD, minutes, study) shares one bucket;
 * `feature` discriminates the payload shape and drives the per-view lists.
 */
export const sessionStore = {
    list(feature?: SessionFeature): SessionSummary[] {
        return store
            .get('sessions')
            .filter((s) => (feature ? s.feature === feature : true))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map(toSummary);
    },

    get(id: string): StoredSession | null {
        return store.get('sessions').find((s) => s.id === id) ?? null;
    },

    /**
     * Insert or update a session. When `id` already exists its `createdAt` is
     * preserved and `updatedAt` is bumped; otherwise `createdAt` defaults to now.
     */
    save(session: {
        id: string;
        feature: SessionFeature;
        title: string;
        payload: unknown;
        createdAt?: string;
    }): StoredSession {
        const sessions = store.get('sessions');
        const now = new Date().toISOString();
        const index = sessions.findIndex((s) => s.id === session.id);

        const record: StoredSession = {
            id: session.id,
            feature: session.feature,
            title: session.title,
            payload: session.payload,
            createdAt: index >= 0 ? sessions[index].createdAt : (session.createdAt ?? now),
            updatedAt: now,
        };

        if (index >= 0) sessions[index] = record;
        else sessions.push(record);

        store.set('sessions', sessions);
        return record;
    },

    rename(id: string, title: string): boolean {
        const sessions = store.get('sessions');
        const index = sessions.findIndex((s) => s.id === id);
        if (index < 0) return false;
        sessions[index] = { ...sessions[index], title, updatedAt: new Date().toISOString() };
        store.set('sessions', sessions);
        return true;
    },

    remove(id: string): boolean {
        const sessions = store.get('sessions');
        const next = sessions.filter((s) => s.id !== id);
        if (next.length === sessions.length) return false;
        store.set('sessions', next);
        return true;
    },

    clear(feature?: SessionFeature): void {
        const sessions = store.get('sessions');
        store.set(
            'sessions',
            feature ? sessions.filter((s) => s.feature !== feature) : [],
        );
    },
};

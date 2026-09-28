import { useCallback, useEffect, useRef, useState } from 'react';
import { bridge } from '@/lib/bridge';
import type { SessionFeature, SessionSummary, StoredSession } from '@shared/types';

interface UseSessions {
    /** Summaries for this feature, newest first. */
    sessions: SessionSummary[];
    loading: boolean;
    /** Re-reads the list from disk. */
    refresh: () => Promise<void>;
    /** Insert/update a session and refresh the list. */
    save: (session: {
        id: string;
        title: string;
        payload: unknown;
        createdAt?: string;
    }) => Promise<StoredSession | null>;
    /** Loads a full session (with payload) by id. */
    load: (id: string) => Promise<StoredSession | null>;
    rename: (id: string, title: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
    clearAll: () => Promise<void>;
}

/**
 * Manages the on-disk session list for a single feature. Write-through to the
 * main process; the local list is a cached projection kept in sync via refresh.
 */
export function useSessions(feature: SessionFeature): UseSessions {
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const list = (await bridge.sessions.list(feature)) as SessionSummary[];
            if (mounted.current) setSessions(list);
        } catch {
            if (mounted.current) setSessions([]);
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, [feature]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const save = useCallback<UseSessions['save']>(
        async (session) => {
            try {
                const stored = (await bridge.sessions.save({
                    feature,
                    ...session,
                })) as StoredSession;
                await refresh();
                return stored;
            } catch {
                return null;
            }
        },
        [feature, refresh],
    );

    const load = useCallback(async (id: string) => {
        try {
            return (await bridge.sessions.get(id)) as StoredSession | null;
        } catch {
            return null;
        }
    }, []);

    const rename = useCallback(
        async (id: string, title: string) => {
            await bridge.sessions.rename(id, title);
            await refresh();
        },
        [refresh],
    );

    const remove = useCallback(
        async (id: string) => {
            await bridge.sessions.remove(id);
            await refresh();
        },
        [refresh],
    );

    const clearAll = useCallback(async () => {
        await bridge.sessions.clear(feature);
        await refresh();
    }, [feature, refresh]);

    return { sessions, loading, refresh, save, load, rename, remove, clearAll };
}

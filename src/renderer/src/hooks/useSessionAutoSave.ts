import { useEffect, useRef } from 'react';

interface Options<T> {
    /** The current serialisable payload. `null` means "nothing to save yet". */
    payload: T | null;
    /** Human-readable title for the session. */
    title: string;
    /** Stable id for this session (created lazily by the caller). */
    id: string | null;
    /** When false, auto-save is skipped entirely. */
    enabled?: boolean;
    /** Persist callback — receives the id, title and payload. */
    onSave: (id: string, title: string, payload: T) => void;
    /** Debounce delay in ms (default 800). */
    delay?: number;
    /** Extra dependency key that should force a save when payload is unchanged. */
    revision?: number;
}

/**
 * Debounced auto-save: whenever `payload`/`title` change and id exists, calls
 * `onSave` after a quiet period. Prevents writing on every streamed chunk while
 * still persisting steadily.
 */
export function useSessionAutoSave<T>({
    payload,
    title,
    id,
    enabled = true,
    onSave,
    delay = 800,
    revision = 0,
}: Options<T>): void {
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    useEffect(() => {
        if (!enabled || !id || payload === null) return;
        const handle = window.setTimeout(() => {
            onSaveRef.current(id, title, payload);
        }, delay);
        return () => window.clearTimeout(handle);
        // `payload` is compared by reference; callers pass a freshly-built object.
    }, [id, title, payload, enabled, delay, revision]);
}

/**
 * Session helpers shared by every feature that persists locally.
 *
 * Sessions are stored on disk (electron-store, via the bridge). Each feature
 * owns its own id namespace so ids never collide across features.
 */
import type { SessionFeature } from '@shared/types';

/** Generates a fresh, feature-scoped session id. */
export function newSessionId(feature: SessionFeature): string {
    const rand =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID().slice(0, 8)
            : Math.random().toString(36).slice(2, 10);
    return `${feature}-${Date.now()}-${rand}`;
}

/**
 * Derives a readable title from the first meaningful user turn. Falls back to
 * a feature label + timestamp when the content is empty.
 */
export function deriveTitle(text: string, fallback: string): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (!clean) return fallback;
    const firstLine = clean.split(/(?<=[.!?])\s/)[0] ?? clean;
    return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
}

/** Formats an ISO timestamp as a short, locale-aware label for the list. */
export function formatSessionTime(iso: string): string {
    try {
        const d = new Date(iso);
        const now = new Date();
        const sameDay = d.toDateString() === now.toDateString();
        return sameDay
            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString([], { day: '2-digit', month: 'short' });
    } catch {
        return '';
    }
}

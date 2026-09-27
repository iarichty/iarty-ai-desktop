/**
 * API clients for the two IARTY backends.
 *
 * - accountApi  → account/auth service   (login handoff, permissions)
 * - aiApi       → AI feature service      (chat, models, credits)
 *
 * Both base URLs come from configuration (see `config.ts` / `.env`); the
 * published source hardcodes none of them.
 *
 * All authenticated calls send `Authorization: Bearer <accessToken>`. Requests
 * never carry an Origin header (Electron main fetch), so the backend's CSRF
 * middleware treats them as Bearer clients and lets them through.
 */
import { ACCOUNT_API_URL, AI_API_URL } from './config';
import { getCookieHeader, readSetCookies, storeSetCookie, clearCookies, setCookieHeader } from './http';
import type { ApiEnvelope, AiPlan, CloudModel } from '@shared/types';

export class ApiError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

interface RequestOptions {
    method?: string;
    body?: unknown;
    token?: string;
    formData?: FormData;
    signal?: AbortSignal;
}

async function request<T>(base: string, path: string, opts: RequestOptions): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    let body: string | FormData | undefined;

    if (opts.formData) {
        body = opts.formData;
    } else if (opts.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(opts.body);
    }

    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    const cookie = getCookieHeader();
    if (cookie) headers.Cookie = cookie;

    const res = await fetch(`${base}${path}`, {
        method: opts.method ?? 'GET',
        headers,
        body,
        signal: opts.signal,
    });

    storeSetCookie(readSetCookies(res));

    const text = await res.text();
    const json = text ? (JSON.parse(text) as ApiEnvelope<T> | { message?: string }) : null;

    if (!res.ok) {
        const message =
            (json as { message?: string })?.message || `Request failed (${res.status})`;
        const code = (json as { code?: string })?.code;
        throw new ApiError(message, res.status, code);
    }

    const envelope = json as ApiEnvelope<T>;
    return (envelope?.data ?? (envelope as unknown as T)) as T;
}

// ── Account backend ─────────────────────────────────────────────────────────

interface TokenPayload {
    accessToken: string;
}

export const accountApi = {
    /** Exchanges the refresh cookie for a fresh access token. */
    async refreshToken(): Promise<string> {
        const data = await request<TokenPayload>(ACCOUNT_API_URL, '/token', { method: 'GET' });
        return data.accessToken;
    },

    /** Fetches the permission names for the currently authenticated user. */
    async getPermissions(token: string): Promise<string[]> {
        const data = await request<{ permissions: { name: string }[] }>(
            ACCOUNT_API_URL,
            '/get-auth-permissions',
            { token },
        );
        return (data.permissions ?? []).map((p) => p.name);
    },

    async checkAuth(): Promise<boolean> {
        try {
            const data = await request<{ auth: boolean }>(ACCOUNT_API_URL, '/checkauth', {
                method: 'GET',
            });
            return Boolean(data.auth);
        } catch {
            return false;
        }
    },

    async logout(token: string): Promise<void> {
        try {
            await request(ACCOUNT_API_URL, '/signout', { method: 'DELETE', token });
        } finally {
            clearCookies();
        }
    },

    /** Seeds the in-process cookie jar from a previously persisted cookie. */
    seedCookie(cookie: string): void {
        setCookieHeader(cookie);
    },
};

// ── AI backend ──────────────────────────────────────────────────────────────

export const aiApi = {
    async getModels(token: string): Promise<CloudModel[]> {
        const data = await request<{ models: CloudModel[] }>(AI_API_URL, '/ai/models', { token });
        return data.models ?? [];
    },

    async getMyPlan(token: string): Promise<AiPlan> {
        return request<AiPlan>(AI_API_URL, '/me/ai-plans', { token });
    },

    /**
     * Opens a streaming SSE chat request. Returns the raw Response so the
     * caller can read the body incrementally. A 403 means out-of-credits.
     */
    async openChatStream(
        token: string,
        form: FormData,
        signal: AbortSignal,
    ): Promise<Response> {
        const res = await fetch(`${AI_API_URL}/ai/chat`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
            body: form,
            signal,
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            let message = `Chat request failed (${res.status})`;
            try {
                const parsed = JSON.parse(text) as { message?: string };
                if (parsed.message) message = parsed.message;
            } catch {
                /* non-JSON error body */
            }
            throw new ApiError(message, res.status);
        }
        return res;
    },
};

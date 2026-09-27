/**
 * Minimal HTTP helpers for the two IARTY backends.
 *
 * Two transports are offered:
 *   - `request()`      plain `fetch` with a hand-rolled cookie jar (headless,
 *                      used for Bearer-token calls and the refresh fallback).
 *   - session-backed   Electron's `net` module bound to a BrowserWindow's
 *                      session, so httpOnly cookies set during an in-app login
 *                      flow are sent automatically (used by the auth flow).
 */
import { net, session as electronSession, type Session } from 'electron';

/** Shared cookie jar for the headless `fetch` transport. */
let cookieJar = new Map<string, string>();

export function storeSetCookie(setCookieHeaders: string[] | undefined): void {
    if (!setCookieHeaders) return;
    for (const header of setCookieHeaders) {
        const firstPart = header.split(';')[0];
        const eq = firstPart.indexOf('=');
        if (eq === -1) continue;
        const name = firstPart.slice(0, eq).trim();
        const value = firstPart.slice(eq + 1).trim();
        if (value === '' || /expires=Thu, 01 Jan 1970/i.test(header)) {
            cookieJar.delete(name);
        } else {
            cookieJar.set(name, value);
        }
    }
}

export function getCookieHeader(): string {
    return [...cookieJar.entries()]
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
}

export function setCookieHeader(header: string | undefined): void {
    cookieJar.clear();
    if (!header) return;
    for (const pair of header.split(/;\s*/)) {
        const eq = pair.indexOf('=');
        if (eq === -1) continue;
        cookieJar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
}

export function clearCookies(): void {
    cookieJar = new Map();
}

/** Reads set-cookie values from a fetch Response across undici versions. */
export function readSetCookies(res: Response): string[] {
    const headers = res.headers as Headers & { getSetCookie?: () => string[] };
    if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
    const raw = headers.get('set-cookie');
    return raw ? [raw] : [];
}

interface NetRequestOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}

/**
 * Performs a request through a BrowserWindow session using Electron's `net`
 * module, so that cookies stored in that session are sent and any `Set-Cookie`
 * is persisted. Returns the parsed JSON body and status.
 */
export async function sessionRequest(
    ses: Session,
    url: string,
    opts: NetRequestOptions = {},
): Promise<{ status: number; body: unknown }> {
    return new Promise((resolve, reject) => {
        const request = net.request({
            method: opts.method ?? 'GET',
            url,
            session: ses,
            useSessionCookies: true,
        });

        for (const [key, value] of Object.entries(opts.headers ?? {})) {
            request.setHeader(key, value);
        }
        if (opts.body) request.setHeader('Content-Type', 'application/json');

        let status = 0;
        let data = '';
        request.on('response', (response) => {
            status = response.statusCode;
            response.on('data', (chunk) => {
                data += chunk.toString();
            });
            response.on('end', () => {
                let body: unknown = null;
                try {
                    body = data ? JSON.parse(data) : null;
                } catch {
                    body = data;
                }
                resolve({ status, body });
            });
        });
        request.on('error', reject);
        if (opts.body) request.write(opts.body);
        request.end();
    });
}

/** The persistent session partition used for the in-app login window. */
export const AUTH_PARTITION = 'persist:iarty-auth';

/**
 * A regular desktop-Chrome user-agent. Electron's default UA advertises
 * "Electron/…" which some third-party widgets (notably Google reCAPTCHA)
 * treat with suspicion. Presenting a normal Chrome UA keeps the sign-in page
 * behaving exactly as it does in a browser.
 */
export const DESKTOP_CHROME_UA =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/126.0.0.0 Safari/537.36';

export function authSession(): Session {
    const ses = electronSession.fromPartition(AUTH_PARTITION);
    ses.setUserAgent(DESKTOP_CHROME_UA);
    return ses;
}

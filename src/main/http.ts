/**
 * Minimal fetch wrapper that stores/replays cookies manually.
 *
 * The account backend's refresh flow relies on an httpOnly `refreshToken`
 * cookie. In Electron's main process `fetch` (undici) does NOT persist cookies
 * automatically, so we capture `Set-Cookie` and replay it. We only ever talk to
 * our own two backends, so a single shared cookie jar is sufficient.
 */

let cookieJar = new Map<string, string>();

/** Parse a `Set-Cookie` header into name/value pairs and store them. */
export function storeSetCookie(setCookieHeaders: string[] | undefined): void {
    if (!setCookieHeaders) return;
    for (const header of setCookieHeaders) {
        // A single header may contain multiple cookies separated by commas, but
        // `name=value; Attr...` — split on the first `;` to get name=value.
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
    return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
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

/**
 * Extracts set-cookie values from a fetch Response in a way that works across
 * undici versions (`getSetCookie()` when available, else the raw header).
 */
export function readSetCookies(res: Response): string[] {
    const headers = res.headers as Headers & { getSetCookie?: () => string[] };
    if (typeof headers.getSetCookie === 'function') {
        return headers.getSetCookie();
    }
    const raw = headers.get('set-cookie');
    return raw ? [raw] : [];
}

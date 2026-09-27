/**
 * Authentication manager.
 *
 * Login flow (external browser + loopback):
 *
 *   1. Start a short-lived HTTP server on 127.0.0.1:<random port>.
 *   2. Open the system browser at the configured web app's `/signin` page with
 *      a `desktop_redirect` query param pointing at the loopback callback.
 *   3. The web app, after a successful login, redirects back to the loopback
 *      URL carrying the access token and/or the shared refresh-token cookie.
 *   4. We capture whichever arrives, exchange it for an access token, build the
 *      session and persist it.
 *
 * Because the browser performs the real sign-in, reCAPTCHA and the httpOnly
 * refresh cookie work exactly as they do on the web — the desktop app never
 * handles the user's password.
 *
 * A custom `iarty://` protocol is registered as a fallback deep link for cases
 * where the loopback server cannot bind.
 */
import { BrowserWindow, shell } from 'electron';
import { createServer, type Server } from 'node:http';
import { jwtDecode } from 'jwt-decode';
import { accountApi } from './api';
import { persistence } from './store';
import { LOOPBACK_HOST, PROTOCOL_SCHEME, SIGNIN_URL } from './config';
import type { AuthSession, AuthUser } from '@shared/types';

interface TokenClaims {
    id: number;
    name: string;
    email: string;
    role?: string;
    avatar_url?: string | null;
    is_verified?: boolean;
    is_blocked?: boolean;
    exp?: number;
}

/** Builds a session object from a raw access token by decoding its claims. */
async function buildSession(accessToken: string): Promise<AuthSession> {
    const decoded = jwtDecode<TokenClaims>(accessToken);
    const permissions = await accountApi.getPermissions(accessToken).catch(() => []);
    const user: AuthUser = {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role ?? '',
        avatar_url: decoded.avatar_url ?? null,
        is_verified: decoded.is_verified,
        is_blocked: decoded.is_blocked,
        permissions,
    };
    return { accessToken, user, expire: decoded.exp ?? 0 };
}

/**
 * Waits for the browser to hit our loopback callback. Resolves with the
 * captured query params, or null on timeout.
 */
function startLoopback(): Promise<{
    server: Server;
    port: number;
    waitForCallback: () => Promise<URLSearchParams | null>;
}> {
    return new Promise((resolve, reject) => {
        let resolveCallback: (p: URLSearchParams | null) => void;
        const callbackPromise = new Promise<URLSearchParams | null>((res) => {
            resolveCallback = res;
        });

        const server = createServer((req, res) => {
            const url = new URL(req.url ?? '/', `http://${LOOPBACK_HOST}`);
            if (url.pathname !== '/callback') {
                res.writeHead(404).end('Not found');
                return;
            }

            // The refresh cookie may arrive as a Cookie header (if the web app
            // sets it for 127.0.0.1) — capture it too.
            const cookieHeader = req.headers.cookie;
            if (cookieHeader) persistence.setRefreshCookie(cookieHeader);

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(CLOSE_PAGE_HTML);

            resolveCallback(url.searchParams);
        });

        server.on('error', reject);
        server.listen(0, LOOPBACK_HOST, () => {
            const address = server.address();
            if (address && typeof address === 'object') {
                resolve({
                    server,
                    port: address.port,
                    waitForCallback: () => callbackPromise,
                });
            } else {
                reject(new Error('Failed to determine loopback port'));
            }
        });
    });
}

const CLOSE_PAGE_HTML = `<!doctype html><html><head><meta charset="utf-8">
<title>IARTY Desktop</title></head>
<body style="font-family:system-ui;background:#0b0b12;color:#e7e7ef;display:flex;
align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center"><h2>Signed in</h2>
<p>You can close this tab and return to the IARTY Desktop app.</p></div>
<script>setTimeout(()=>window.close(),800)</script></body></html>`;

export class AuthManager {
    private loopback: Server | null = null;

    /** Returns the stored session, refreshing the access token if expired. */
    async getSession(forceRefresh = false): Promise<AuthSession | null> {
        const existing = persistence.getSession();
        if (!existing) return null;

        if (!forceRefresh && existing.expire * 1000 > Date.now()) {
            return existing;
        }

        // Try to refresh using the persisted cookie.
        const cookie = persistence.getRefreshCookie();
        if (cookie) accountApi.seedCookie(cookie);

        try {
            const accessToken = await accountApi.refreshToken();
            const session = await buildSession(accessToken);
            persistence.setSession(session);
            return session;
        } catch {
            // Refresh failed — session is dead.
            persistence.clearSession();
            return null;
        }
    }

    /** Runs the full interactive login flow. */
    async login(parent: BrowserWindow | null): Promise<AuthSession> {
        const { server, port, waitForCallback } = await startLoopback();
        this.loopback = server;

        const redirect = `http://${LOOPBACK_HOST}:${port}/callback`;
        const loginUrl = `${SIGNIN_URL}?desktop_redirect=${encodeURIComponent(redirect)}`;

        // Prefer the user's real browser; fall back to an in-app window.
        const opened = await shell.openExternal(loginUrl).then(
            () => true,
            () => false,
        );
        if (!opened) {
            this.openFallbackWindow(loginUrl);
        }

        try {
            const params = await withTimeout(waitForCallback(), 5 * 60 * 1000);
            if (!params) throw new Error('Login timed out. Please try again.');

            const accessTokenFromQuery = params.get('access_token') ?? params.get('token');
            let accessToken = accessTokenFromQuery ?? '';

            if (!accessToken) {
                // No token in the URL — rely on the refresh cookie.
                accessToken = await accountApi.refreshToken();
            }

            const session = await buildSession(accessToken);
            persistence.setSession(session);
            return session;
        } finally {
            this.stopLoopback();
            void parent;
        }
    }

    /** Deep-link fallback: `iarty://auth/callback?access_token=...`. */
    async loginWithDeepLink(deepLinkUrl: string): Promise<AuthSession | null> {
        try {
            const url = new URL(deepLinkUrl);
            if (url.protocol !== `${PROTOCOL_SCHEME}:`) return null;
            const accessToken = url.searchParams.get('access_token') ?? url.searchParams.get('token');
            if (!accessToken) return null;
            const session = await buildSession(accessToken);
            persistence.setSession(session);
            return session;
        } catch {
            return null;
        }
    }

    async logout(): Promise<void> {
        const session = persistence.getSession();
        if (session) await accountApi.logout(session.accessToken);
        persistence.clearSession();
    }

    private openFallbackWindow(loginUrl: string): void {
        const win = new BrowserWindow({
            width: 480,
            height: 720,
            title: 'Sign in to IARTY',
            autoHideMenuBar: true,
        });
        void win.loadURL(loginUrl);
    }

    private stopLoopback(): void {
        if (this.loopback) {
            this.loopback.close();
            this.loopback = null;
        }
    }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    return Promise.race([
        promise,
        new Promise<null>((resolve) => {
            const t = setTimeout(() => resolve(null), ms);
            t.unref?.();
        }),
    ]);
}

export const authManager = new AuthManager();

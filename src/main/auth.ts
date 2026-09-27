/**
 * Authentication manager.
 *
 * Two sign-in strategies, tried in order:
 *
 * ── 1. In-app browser window (primary, robust) ──────────────────────────────
 *    Opens a modal BrowserWindow on its own persistent session partition and
 *    loads the web app's `/signin` page. Because it is a real Chromium
 *    context, reCAPTCHA works and the httpOnly `refreshToken` cookie is stored
 *    in that partition. After the user signs in we detect the cookie and
 *    exchange it for an access token **through the same session**, so the
 *    cookie is sent automatically. This needs nothing from the web deploy.
 *
 * ── 2. External browser + loopback (fallback) ───────────────────────────────
 *    Opens the system browser with a `desktop_redirect` param; the web app
 *    redirects back to a local loopback URL carrying the access token. Used
 *    when the web app supports the handoff.
 *
 * Either way the user's password never reaches the app's own logic.
 */
import { BrowserWindow, shell, webContents } from 'electron';
import { createServer, type Server } from 'node:http';
import { jwtDecode } from 'jwt-decode';
import { accountApi } from './api';
import { authSession, sessionRequest } from './http';
import { persistence } from './store';
import { ACCOUNT_API_URL, LOOPBACK_HOST, PROTOCOL_SCHEME, SIGNIN_URL } from './config';
import type { AuthSession, AuthUser } from '@shared/types';

/** Broadcasts a human-readable progress line to any open renderer. */
function emitLoginLog(message: string): void {
    for (const wc of webContents.getAllWebContents()) {
        if (!wc.isDestroyed()) wc.send('auth:log', message);
    }
}

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

const REFRESH_COOKIE = 'refreshToken';

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

/** Returns the refresh cookie value from a session, if present. */
async function readRefreshCookie(): Promise<string | null> {
    const cookies = await authSession().cookies.get({ name: REFRESH_COOKIE });
    return cookies[0]?.value ?? null;
}

/**
 * Exchanges the session's refresh cookie for an access token via the account
 * backend, using Electron's net stack so the cookie is attached automatically.
 */
async function exchangeToken(): Promise<string | null> {
    const { status, body } = await sessionRequest(authSession(), `${ACCOUNT_API_URL}/token`);
    if (status !== 200) return null;
    const envelope = body as { success?: boolean; data?: { accessToken?: string } };
    return envelope?.data?.accessToken ?? null;
}

export class AuthManager {
    private loopback: Server | null = null;
    private loginWindow: BrowserWindow | null = null;

    /** Returns the stored session, refreshing the access token if expired. */
    async getSession(forceRefresh = false): Promise<AuthSession | null> {
        const existing = persistence.getSession();
        if (!existing) return null;

        if (!forceRefresh && existing.expire * 1000 > Date.now()) {
            return existing;
        }

        // Try to refresh using the in-app session cookies.
        try {
            const accessToken = await exchangeToken();
            if (accessToken) {
                const session = await buildSession(accessToken);
                persistence.setSession(session);
                return session;
            }
        } catch {
            /* fall through */
        }

        // Fallback to the headless jar (external-browser flow).
        const cookie = persistence.getRefreshCookie();
        if (cookie) {
            accountApi.seedCookie(cookie);
            try {
                const accessToken = await accountApi.refreshToken();
                const session = await buildSession(accessToken);
                persistence.setSession(session);
                return session;
            } catch {
                /* session is dead */
            }
        }

        persistence.clearSession();
        return null;
    }

    /**
     * Interactive login. Opens an in-app window; if the user prefers their
     * external browser the loopback fallback can be used instead.
     */
    async login(): Promise<AuthSession> {
        return this.loginWithInAppWindow();
    }

    // ── Strategy 1: in-app window ───────────────────────────────────────────

    private async loginWithInAppWindow(): Promise<AuthSession> {
        const ses = authSession();
        // Start clean so a previous user's cookies don't leak in.
        await ses.clearStorageData({ storages: ['cookies'] });
        emitLoginLog('Opening the IARTY sign-in window…');

        const win = new BrowserWindow({
            width: 480,
            height: 760,
            title: 'Sign in to IARTY',
            autoHideMenuBar: true,
            parent: undefined,
            modal: false,
            webPreferences: {
                partition: 'persist:iarty-auth',
                contextIsolation: true,
                nodeIntegration: false,
            },
        });
        this.loginWindow = win;

        win.loadURL(SIGNIN_URL).catch(() => {
            emitLoginLog('Could not load the sign-in page. Check your connection.');
        });

        // Inject a short instruction banner so the user knows to complete the
        // reCAPTCHA. Some SPA re-renders can drop the node, so re-add on load.
        const injectHint = (): void => {
            win.webContents
                .executeJavaScript(
                    `(function(){
                        if (document.getElementById('iarty-desktop-hint')) return;
                        var b = document.createElement('div');
                        b.id = 'iarty-desktop-hint';
                        b.textContent = 'Sign in below, tick "I am not a robot", then press Sign In.';
                        b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
                          'background:#2563eb;color:#fff;font:600 13px system-ui,sans-serif;' +
                          'padding:10px 14px;text-align:center;box-shadow:0 1px 6px rgba(0,0,0,.25)';
                        document.body.appendChild(b);
                    })()`,
                )
                .catch(() => undefined);
        };
        win.webContents.on('did-finish-load', injectHint);
        win.webContents.on('did-navigate', injectHint);

        const session = await new Promise<AuthSession | null>((resolve) => {
            let settled = false;
            let exchanging = false;
            const done = (value: AuthSession | null): void => {
                if (settled) return;
                settled = true;
                clearInterval(poll);
                clearTimeout(timer);
                clearTimeout(nudge);
                resolve(value);
            };

            // A single attempt: read the refresh cookie and trade it for an
            // access token. Guarded so overlapping ticks can't double-exchange
            // (the backend rotates the refresh token on every /token call).
            const attempt = async (): Promise<void> => {
                if (exchanging || settled) return;
                exchanging = true;
                try {
                    const cookie = await readRefreshCookie();
                    if (!cookie) return;
                    emitLoginLog('Sign-in detected — issuing your session…');
                    const accessToken = await exchangeToken();
                    if (!accessToken) {
                        emitLoginLog('Waiting for the session to become available…');
                        return;
                    }
                    done(await buildSession(accessToken));
                } catch {
                    /* keep polling */
                } finally {
                    exchanging = false;
                }
            };

            const poll = setInterval(() => void attempt(), 900);

            // Gentle nudge if the user hasn't finished after a while.
            const nudge = setTimeout(() => {
                if (!settled) {
                    emitLoginLog(
                        'Still waiting — tick the "I am not a robot" box and press Sign In.',
                    );
                }
            }, 25_000);

            // Kick once immediately in case a session already exists.
            void attempt();

            // Also try whenever the page navigates away from /signin (the web
            // app redirects to the dashboard/profile after a successful login).
            win.webContents.on('did-navigate', (_e, url) => {
                if (!/\/signin/.test(url)) void attempt();
            });
            win.webContents.on('did-navigate-in-page', (_e, url) => {
                if (!/\/signin/.test(url)) void attempt();
            });

            const timer = setTimeout(() => done(null), 5 * 60 * 1000);

            // If the user closes the window without finishing, bail out.
            win.on('closed', () => done(null));
        });

        if (this.loginWindow && !this.loginWindow.isDestroyed()) {
            this.loginWindow.close();
        }
        this.loginWindow = null;

        if (!session) throw new Error('Sign-in was cancelled or timed out. Please try again.');
        persistence.setSession(session);
        return session;
    }

    // ── Strategy 2: external browser + loopback ─────────────────────────────

    async loginWithExternalBrowser(): Promise<AuthSession> {
        const { server, port, waitForCallback } = await startLoopback();
        this.loopback = server;

        const redirect = `http://${LOOPBACK_HOST}:${port}/callback`;
        const loginUrl = `${SIGNIN_URL}?desktop_redirect=${encodeURIComponent(redirect)}`;
        emitLoginLog('Opening your browser to sign in…');

        const opened = await shell.openExternal(loginUrl).then(
            () => true,
            () => false,
        );
        // If we cannot launch the system browser, fall back to an in-app window.
        if (!opened) return this.loginWithInAppWindow();

        try {
            const params = await withTimeout(waitForCallback(), 5 * 60 * 1000);
            if (!params) throw new Error('Login timed out. Please try again.');

            const accessTokenFromQuery = params.get('access_token') ?? params.get('token');
            let accessToken = accessTokenFromQuery ?? '';
            if (!accessToken) {
                emitLoginLog('Finishing sign-in…');
                accessToken = (await exchangeToken()) ?? '';
            }
            if (!accessToken) throw new Error('Could not establish a session. Please try again.');

            emitLoginLog('Signed in — loading your workspace…');
            const session = await buildSession(accessToken);
            persistence.setSession(session);
            return session;
        } finally {
            this.stopLoopback();
        }
    }

    /** Deep-link fallback: `iarty://auth/callback?access_token=...`. */
    async loginWithDeepLink(deepLinkUrl: string): Promise<AuthSession | null> {
        try {
            const url = new URL(deepLinkUrl);
            if (url.protocol !== `${PROTOCOL_SCHEME}:`) return null;
            const accessToken =
                url.searchParams.get('access_token') ?? url.searchParams.get('token');
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
        await authSession()
            .clearStorageData({ storages: ['cookies'] })
            .catch(() => undefined);
        persistence.clearSession();
    }

    private stopLoopback(): void {
        if (this.loopback) {
            this.loopback.close();
            this.loopback = null;
        }
    }
}

/** Starts a short-lived loopback server waiting for the web redirect. */
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
                resolve({ server, port: address.port, waitForCallback: () => callbackPromise });
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

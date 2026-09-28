/**
 * Electron main process.
 *
 * Responsibilities:
 *   - Create the (secure) BrowserWindow hosting the renderer.
 *   - Register all IPC handlers the preload bridge exposes.
 *   - Manage the custom `iarty://` protocol for deep-link login.
 *   - Relay chat streams from the main process to the renderer.
 *
 * Security posture: contextIsolation ON, nodeIntegration OFF, sandbox ON,
 * navigation locked to local origins, window.open externalised.
 */
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authManager } from './auth';
import { aiApi, ApiError } from './api';
import { listLocalModels } from './localLlm';
import {
    cancelChat,
    relayToWindow,
    startCloudChat,
    startFeatureStream,
    startLocalChat,
    startStudyQuiz,
} from './chat';
import { persistence, sessionStore } from './store';
import { PROTOCOL_SCHEME } from './config';
import type {
    AppSettings,
    CloudChatRequest,
    LocalChatRequest,
    LocalProviderKind,
    FeatureStreamRequest,
    SessionFeature,
    StoredSession,
} from '@shared/types';

/**
 * Linux input-method hardening.
 *
 * On many Linux desktops `XMODIFIERS=@im=ibus` makes GTK hand every key event
 * to IBus. When the IBus daemon isn't reachable, Chromium's GTK IM context
 * backs up — you see `IBUS-WARNING **: Events queue growing too big, will
 * start to drop.` and text inputs (notably the sign-in email field) silently
 * stop accepting keystrokes.
 *
 * Forcing GTK to a self-contained IM context (before Electron initialises GTK)
 * keeps keyboard input working regardless of the system IBus state.
 */
if (process.platform === 'linux') {
    if (!process.env.GTK_IM_MODULE || process.env.GTK_IM_MODULE === 'ibus') {
        process.env.GTK_IM_MODULE = 'gtk-im-context-simple';
    }
}

const __dirname_ = fileURLToPath(new URL('.', import.meta.url));

/**
 * Resolves the window/taskbar icon. In dev it lives under `build/`; in a
 * packaged app electron-builder copies it into the resources directory.
 */
function appIconPath(): string {
    const packaged = join(process.resourcesPath, 'build', 'icon.png');
    const dev = join(__dirname_, '../../build/icon.png');
    return app.isPackaged ? packaged : dev;
}

let mainWindow: BrowserWindow | null = null;

// Single-instance lock: focus the existing window instead of opening a second.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', (_e, argv) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
        handleDeepLink(argv);
    });
}

/** Register the custom protocol so the OS routes iarty:// URLs to us. */
if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [process.argv[1]]);
    }
} else {
    app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
}

function handleDeepLink(argv: string[]): void {
    const url = argv.find((arg) => arg.startsWith(`${PROTOCOL_SCHEME}://`));
    if (!url) return;
    void authManager.loginWithDeepLink(url).then((session) => {
        if (session && mainWindow) {
            mainWindow.webContents.send('auth:changed', session);
        }
    });
}

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1180,
        height: 780,
        minWidth: 900,
        minHeight: 600,
        show: false,
        title: 'IARTY AI',
        autoHideMenuBar: true,
        backgroundColor: '#0b0b12',
        icon: appIconPath(),
        webPreferences: {
            preload: join(__dirname_, '../preload/index.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
        },
    });

    relayToWindow(mainWindow);

    mainWindow.once('ready-to-show', () => mainWindow?.show());

    // External links open in the system browser, never in-app.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        void shell.openExternal(url);
        return { action: 'deny' };
    });

    // Block in-app navigation away from the local renderer.
    mainWindow.webContents.on('will-navigate', (event, url) => {
        const isDev = !!process.env.ELECTRON_RENDERER_URL;
        const allowed = isDev && url.startsWith(process.env.ELECTRON_RENDERER_URL as string);
        if (!allowed) event.preventDefault();
    });

    const devUrl = process.env.ELECTRON_RENDERER_URL;
    if (devUrl) {
        void mainWindow.loadURL(devUrl);
    } else {
        void mainWindow.loadFile(join(__dirname_, '../renderer/index.html'));
    }
}

// ── IPC handlers ────────────────────────────────────────────────────────────

function registerIpc(): void {
    ipcMain.handle('auth:getSession', () => authManager.getSession());

    ipcMain.handle('auth:login', async (_e, method?: 'inApp' | 'browser') => {
        try {
            // Default to the user's real browser so an existing session
            // (including Google/OAuth) is reused — no re-login needed.
            const session =
                method === 'inApp'
                    ? await authManager.login()
                    : await authManager.loginWithExternalBrowser();
            return { status: 'success', session };
        } catch (error) {
            return {
                status: 'error',
                message: error instanceof Error ? error.message : 'Login failed',
            };
        }
    });

    ipcMain.handle('auth:logout', async () => {
        await authManager.logout();
        return true;
    });

    ipcMain.handle('ai:getModels', async () => {
        const session = await authManager.getSession();
        if (!session) throw new ApiError('Not authenticated', 401);
        return aiApi.getModels(session.accessToken);
    });

    ipcMain.handle('ai:getPlan', async () => {
        const session = await authManager.getSession();
        if (!session) throw new ApiError('Not authenticated', 401);
        return aiApi.getMyPlan(session.accessToken);
    });

    ipcMain.handle('local:listModels', (_e, kind: LocalProviderKind, baseUrl: string, apiKey?: string) =>
        listLocalModels(kind, baseUrl, apiKey),
    );

    ipcMain.handle('chat:startCloud', (_e, req: CloudChatRequest) => startCloudChat(req));
    ipcMain.handle('chat:startLocal', (_e, req: LocalChatRequest) => startLocalChat(req));
    ipcMain.handle('chat:cancel', (_e, requestId: string) => cancelChat(requestId));

    ipcMain.handle('feature:start', (_e, req: FeatureStreamRequest) => startFeatureStream(req));
    ipcMain.handle(
        'feature:studyQuiz',
        (
            _e,
            req: { summaryText: string; language?: string; amount?: number; instruction?: string; model: string },
        ) => startStudyQuiz(req),
    );
    ipcMain.handle('feature:cancel', (_e, requestId: string) => cancelChat(requestId));

    ipcMain.handle('settings:get', () => persistence.getSettings());
    ipcMain.handle('settings:set', (_e, settings: AppSettings) => {
        persistence.setSettings(settings);
        return persistence.getSettings();
    });

    // ── Local session history ────────────────────────────────────────────
    ipcMain.handle('sessions:list', (_e, feature?: SessionFeature) => sessionStore.list(feature));
    ipcMain.handle('sessions:get', (_e, id: string) => sessionStore.get(id));
    ipcMain.handle(
        'sessions:save',
        (
            _e,
            session: {
                id: string;
                feature: SessionFeature;
                title: string;
                payload: unknown;
                createdAt?: string;
            },
        ) => sessionStore.save(session) as StoredSession,
    );
    ipcMain.handle('sessions:rename', (_e, id: string, title: string) =>
        sessionStore.rename(id, title),
    );
    ipcMain.handle('sessions:delete', (_e, id: string) => sessionStore.remove(id));
    ipcMain.handle('sessions:clear', (_e, feature?: SessionFeature) => {
        sessionStore.clear(feature);
        return true;
    });
}

// ── App lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(() => {
    registerIpc();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Windows/Linux: protocol deep link arrives as a CLI arg.
app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink([url]);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

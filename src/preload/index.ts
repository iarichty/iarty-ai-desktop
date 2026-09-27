/**
 * Preload bridge.
 *
 * Exposes a narrow, typed API to the renderer under `window.iarty`. No Node
 * primitives leak through: only the specific IPC channels the UI needs.
 */
import { contextBridge, ipcRenderer } from 'electron';
import type {
    AppSettings,
    AuthSession,
    CloudChatRequest,
    LocalChatRequest,
    LocalProviderKind,
    StreamEvent,
} from '@shared/types';
import type { IartyBridge } from '@shared/bridge';

const api: IartyBridge = {
    auth: {
        getSession: () => ipcRenderer.invoke('auth:getSession') as Promise<AuthSession | null>,
        login: (method?: 'inApp' | 'browser') => ipcRenderer.invoke('auth:login', method),
        logout: () => ipcRenderer.invoke('auth:logout'),
        onChange: (listener: (payload: AuthSession | null) => void) => {
            const handler = (_e: unknown, payload: AuthSession | null): void => listener(payload);
            ipcRenderer.on('auth:changed', handler);
            return () => ipcRenderer.removeListener('auth:changed', handler);
        },
    },
    ai: {
        getModels: () => ipcRenderer.invoke('ai:getModels'),
        getPlan: () => ipcRenderer.invoke('ai:getPlan'),
    },
    local: {
        listModels: (kind: LocalProviderKind, baseUrl: string, apiKey?: string) =>
            ipcRenderer.invoke('local:listModels', kind, baseUrl, apiKey),
    },
    chat: {
        startCloud: (req: CloudChatRequest) => ipcRenderer.invoke('chat:startCloud', req),
        startLocal: (req: LocalChatRequest) => ipcRenderer.invoke('chat:startLocal', req),
        cancel: (requestId: string) => ipcRenderer.invoke('chat:cancel', requestId),
        onStream: (listener: (payload: { requestId: string; event: StreamEvent }) => void) => {
            const handler = (
                _e: unknown,
                payload: { requestId: string; event: StreamEvent },
            ): void => listener(payload);
            ipcRenderer.on('chat:stream', handler);
            return () => ipcRenderer.removeListener('chat:stream', handler);
        },
    },
    settings: {
        get: () => ipcRenderer.invoke('settings:get') as Promise<AppSettings>,
        set: (settings: AppSettings) =>
            ipcRenderer.invoke('settings:set', settings) as Promise<AppSettings>,
    },
};

contextBridge.exposeInMainWorld('iarty', api);

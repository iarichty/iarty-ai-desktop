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
    FeatureStreamRequest,
    LocalChatRequest,
    LocalProviderKind,
    SessionFeature,
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
        onLog: (listener: (message: string) => void) => {
            const handler = (_e: unknown, message: string): void => listener(message);
            ipcRenderer.on('auth:log', handler);
            return () => ipcRenderer.removeListener('auth:log', handler);
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
    features: {
        start: (req: FeatureStreamRequest) => ipcRenderer.invoke('feature:start', req),
        studyQuiz: (req: {
            summaryText: string;
            language?: string;
            amount?: number;
            instruction?: string;
            model: string;
        }) => ipcRenderer.invoke('feature:studyQuiz', req),
        cancel: (requestId: string) => ipcRenderer.invoke('feature:cancel', requestId),
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
    sessions: {
        list: (feature?: SessionFeature) => ipcRenderer.invoke('sessions:list', feature),
        get: (id: string) => ipcRenderer.invoke('sessions:get', id),
        save: (session: {
            id: string;
            feature: SessionFeature;
            title: string;
            payload: unknown;
            createdAt?: string;
        }) => ipcRenderer.invoke('sessions:save', session),
        rename: (id: string, title: string) => ipcRenderer.invoke('sessions:rename', id, title),
        remove: (id: string) => ipcRenderer.invoke('sessions:delete', id),
        clear: (feature?: SessionFeature) => ipcRenderer.invoke('sessions:clear', feature),
    },
};

contextBridge.exposeInMainWorld('iarty', api);

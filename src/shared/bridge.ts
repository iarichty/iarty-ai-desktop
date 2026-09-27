/**
 * The contract of the preload bridge (`window.iarty`). Declared in `shared`
 * so both the preload (which implements it) and the renderer (which consumes
 * it) type-check against the same surface without cross-project imports.
 */
import type {
    AppSettings,
    AuthSession,
    CloudModel,
    AiPlan,
    CloudChatRequest,
    LocalChatRequest,
    LocalProviderKind,
    LocalProviderStatus,
    LoginResult,
    StreamEvent,
} from './types';

export interface IartyBridge {
    auth: {
        getSession: () => Promise<AuthSession | null>;
        login: (method?: 'inApp' | 'browser') => Promise<LoginResult>;
        logout: () => Promise<boolean>;
        onChange: (listener: (payload: AuthSession | null) => void) => () => void;
        onLog: (listener: (message: string) => void) => () => void;
    };
    ai: {
        getModels: () => Promise<CloudModel[]>;
        getPlan: () => Promise<AiPlan>;
    };
    local: {
        listModels: (
            kind: LocalProviderKind,
            baseUrl: string,
            apiKey?: string,
        ) => Promise<LocalProviderStatus>;
    };
    chat: {
        startCloud: (req: CloudChatRequest) => Promise<string>;
        startLocal: (req: LocalChatRequest) => Promise<string>;
        cancel: (requestId: string) => Promise<void>;
        onStream: (
            listener: (payload: { requestId: string; event: StreamEvent }) => void,
        ) => () => void;
    };
    settings: {
        get: () => Promise<AppSettings>;
        set: (settings: AppSettings) => Promise<AppSettings>;
    };
}

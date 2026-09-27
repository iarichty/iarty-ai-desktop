/**
 * Shared types.
 *
 * Imported by BOTH the main process and the renderer. Keep this file free of
 * any Node- or DOM-only globals so it can be bundled into either target.
 */

/** Standard backend envelope returned by every IARTY endpoint. */
export interface ApiEnvelope<T> {
    success: boolean;
    message?: string;
    data?: T;
    code?: string;
}

/** Authenticated user built from the access-token claims + permissions. */
export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar_url?: string | null;
    is_verified?: boolean;
    is_blocked?: boolean;
    permissions: string[];
}

export interface AuthSession {
    user: AuthUser;
    accessToken: string;
    /** Unix seconds. */
    expire: number;
}

/** Result of a login attempt initiated from the renderer. */
export type LoginResult =
    | { status: 'success'; session: AuthSession }
    | { status: 'cancelled' }
    | { status: 'error'; message: string };

/** Cloud model entry from GET /ai/models. */
export interface CloudModel {
    code: string;
    label: string;
    provider: string;
    image?: boolean;
    file?: boolean;
    thinking?: boolean;
    reasoningLevels?: string[];
    deepsearch?: boolean;
    noApiKey?: boolean;
    freeWithCredits?: boolean;
}

/** A model the user can chat with — either cloud (via backend) or local. */
export interface UnifiedModel {
    id: string;
    label: string;
    source: 'cloud' | 'local';
    provider: string;
    /** local only */
    localKind?: LocalProviderKind;
    localBaseUrl?: string;
    /** cloud only */
    meta?: CloudModel;
}

export type LocalProviderKind = 'ollama' | 'openai-compatible';

export interface LocalProviderConfig {
    kind: LocalProviderKind;
    baseUrl: string;
    apiKey?: string;
}

export interface LocalModel {
    id: string;
    label: string;
    kind: LocalProviderKind;
    baseUrl: string;
}

export interface LocalProviderStatus {
    kind: LocalProviderKind;
    baseUrl: string;
    reachable: boolean;
    models: LocalModel[];
    error?: string;
}

/** AI plan / credit usage from GET /me/ai-plans. */
export interface AiPlan {
    plan: string;
    usage: number;
    [key: string]: unknown;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface CloudChatRequest {
    model: string;
    prompt: string;
    feature?: string;
    systemPrompt?: string;
    history?: ChatMessage[];
    reasoningEffort?: string;
    isDeepSearch?: boolean;
}

export interface LocalChatRequest {
    kind: LocalProviderKind;
    baseUrl: string;
    apiKey?: string;
    model: string;
    messages: ChatMessage[];
}

/** Streamed over IPC events, keyed by requestId. */
export type StreamEvent =
    | { type: 'chunk'; content: string }
    | { type: 'done' }
    | { type: 'error'; message: string };

export interface ChatStartResult {
    requestId: string;
}

export interface AppSettings {
    localProvider: LocalProviderConfig;
    defaultModelId: string;
}

/** Persisted shape in electron-store. Tokens are kept in the OS keychain-ish
 * store (electron-store file) and never exposed to the renderer in full. */
export interface PersistedState {
    accessToken?: string;
    refreshCookie?: string;
    expire?: number;
    user?: AuthUser;
    settings?: AppSettings;
}

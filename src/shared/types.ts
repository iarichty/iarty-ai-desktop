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
    /** ISO timestamp; set by the renderer for display, not sent to the model. */
    timestamp?: string;
    /** True when the assistant turn failed (e.g. out of credits) so the UI can offer a retry. */
    failed?: boolean;
}

export interface CloudChatRequest {
    model: string;
    prompt: string;
    feature?: string;
    systemPrompt?: string;
    history?: ChatMessage[];
    reasoningEffort?: string;
    isDeepSearch?: boolean;
    historyMode?: string;
    historyCustomCount?: number;
    cavemanMode?: string;
}

/**
 * Generic AI feature request routed to a specific (streaming) backend path.
 * Covers PRD builder, minutes, study and the roast endpoints — every one of
 * which streams `data: {content}` SSE chunks.
 */
export interface FeatureStreamRequest {
    /** Path under the AI API, e.g. `/ai/minutes`. */
    path: string;
    /** Extra multipart text fields sent alongside the standard ones. */
    fields?: Record<string, string>;
    model: string;
    history?: ChatMessage[];
}

/** Feature ids the desktop sidebar can route to. */
export type FeatureId =
    | 'chat'
    | 'prd-builder'
    | 'minutes'
    | 'study'
    | 'linkedin-roast'
    | 'ig-roast'
    | 'tiktok-roast';

/**
 * Feature ids that own a locally-persisted session history. Only the rich,
 * multi-turn features keep sessions; the one-shot roasts do not.
 */
export type SessionFeature = 'chat' | 'prd-builder' | 'minutes' | 'study';

/** A saved conversation / workspace session stored on disk. */
export interface StoredSession {
    /** Stable id, e.g. `chat-1712345678901`. */
    id: string;
    feature: SessionFeature;
    /** Human-friendly title, derivable from the first user turn. */
    title: string;
    /** ISO timestamps. */
    createdAt: string;
    updatedAt: string;
    /** Full serialised feature state. Shape depends on `feature`. */
    payload: unknown;
}

/** Lightweight projection returned by `sessions.list()` (no payload). */
export interface SessionSummary {
    id: string;
    feature: SessionFeature;
    title: string;
    createdAt: string;
    updatedAt: string;
    /** Number of turns / items, feature-specific, for display. */
    itemCount: number;
}

/** Chat feature session payload. */
export interface ChatSessionPayload {
    messages: ChatMessage[];
    modelId?: string;
}

/** PRD Builder feature session payload (mirrors the web export shape). */
export interface PrdSessionPayload {
    messages: unknown[];
    outputs: { prd_markdown: string; database_schema: string; page_flow: string };
    design: unknown | null;
    projectTitle: string;
    status: string;
}

/** Minutes / Study feature session payload. */
export interface TextSessionPayload {
    input: string;
    output: string;
    /** Feature-specific extras (language, mode, amount…). */
    meta?: Record<string, string>;
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
    /** When true, sessions are written to disk automatically as they change. */
    autoSaveSessions: boolean;
}

/** Chat context-length modes offered in the composer (mirrors the web app). */
export type HistoryMode = 'short' | 'long' | 'full' | 'custom';
export type CavemanMode = 'off' | 'lite' | 'full';
export type ReasoningEffort = 'disabled' | 'low' | 'medium' | 'high';

/** Per-conversation composer settings held in renderer state. */
export interface ChatSettings {
    historyMode: HistoryMode;
    historyCustomCount: number;
    cavemanMode: CavemanMode;
    reasoningEffort: ReasoningEffort;
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

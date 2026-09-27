/**
 * Central runtime configuration.
 *
 * The production backend URLs are intentionally NOT hardcoded here — they are
 * supplied via environment variables (see `.env.example`). This keeps the
 * published source free of any deployment-specific infrastructure details, and
 * lets anyone point the app at their own IARTY backend.
 *
 * The app is a thin client: every AI capability, prompt, model routing and
 * credit decision lives in the backend. This process only relays requests and
 * renders streamed responses.
 */

/** Account / auth backend (login handoff, token exchange, permissions). */
export const ACCOUNT_API_URL =
    import.meta.env.MAIN_VITE_ACCOUNT_API_URL || 'http://localhost:4000/api';

/** AI feature backend (chat, models, credits). */
export const AI_API_URL = import.meta.env.MAIN_VITE_AI_API_URL || 'http://localhost:4001/api';

/** Public web app opened in the browser for sign-in. */
export const WEB_APP_URL = import.meta.env.MAIN_VITE_WEB_APP_URL || 'http://localhost:5173';

/** Where the browser is sent to authenticate. */
export const SIGNIN_URL = `${WEB_APP_URL}/signin`;

/** Custom protocol used as a deep-link fallback when the loopback cannot run. */
export const PROTOCOL_SCHEME = 'iarty';

/** Loopback host/port the app listens on for the browser redirect. */
export const LOOPBACK_HOST = '127.0.0.1';

/** Default local provider endpoints. */
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
export const DEFAULT_OPENAI_COMPATIBLE_URL = 'http://localhost:1234/v1';

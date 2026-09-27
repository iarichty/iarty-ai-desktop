# IARTY AI Desktop

A thin Electron desktop client for the IARTY AI platform. It pairs the
**cloud features** (models, chat, credit accounting) served by the online
backend with the user's **own local models** (Ollama / LM Studio / vLLM), so
heavy or private workloads can run for free on the user's machine.

> **The app contains no AI logic.** Every model, prompt, routing decision and
> credit check lives in the backend. This client only relays requests and
> renders the streamed responses — it is a black-box consumer of the platform's
> public API.

## Features

- **Browser-based sign-in** — authenticate on the real web app; your password
  never touches the desktop app. The session is handed back over a local
  loopback callback.
- **Cloud chat** — stream responses from the platform's models (metered by
  credits).
- **Local models** — auto-detect and chat with Ollama or any OpenAI-compatible
  server on your machine, unmetered.
- **Live credit badge** — always know what's left on your plan.
- **Light & dark themes** with an animated circle-bloom transition.

## Architecture

```
┌─────────────────────────── Electron app ───────────────────────────┐
│  Renderer (React + TS + Tailwind v4 + framer-motion)               │
│     │  contextBridge (window.iarty)                                │
│  Preload (typed IPC surface, CJS)                                  │
│     │  ipcMain / ipcRenderer                                       │
│  Main process                                                      │
│     ├─ auth   → external-browser login + loopback, token refresh   │
│     ├─ api    → account service / AI feature service                │
│     ├─ chat   → SSE proxy (cloud) + local streaming                │
│     └─ local  → Ollama / OpenAI-compatible probe & chat            │
└────────────────────────────────────────────────────────────────────┘
```

The renderer never sees the access token or the refresh cookie — every
authenticated call is proxied through the main process. This also sidesteps
browser CORS, since the backend only allows registered web origins.

## Configuration

All backend URLs come from environment variables — none are hardcoded in the
published source. Copy `.env.example` to `.env` and fill in your deployment:

```bash
cp .env.example .env
```

| Variable                     | Purpose                                          |
| ---------------------------- | ------------------------------------------------ |
| `MAIN_VITE_ACCOUNT_API_URL`  | Account/auth service (login handoff, permissions)|
| `MAIN_VITE_AI_API_URL`       | AI feature service (chat, models, credits)       |
| `MAIN_VITE_WEB_APP_URL`      | Public web app opened in the browser for sign-in |

## Login flow (external browser + loopback)

1. The app boots a short-lived HTTP server on `127.0.0.1:<port>`.
2. It opens the system browser at `<WEB_APP_URL>/signin?desktop_redirect=http://127.0.0.1:<port>/callback`.
3. After a successful login the web app redirects the browser to that loopback
   URL with the access token (and/or the shared refresh cookie).
4. The app stores the session, exchanges the cookie for a token if needed, and
   loads the user's permissions.

A custom protocol (`iarty://auth/callback?access_token=…`) is registered as a
fallback deep link for environments where the loopback cannot bind.

### Web-app requirement

For step 3, the web front end must honour the `desktop_redirect` query param on
its sign-in page:

```tsx
const desktopRedirect = new URLSearchParams(location.search).get('desktop_redirect');
if (desktopRedirect) {
    const url = new URL(desktopRedirect);
    url.searchParams.set('access_token', accessToken);
    window.location.href = url.toString();
    return;
}
```

## Local models

Configured in **Settings → Local model provider**:

- **Ollama** — default `http://localhost:11434`, models from `/api/tags`,
  chat via `/api/chat`.
- **OpenAI-compatible** — LM Studio / vLLM / llama.cpp, default
  `http://localhost:1234/v1`, models from `/v1/models`, chat via
  `/v1/chat/completions`.

Local requests are made directly from the main process to the localhost server
and are **not** metered by IARTY credits.

## Development

```bash
npm install
npm run dev        # electron-vite dev (HMR)
npm run build      # production bundle into out/
npm run typecheck  # tsc for main+preload and renderer
npm run lint
npm run dist       # installers into release/<version>
```

## Security posture

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Renderer CSP limits scripts to self; no remote code.
- External links open in the system browser; in-app navigation is locked to
  the local renderer.
- Tokens live only in the main process (`electron-store` under app data).
- No backend logic, prompts, or infra details are embedded in this repo.

## License

UNLICENSED — © IARTY.

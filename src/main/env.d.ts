/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
    readonly MAIN_VITE_ACCOUNT_API_URL?: string;
    readonly MAIN_VITE_AI_API_URL?: string;
    readonly MAIN_VITE_WEB_APP_URL?: string;
    readonly ELECTRON_RENDERER_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

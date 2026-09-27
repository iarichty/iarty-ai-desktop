import { useCallback, useEffect, useState } from 'react';
import { bridge } from '@/lib/bridge';
import type { AppSettings } from '@shared/types';

const FALLBACK: AppSettings = {
    localProvider: { kind: 'ollama', baseUrl: 'http://localhost:11434', apiKey: '' },
    defaultModelId: '',
};

/** Loads and persists app settings via the main process. */
export function useSettings(): [AppSettings, (next: AppSettings) => Promise<void>] {
    const [settings, setSettings] = useState<AppSettings>(FALLBACK);

    useEffect(() => {
        bridge.settings
            .get()
            .then((s) => setSettings(s ?? FALLBACK))
            .catch(() => setSettings(FALLBACK));
    }, []);

    const save = useCallback(async (next: AppSettings) => {
        const stored = await bridge.settings.set(next);
        setSettings(stored);
    }, []);

    return [settings, save];
}

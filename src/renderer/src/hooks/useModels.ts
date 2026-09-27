import { useCallback, useEffect, useState } from 'react';
import { bridge } from '@/lib/bridge';
import type {
    AiPlan,
    AppSettings,
    CloudModel,
    LocalProviderKind,
    LocalProviderStatus,
    UnifiedModel,
} from '@shared/types';

const FALLBACK_SETTINGS: AppSettings = {
    localProvider: { kind: 'ollama', baseUrl: 'http://localhost:11434', apiKey: '' },
    defaultModelId: '',
};

interface UseModels {
    models: UnifiedModel[];
    cloudModels: CloudModel[];
    local: LocalProviderStatus | null;
    loading: boolean;
    refreshLocal: (kind: LocalProviderKind, baseUrl: string, apiKey?: string) => Promise<void>;
}

/** Loads the cloud catalog and probes the configured local provider. */
export function useModels(authenticated: boolean, settings: AppSettings): UseModels {
    const [cloudModels, setCloudModels] = useState<CloudModel[]>([]);
    const [local, setLocal] = useState<LocalProviderStatus | null>(null);
    const [loading, setLoading] = useState(false);

    const refreshLocal = useCallback(
        async (kind: LocalProviderKind, baseUrl: string, apiKey?: string) => {
            const status = (await bridge.local.listModels(kind, baseUrl, apiKey)) as LocalProviderStatus;
            setLocal(status);
        },
        [],
    );

    useEffect(() => {
        if (!authenticated) return;
        setLoading(true);
        bridge.ai
            .getModels()
            .then((models) => setCloudModels(models))
            .catch(() => setCloudModels([]))
            .finally(() => setLoading(false));
    }, [authenticated]);

    useEffect(() => {
        const s = settings ?? FALLBACK_SETTINGS;
        void refreshLocal(s.localProvider.kind, s.localProvider.baseUrl, s.localProvider.apiKey);
    }, [settings, refreshLocal]);

    const models: UnifiedModel[] = [
        ...cloudModels
            .filter((m) => !m.image)
            .map<UnifiedModel>((m) => ({
                id: m.code,
                label: m.label,
                source: 'cloud',
                provider: m.provider,
                meta: m,
            })),
        ...(local?.models ?? []).map<UnifiedModel>((m) => ({
            id: m.id,
            label: `${m.label} (local)`,
            source: 'local',
            provider: m.kind,
            localKind: m.kind,
            localBaseUrl: m.baseUrl,
        })),
    ];

    return { models, cloudModels, local, loading, refreshLocal };
}

interface UsePlan {
    plan: AiPlan | null;
    remaining: number | null;
    refresh: () => void;
}

/** Fetches the user's AI plan and derives remaining credits. */
export function usePlan(authenticated: boolean): UsePlan {
    const [plan, setPlan] = useState<AiPlan | null>(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        if (!authenticated) {
            setPlan(null);
            return;
        }
        bridge.ai
            .getPlan()
            .then((p) => setPlan(p))
            .catch(() => setPlan(null));
    }, [authenticated, tick]);

    const limit = typeof plan?.plan === 'string' ? planLimit(plan.plan) : null;
    const remaining =
        plan && limit !== null ? Math.max(0, limit - (plan.usage ?? 0)) : null;

    return { plan, remaining, refresh: () => setTick((t) => t + 1) };
}

function planLimit(plan: string): number {
    switch (plan.toLowerCase()) {
        case 'free':
            return 100;
        case 'pro':
            return 5000;
        case 'business':
            return 25000;
        default:
            return 1000;
    }
}

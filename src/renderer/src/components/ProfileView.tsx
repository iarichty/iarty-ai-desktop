import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    TbCpu,
    TbCloud,
    TbBolt,
    TbDeviceFloppy,
    TbShieldCheck,
    TbDatabase,
    TbRobot,
    TbChevronRight,
} from 'react-icons/tb';
import type { AppSettings, AuthSession, LocalProviderKind, UnifiedModel } from '@shared/types';
import { ModelPicker } from './ModelPicker';
import { Button } from './Button';
import { Logo } from './Logo';

interface Props {
    session: AuthSession;
    settings: AppSettings;
    models: UnifiedModel[];
    selected: UnifiedModel | null;
    onSelectModel: (model: UnifiedModel) => void;
    onSaveSettings: (next: AppSettings) => Promise<void>;
    onProbe: (kind: LocalProviderKind, baseUrl: string, apiKey?: string) => Promise<void>;
    plan: { plan: { plan?: string; usage?: number } | null; remaining: number | null };
    onClose: () => void;
}

const field =
    'w-full rounded-xl border border-border bg-[color:var(--surface-2)] px-3 py-2 text-sm text-text-h outline-none transition-colors focus:border-accent';

const getInitials = (name?: string): string =>
    name
        ? name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : 'U';

/**
 * Profile view — central place for everything account- and model-related so the
 * rest of the UI stays clean: identity, plan & credits, preferred model, local
 * provider configuration and local-session storage preferences.
 */
export function ProfileView({
    session,
    settings,
    models,
    selected,
    onSelectModel,
    onSaveSettings,
    onProbe,
    plan,
    onClose,
}: Props): JSX.Element {
    const [kind, setKind] = useState<LocalProviderKind>(settings.localProvider.kind);
    const [baseUrl, setBaseUrl] = useState(settings.localProvider.baseUrl);
    const [apiKey, setApiKey] = useState(settings.localProvider.apiKey ?? '');
    const [autoSave, setAutoSave] = useState(settings.autoSaveSessions);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setKind(settings.localProvider.kind);
        setBaseUrl(settings.localProvider.baseUrl);
        setApiKey(settings.localProvider.apiKey ?? '');
        setAutoSave(settings.autoSaveSessions);
    }, [settings]);

    const user = session.user;
    const planName = typeof plan.plan?.plan === 'string' ? plan.plan.plan : 'free';

    const save = useCallback(async () => {
        setSaving(true);
        try {
            await onSaveSettings({
                ...settings,
                localProvider: { kind, baseUrl, apiKey },
                defaultModelId: selected?.id ?? settings.defaultModelId,
                autoSaveSessions: autoSave,
            });
            await onProbe(kind, baseUrl, apiKey);
        } finally {
            setSaving(false);
        }
    }, [settings, kind, baseUrl, apiKey, autoSave, selected, onSaveSettings, onProbe]);

    return (
        <div className="h-full overflow-y-auto bg-bg">
            <div className="mx-auto max-w-4xl px-6 pb-8 pt-20">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="mb-8">
                        <p className="text-xs font-bold uppercase tracking-widest text-accent">
                            Account
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-4">
                            <h1 className="text-3xl font-black tracking-tight text-text-h">
                                Your Profile
                            </h1>
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                Back to app
                            </Button>
                        </div>
                        <p className="mt-2 text-sm text-text">
                            Manage your account, preferred model and local provider. Everything here
                            is stored on this computer.
                        </p>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                        {/* ── Left: identity card ─────────────────────────── */}
                        <aside className="flex flex-col gap-4">
                            <div className="flex flex-col items-center rounded-3xl border border-border bg-[color:var(--surface)]/70 p-6 text-center">
                                <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-accent-2 text-2xl font-black text-[color:var(--accent-contrast)] shadow-xl">
                                    {user.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt={user.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        getInitials(user.name)
                                    )}
                                </div>
                                <h2 className="mt-4 flex items-center gap-1.5 text-lg font-bold text-text-h">
                                    {user.name}
                                    {user.is_verified && (
                                        <TbShieldCheck className="h-4 w-4 text-accent" />
                                    )}
                                </h2>
                                <p className="text-xs text-text">{user.email}</p>

                                <div className="mt-4 flex w-full items-center justify-between rounded-2xl border border-border bg-[color:var(--surface-2)] px-4 py-3">
                                    <span className="flex items-center gap-1.5 text-xs font-semibold capitalize text-accent">
                                        <TbBolt className="h-4 w-4" />
                                        {planName} plan
                                    </span>
                                    <span className="text-xs font-medium text-text-h">
                                        {plan.remaining !== null
                                            ? `${plan.remaining} credits`
                                            : '—'}
                                    </span>
                                </div>

                                <div className="mt-3 flex items-center gap-2">
                                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-2">
                                        <Logo size={16} color="var(--accent-contrast)" />
                                    </span>
                                    <span className="text-xs text-text">
                                        <TbDatabase className="mr-1 inline h-3 w-3" />
                                        Sessions saved locally
                                    </span>
                                </div>
                            </div>
                        </aside>

                        {/* ── Right: settings ─────────────────────────────── */}
                        <section className="flex flex-col gap-6">
                            {/* Preferred model */}
                            <Card
                                icon={TbRobot}
                                title="Preferred AI model"
                                description="Used by default across every feature."
                            >
                                <ModelPicker
                                    models={models}
                                    selected={selected}
                                    onSelect={onSelectModel}
                                />
                                {selected && (
                                    <p className="mt-3 text-xs text-text">
                                        Active:{' '}
                                        <span className="font-semibold text-text-h">
                                            {selected.label}
                                        </span>{' '}
                                        ·{' '}
                                        <span className="inline-flex items-center gap-1">
                                            {selected.source === 'local' ? (
                                                <>
                                                    <TbCpu className="h-3 w-3" /> Local (unlimited)
                                                </>
                                            ) : (
                                                <>
                                                    <TbCloud className="h-3 w-3" /> Cloud (credits)
                                                </>
                                            )}
                                        </span>
                                    </p>
                                )}
                            </Card>

                            {/* Local provider */}
                            <Card
                                icon={TbCpu}
                                title="Local model provider"
                                description="Connect Ollama or any OpenAI-compatible server running on this computer."
                            >
                                <label className="mb-1 block text-xs uppercase tracking-wide text-text">
                                    Provider
                                </label>
                                <select
                                    value={kind}
                                    onChange={(e) => setKind(e.target.value as LocalProviderKind)}
                                    className={`${field} mb-4`}
                                >
                                    <option value="ollama">Ollama</option>
                                    <option value="openai-compatible">
                                        OpenAI-compatible (LM Studio, vLLM…)
                                    </option>
                                </select>

                                <label className="mb-1 block text-xs uppercase tracking-wide text-text">
                                    Base URL
                                </label>
                                <input
                                    value={baseUrl}
                                    onChange={(e) => setBaseUrl(e.target.value)}
                                    placeholder={
                                        kind === 'ollama'
                                            ? 'http://localhost:11434'
                                            : 'http://localhost:1234/v1'
                                    }
                                    className={`${field} mb-4`}
                                />

                                <label className="mb-1 block text-xs uppercase tracking-wide text-text">
                                    API key (optional)
                                </label>
                                <input
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    type="password"
                                    placeholder="Only if your local server requires it"
                                    className={field}
                                />
                            </Card>

                            {/* Session storage */}
                            <Card
                                icon={TbDatabase}
                                title="Local sessions"
                                description="Chats, PRD sessions, minutes and study runs are saved to this computer automatically."
                            >
                                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-[color:var(--surface-2)] px-4 py-3">
                                    <span className="text-sm text-text-h">
                                        Auto-save sessions while you work
                                    </span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={autoSave}
                                        onClick={() => setAutoSave((v) => !v)}
                                        className={`relative h-6 w-11 rounded-full transition-colors ${
                                            autoSave ? 'bg-accent' : 'bg-border'
                                        }`}
                                    >
                                        <motion.span
                                            layout
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${
                                                autoSave ? 'right-0.5' : 'left-0.5'
                                            }`}
                                        />
                                    </button>
                                </label>
                                <p className="mt-2 text-xs text-text">
                                    Saved under this app’s data folder. Open any feature and use its
                                    history button to revisit a session.
                                </p>
                            </Card>

                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={onClose}>
                                    Close
                                </Button>
                                <Button onClick={() => void save()} disabled={saving}>
                                    <TbDeviceFloppy className="h-4 w-4" />
                                    {saving ? 'Saving…' : 'Save & detect models'}
                                </Button>
                            </div>
                        </section>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function Card({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    children: React.ReactNode;
}): JSX.Element {
    return (
        <div className="rounded-3xl border border-border bg-[color:var(--surface)]/70 p-6">
            <div className="mb-4 flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                </span>
                <div>
                    <h3 className="flex items-center gap-1 text-sm font-bold text-text-h">
                        {title}
                        <TbChevronRight className="h-3.5 w-3.5 text-text" />
                    </h3>
                    <p className="text-xs text-text">{description}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

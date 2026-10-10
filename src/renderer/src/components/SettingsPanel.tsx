import { useState } from 'react';
import { motion } from 'framer-motion';
import { TbX } from 'react-icons/tb';
import type { AppSettings, LocalProviderKind } from '@shared/types';
import { Button } from './Button';
import { useLanguage } from '@/context/useLanguage';

interface Props {
    settings: AppSettings;
    onSave: (next: AppSettings) => Promise<void>;
    onProbe: (kind: LocalProviderKind, baseUrl: string, apiKey?: string) => Promise<void>;
    onClose: () => void;
}

const field =
    'w-full rounded-xl border border-border bg-[color:var(--surface-2)] px-3 py-2 text-sm text-text-h outline-none transition-colors focus:border-accent';

/** Modal: configure the local provider and probe its models. */
export function SettingsPanel({ settings, onSave, onProbe, onClose }: Props): JSX.Element {
    const { t } = useLanguage();
    const [kind, setKind] = useState<LocalProviderKind>(settings.localProvider.kind);
    const [baseUrl, setBaseUrl] = useState(settings.localProvider.baseUrl);
    const [apiKey, setApiKey] = useState(settings.localProvider.apiKey ?? '');
    const [saving, setSaving] = useState(false);

    const save = async (): Promise<void> => {
        setSaving(true);
        try {
            await onSave({ ...settings, localProvider: { kind, baseUrl, apiKey } });
            await onProbe(kind, baseUrl, apiKey);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-2xl border border-border bg-[color:var(--surface)] p-6 shadow-2xl"
            >
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{t('settings.localProvider')}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-text transition-colors hover:bg-[color:var(--surface-2)] hover:text-text-h"
                    >
                        <TbX className="h-5 w-5" />
                    </button>
                </div>

                <label className="mb-1 block text-xs uppercase tracking-wide text-text">
                    {t('settings.provider')}
                </label>
                <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as LocalProviderKind)}
                    className={`${field} mb-4`}
                >
                    <option value="ollama">{t('settings.ollama')}</option>
                    <option value="openai-compatible">{t('settings.openaiCompatible')}</option>
                </select>

                <label className="mb-1 block text-xs uppercase tracking-wide text-text">
                    {t('settings.baseUrl')}
                </label>
                <input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={
                        kind === 'ollama'
                            ? t('settings.baseUrlOllama')
                            : t('settings.baseUrlOpenai')
                    }
                    className={`${field} mb-4`}
                />

                <label className="mb-1 block text-xs uppercase tracking-wide text-text">
                    {t('settings.apiKey')}
                </label>
                <input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    type="password"
                    placeholder={t('settings.apiKeyPlaceholder')}
                    className={`${field} mb-6`}
                />

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={save} disabled={saving}>
                        {saving ? t('settings.saving') : t('settings.saveDetect')}
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
}

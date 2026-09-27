import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
    AppSettings,
    AuthSession,
    FeatureId,
    LocalProviderKind,
    UnifiedModel,
} from '@shared/types';
import { useModels, usePlan } from '@/hooks/useModels';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ChatPanel } from './ChatPanel';
import { PrdBuilderView } from './PrdBuilderView';
import { MinutesView } from './MinutesView';
import { StudyView } from './StudyView';
import { RoastView } from './RoastView';
import { SettingsPanel } from './SettingsPanel';

interface Props {
    session: AuthSession;
    settings: AppSettings;
    onSaveSettings: (next: AppSettings) => Promise<void>;
    onLogout: () => void;
}

const TITLES: Record<FeatureId, string> = {
    chat: 'AI Chat',
    'prd-builder': 'PRD Builder',
    minutes: 'Minutes',
    study: 'Study',
    'linkedin-roast': 'LinkedIn Roast',
    'ig-roast': 'Instagram Roast',
    'tiktok-roast': 'TikTok Roast',
};

/**
 * App shell — the desktop mirror of the web `MainLayout`. Renders the floating
 * capsule sidebar, a shared top bar, and the active feature view.
 */
export function MainLayout({ session, settings, onSaveSettings, onLogout }: Props): JSX.Element {
    const { models, local, refreshLocal } = useModels(true, settings);
    const plan = usePlan(true);
    const [feature, setFeature] = useState<FeatureId>('chat');
    const [selected, setSelected] = useState<UnifiedModel | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if (selected || models.length === 0) return;
        const preferred = models.find((m) => m.source === 'local') ?? models[0];
        setSelected(preferred);
    }, [models, selected]);

    const probe = (kind: LocalProviderKind, baseUrl: string, apiKey?: string): Promise<void> =>
        refreshLocal(kind, baseUrl, apiKey);

    return (
        <div className="flex h-full flex-col bg-bg">
            <Sidebar active={feature} onSelect={setFeature} />

            {/* Offset content to leave room for the floating capsule sidebar */}
            <div className="flex h-full flex-col md:pl-24">
                <TopBar
                    session={session}
                    plan={plan}
                    title={TITLES[feature]}
                    onOpenSettings={() => setShowSettings(true)}
                    onLogout={onLogout}
                />

                <div className="min-h-0 flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={feature}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full"
                        >
                            {feature === 'chat' && (
                                <ChatPanel
                                    models={models}
                                    selected={selected}
                                    onSelect={setSelected}
                                    localReachable={Boolean(local?.reachable)}
                                    localKind={settings.localProvider.kind}
                                    localBaseUrl={settings.localProvider.baseUrl}
                                    onRefreshLocal={probe}
                                    onCloudUsed={plan.refresh}
                                />
                            )}
                            {feature === 'prd-builder' && (
                                <PrdBuilderView
                                    models={models}
                                    selected={selected}
                                    onSelect={setSelected}
                                />
                            )}
                            {feature === 'minutes' && (
                                <MinutesView
                                    models={models}
                                    selected={selected}
                                    onSelect={setSelected}
                                />
                            )}
                            {feature === 'study' && (
                                <StudyView
                                    models={models}
                                    selected={selected}
                                    onSelect={setSelected}
                                />
                            )}
                            {(feature === 'linkedin-roast' ||
                                feature === 'ig-roast' ||
                                feature === 'tiktok-roast') && (
                                <RoastView
                                    feature={feature}
                                    models={models}
                                    selected={selected}
                                    onSelect={setSelected}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <AnimatePresence>
                {showSettings && (
                    <SettingsPanel
                        settings={settings}
                        onSave={onSaveSettings}
                        onProbe={probe}
                        onClose={() => setShowSettings(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

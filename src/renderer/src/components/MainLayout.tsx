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
import { Navbar } from './Navbar';
import { ChatPanel } from './ChatPanel';
import { PrdBuilderView } from './PrdBuilderView';
import { MinutesView } from './MinutesView';
import { StudyView } from './StudyView';
import { RoastView } from './RoastView';
import { SettingsPanel } from './SettingsPanel';
import { ProfileView } from './ProfileView';

interface Props {
    session: AuthSession;
    settings: AppSettings;
    onSaveSettings: (next: AppSettings) => Promise<void>;
    onLogout: () => void;
}

/** A view is either one of the features or the full-screen Profile page. */
type View = FeatureId | 'profile';

/**
 * App shell — the desktop mirror of the web `MainLayout`. Renders the floating
 * capsule sidebar for feature navigation, the floating pill navbar (brand,
 * credits, avatar menu), and the active feature or profile view.
 */
export function MainLayout({ session, settings, onSaveSettings, onLogout }: Props): JSX.Element {
    const { models, refreshLocal } = useModels(true, settings);
    const plan = usePlan(true);
    const [view, setView] = useState<View>('chat');
    const [selected, setSelected] = useState<UnifiedModel | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        if (selected || models.length === 0) return;
        const preferred = models.find((m) => m.id === settings.defaultModelId);
        const fallback = models.find((m) => m.source === 'local') ?? models[0];
        setSelected(preferred ?? fallback);
    }, [models, selected, settings.defaultModelId]);

    const probe = (kind: LocalProviderKind, baseUrl: string, apiKey?: string): Promise<void> =>
        refreshLocal(kind, baseUrl, apiKey);

    const isProfile = view === 'profile';

    return (
        <div className="flex h-full flex-col bg-bg">
            {!isProfile && <Sidebar active={view as FeatureId} onSelect={setView} />}

            <Navbar
                session={session}
                plan={plan}
                models={models}
                selected={selected}
                onSelectModel={setSelected}
                onOpenProfile={() => setView('profile')}
                onOpenSettings={() => setShowSettings(true)}
                onLogout={onLogout}
            />

            <div className={`flex h-full flex-col ${isProfile ? '' : 'md:pl-24'}`}>
                <div className={`min-h-0 flex-1 ${isProfile ? '' : 'pt-16'}`}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full"
                        >
                            {view === 'profile' && (
                                <ProfileView
                                    session={session}
                                    settings={settings}
                                    models={models}
                                    selected={selected}
                                    onSelectModel={setSelected}
                                    onSaveSettings={onSaveSettings}
                                    onProbe={probe}
                                    plan={plan}
                                    onClose={() => setView('chat')}
                                />
                            )}
                            {view === 'chat' && (
                                <ChatPanel
                                    models={models}
                                    selected={selected}
                                    onCloudUsed={plan.refresh}
                                    autoSave={settings.autoSaveSessions}
                                />
                            )}
                            {view === 'prd-builder' && (
                                <PrdBuilderView
                                    models={models}
                                    selected={selected}
                                    autoSave={settings.autoSaveSessions}
                                />
                            )}
                            {view === 'minutes' && (
                                <MinutesView
                                    selected={selected}
                                    autoSave={settings.autoSaveSessions}
                                />
                            )}
                            {view === 'study' && (
                                <StudyView
                                    selected={selected}
                                    autoSave={settings.autoSaveSessions}
                                />
                            )}
                            {(view === 'linkedin-roast' ||
                                view === 'ig-roast' ||
                                view === 'tiktok-roast') && (
                                <RoastView feature={view} selected={selected} />
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

import { useState } from 'react';
import { TbBrandLinkedin, TbBrandInstagram, TbBrandTiktok } from 'react-icons/tb';
import type { IconType } from 'react-icons';
import type { FeatureId, UnifiedModel } from '@shared/types';
import { useFeatureStream } from '@/hooks/useFeatureStream';
import { Composer } from './Composer';
import { OutputPanel } from './OutputPanel';
import FeatureHero from './FeatureHero';
import { useLanguage } from '@/context/useLanguage';

interface Props {
    feature: Extract<FeatureId, 'linkedin-roast' | 'ig-roast' | 'tiktok-roast'>;
    selected: UnifiedModel | null;
}

interface Meta {
    path: string;
    titleKey: string;
    icon: IconType;
    placeholderKey: string;
    hintKey: string;
}

const META: Record<Props['feature'], Meta> = {
    'linkedin-roast': {
        path: '/ai/linkedin-roast',
        titleKey: 'roast.linkedinTitle',
        icon: TbBrandLinkedin,
        placeholderKey: 'roast.linkedinPlaceholder',
        hintKey: 'roast.linkedinHint',
    },
    'ig-roast': {
        path: '/ai/ig-roast',
        titleKey: 'roast.instagramTitle',
        icon: TbBrandInstagram,
        placeholderKey: 'roast.instagramPlaceholder',
        hintKey: 'roast.instagramHint',
    },
    'tiktok-roast': {
        path: '/ai/tiktok-roast',
        titleKey: 'roast.tiktokTitle',
        icon: TbBrandTiktok,
        placeholderKey: 'roast.tiktokPlaceholder',
        hintKey: 'roast.tiktokHint',
    },
};

/**
 * Roast view — one component serves LinkedIn, Instagram and TikTok, matching
 * the web app's `/ai/*-roast` endpoints (which stream a roast + optimisation).
 */
export function RoastView({ feature, selected }: Props): JSX.Element {
    const { t } = useLanguage();
    const stream = useFeatureStream();
    const [input, setInput] = useState('');
    const meta = META[feature];
    const Icon = meta.icon;

    const submit = async (): Promise<void> => {
        const text = input.trim();
        if (!text || !selected) return;
        await stream.run({
            path: meta.path,
            model: selected.id,
            fields: { input: text },
        });
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-2.5">
                <span className="text-xs text-text">{t(meta.hintKey)}</span>
            </div>

            <main className="flex-1 overflow-y-auto px-5">
                {stream.content || stream.error ? (
                    <OutputPanel
                        content={stream.content}
                        streaming={stream.streaming}
                        error={stream.error}
                        emptyHint={
                            <>
                                <Icon className="mb-2 h-8 w-8 text-accent" />
                                {t(meta.placeholderKey)}
                            </>
                        }
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                        <FeatureHero
                            icon={Icon}
                            title={t(meta.titleKey)}
                            description={t(meta.hintKey)}
                        />
                    </div>
                )}
            </main>

            <footer className="border-t border-border px-5 py-4">
                <Composer
                    value={input}
                    onChange={setInput}
                    onSubmit={() => void submit()}
                    onStop={stream.stop}
                    streaming={stream.streaming}
                    placeholder={t(meta.placeholderKey)}
                    hint={`${t(meta.titleKey)} · ${t('roast.enterToSend')}`}
                />
            </footer>
        </div>
    );
}

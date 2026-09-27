import { useState } from 'react';
import { TbBrandLinkedin, TbBrandInstagram, TbBrandTiktok } from 'react-icons/tb';
import type { IconType } from 'react-icons';
import type { FeatureId, UnifiedModel } from '@shared/types';
import { useFeatureStream } from '@/hooks/useFeatureStream';
import { ModelPicker } from './ModelPicker';
import { Composer } from './Composer';
import { OutputPanel } from './OutputPanel';
import FeatureHero from './FeatureHero';

interface Props {
    feature: Extract<FeatureId, 'linkedin-roast' | 'ig-roast' | 'tiktok-roast'>;
    models: UnifiedModel[];
    selected: UnifiedModel | null;
    onSelect: (model: UnifiedModel) => void;
}

interface Meta {
    path: string;
    title: string;
    icon: IconType;
    placeholder: string;
    hint: string;
}

const META: Record<Props['feature'], Meta> = {
    'linkedin-roast': {
        path: '/ai/linkedin-roast',
        title: 'LinkedIn Roast',
        icon: TbBrandLinkedin,
        placeholder: 'Paste your LinkedIn “About” or résumé text…',
        hint: 'Get a brutally honest roast plus recruiter-ready rewrites.',
    },
    'ig-roast': {
        path: '/ai/ig-roast',
        title: 'Instagram Roast',
        icon: TbBrandInstagram,
        placeholder: 'Paste your IG bio / caption…',
        hint: 'Roast your Instagram presence and get optimised copy.',
    },
    'tiktok-roast': {
        path: '/ai/tiktok-roast',
        title: 'TikTok Roast',
        icon: TbBrandTiktok,
        placeholder: 'Paste your TikTok bio / script…',
        hint: 'Roast your TikTok profile and get higher-converting copy.',
    },
};

/**
 * Roast view — one component serves LinkedIn, Instagram and TikTok, matching
 * the web app's `/ai/*-roast` endpoints (which stream a roast + optimisation).
 */
export function RoastView({ feature, models, selected, onSelect }: Props): JSX.Element {
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
                <ModelPicker models={models} selected={selected} onSelect={onSelect} />
                <span className="text-xs text-text">{meta.hint}</span>
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
                                {meta.placeholder}
                            </>
                        }
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                        <FeatureHero icon={Icon} title={meta.title} description={meta.hint} />
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
                    placeholder={meta.placeholder}
                    hint={`${meta.title} · Enter to send`}
                />
            </footer>
        </div>
    );
}

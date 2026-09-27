import { useState } from 'react';
import { TbMicrophone } from 'react-icons/tb';
import type { UnifiedModel } from '@shared/types';
import { useFeatureStream } from '@/hooks/useFeatureStream';
import { ModelPicker } from './ModelPicker';
import { Composer } from './Composer';
import { OutputPanel } from './OutputPanel';
import FeatureHero from './FeatureHero';

interface Props {
    models: UnifiedModel[];
    selected: UnifiedModel | null;
    onSelect: (model: UnifiedModel) => void;
}

const LANGUAGES = ['auto', 'english', 'indonesian'];

/**
 * Minutes — turns a raw meeting transcript into structured minutes. Mirrors
 * the web app's `/ai/minutes` flow (transcript via prompt, optional language).
 */
export function MinutesView({ models, selected, onSelect }: Props): JSX.Element {
    const stream = useFeatureStream();
    const [input, setInput] = useState('');
    const [language, setLanguage] = useState('auto');

    const submit = async (): Promise<void> => {
        const text = input.trim();
        if (!text || !selected) return;
        await stream.run({
            path: '/ai/minutes',
            model: selected.id,
            fields: { optionalPrompt: text, outputLanguage: language },
        });
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-2.5">
                <ModelPicker models={models} selected={selected} onSelect={onSelect} />
                <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="rounded-xl border border-border bg-[color:var(--surface)] px-3 py-2 text-sm text-text-h outline-none"
                >
                    {LANGUAGES.map((l) => (
                        <option key={l} value={l}>
                            {l}
                        </option>
                    ))}
                </select>
            </div>

            <main className="flex-1 overflow-y-auto px-5">
                {stream.content || stream.error ? (
                    <OutputPanel
                        content={stream.content}
                        streaming={stream.streaming}
                        error={stream.error}
                        emptyHint={
                            <>
                                <TbMicrophone className="mb-2 h-8 w-8 text-accent" />
                                Paste your meeting transcript to generate structured minutes.
                            </>
                        }
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                        <FeatureHero
                            icon={TbMicrophone}
                            title="Minutes"
                            description="Turn a raw meeting transcript into clean, structured minutes with action items and decisions."
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
                    placeholder="Paste the meeting transcript or notes…"
                />
            </footer>
        </div>
    );
}

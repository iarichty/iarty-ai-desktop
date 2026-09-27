import { useState } from 'react';
import { TbBlocks, TbPlus } from 'react-icons/tb';
import type { ChatMessage, UnifiedModel } from '@shared/types';
import { useFeatureStream } from '@/hooks/useFeatureStream';
import { ModelPicker } from './ModelPicker';
import { Composer } from './Composer';
import { OutputPanel } from './OutputPanel';
import { Button } from './Button';

interface Props {
    models: UnifiedModel[];
    selected: UnifiedModel | null;
    onSelect: (model: UnifiedModel) => void;
}

const STEPS: { id: string; label: string; path: string; cta: string }[] = [
    { id: 'refine', label: 'Refine', path: '/ai/prd-builder/refine', cta: 'Refine PRD' },
    { id: 'generate', label: 'Generate', path: '/ai/prd-builder/generate', cta: 'Generate PRD' },
    { id: 'design', label: 'Design', path: '/ai/prd-builder/design', cta: 'Recommend Design' },
    { id: 'suggest', label: 'Suggest', path: '/ai/prd-builder/suggest', cta: 'Get Suggestions' },
];

/**
 * PRD Builder — mirrors the web app's four-stage flow (refine → generate →
 * design → suggest), streaming each stage from its backend endpoint.
 */
export function PrdBuilderView({ models, selected, onSelect }: Props): JSX.Element {
    const stream = useFeatureStream();
    const [step, setStep] = useState(STEPS[0]);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<ChatMessage[]>([]);

    const submit = async (): Promise<void> => {
        const prompt = input.trim();
        if (!prompt || !selected) return;
        const nextHistory: ChatMessage[] = [...history, { role: 'user', content: prompt }];
        setHistory(nextHistory);
        setInput('');
        await stream.run({
            path: step.path,
            model: selected.id,
            history: nextHistory,
            fields: { prompt },
        });
    };

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-2.5">
                <ModelPicker models={models} selected={selected} onSelect={onSelect} />
                <div className="flex items-center gap-1 rounded-xl border border-border bg-[color:var(--surface)] p-1">
                    {STEPS.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setStep(s)}
                            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                                step.id === s.id
                                    ? 'bg-accent text-[color:var(--accent-contrast)]'
                                    : 'text-text hover:text-accent'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <div className="flex-1" />
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        stream.reset();
                        setHistory([]);
                        setInput('');
                    }}
                >
                    <TbPlus className="h-4 w-4" />
                    Reset
                </Button>
            </div>

            {/* Body */}
            <main className="flex-1 overflow-y-auto px-5">
                <OutputPanel
                    content={stream.content}
                    streaming={stream.streaming}
                    error={stream.error}
                    emptyHint={
                        <>
                            <TbBlocks className="mb-2 h-8 w-8 text-accent" />
                            Describe your product idea, then {step.cta.toLowerCase()}.
                        </>
                    }
                />
            </main>

            {/* Composer */}
            <footer className="border-t border-border px-5 py-4">
                <Composer
                    value={input}
                    onChange={setInput}
                    onSubmit={() => void submit()}
                    onStop={stream.stop}
                    streaming={stream.streaming}
                    placeholder="Describe your product, users and goals…"
                    hint={`Stage: ${step.label} · Enter to send`}
                />
            </footer>
        </div>
    );
}

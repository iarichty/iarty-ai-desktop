import { useState } from 'react';
import { TbBook } from 'react-icons/tb';
import type { UnifiedModel } from '@shared/types';
import { useFeatureStream } from '@/hooks/useFeatureStream';
import { ModelPicker } from './ModelPicker';
import { Composer } from './Composer';
import { OutputPanel } from './OutputPanel';

interface Props {
    models: UnifiedModel[];
    selected: UnifiedModel | null;
    onSelect: (model: UnifiedModel) => void;
}

type Mode = 'material' | 'quiz';

const LANGUAGES = ['english', 'indonesian'];

/**
 * Study — summarises study material and generates a quiz. The quiz button uses
 * the material summary as input and streams the generated quiz back.
 */
export function StudyView({ models, selected, onSelect }: Props): JSX.Element {
    const stream = useFeatureStream();
    const [mode, setMode] = useState<Mode>('material');
    const [input, setInput] = useState('');
    const [language, setLanguage] = useState('english');
    const [amount, setAmount] = useState(5);
    const [summary, setSummary] = useState('');

    const submit = async (): Promise<void> => {
        const text = input.trim();
        if (!text || !selected) return;
        if (mode === 'material') {
            setSummary(text);
            await stream.run({
                path: '/ai/study-material',
                model: selected.id,
                fields: { text, language, amount: String(amount) },
            });
        } else {
            await stream.runStudyQuiz({
                summaryText: text,
                language,
                amount,
                model: selected.id,
            });
        }
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-2.5">
                <ModelPicker models={models} selected={selected} onSelect={onSelect} />
                <div className="flex items-center gap-1 rounded-xl border border-border bg-[color:var(--surface)] p-1">
                    {(['material', 'quiz'] as Mode[]).map((m) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m)}
                            className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
                                mode === m
                                    ? 'bg-accent text-[color:var(--accent-contrast)]'
                                    : 'text-text hover:text-accent'
                            }`}
                        >
                            {m === 'material' ? 'Summary' : 'Quiz'}
                        </button>
                    ))}
                </div>
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
                <label className="flex items-center gap-2 text-xs text-text">
                    Questions
                    <input
                        type="number"
                        min={1}
                        max={50}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value) || 1)}
                        className="w-16 rounded-lg border border-border bg-[color:var(--surface)] px-2 py-1 text-text-h outline-none"
                    />
                </label>
                {mode === 'quiz' && summary && (
                    <button
                        type="button"
                        onClick={() => setInput(summary)}
                        className="rounded-lg border border-border px-2 py-1 text-xs text-text hover:text-accent"
                    >
                        Use last summary
                    </button>
                )}
            </div>

            <main className="flex-1 overflow-y-auto px-5">
                <OutputPanel
                    content={stream.content}
                    streaming={stream.streaming}
                    error={stream.error}
                    emptyHint={
                        <>
                            <TbBook className="mb-2 h-8 w-8 text-accent" />
                            {mode === 'material'
                                ? 'Paste study material to get a structured summary.'
                                : 'Paste the material summary to generate a quiz.'}
                        </>
                    }
                />
            </main>

            <footer className="border-t border-border px-5 py-4">
                <Composer
                    value={input}
                    onChange={setInput}
                    onSubmit={() => void submit()}
                    onStop={stream.stop}
                    streaming={stream.streaming}
                    placeholder={
                        mode === 'material'
                            ? 'Paste the text you want summarised…'
                            : 'Paste the summary to quiz yourself on…'
                    }
                />
            </footer>
        </div>
    );
}

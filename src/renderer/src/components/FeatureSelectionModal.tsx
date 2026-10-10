import {
    TbCheck,
    TbFileDescription,
    TbGavel,
    TbHierarchy2,
    TbRestore,
    TbUsers,
} from 'react-icons/tb';
import Modal from './Modal';
import { AI_FEATURES } from '@/data/roles';
import { useLanguage } from '@/context/useLanguage';

interface Props {
    isOpen: boolean;
    currentFeature: string;
    onClose: () => void;
    onSelect: (feature: string) => void;
}

const displayLabel = (feature: string): string =>
    feature
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

function FeatureIcon({ feature }: { feature: string }): JSX.Element {
    if (feature.includes('docx') || feature.includes('cv'))
        return <TbFileDescription className="text-xl" />;
    if (feature === 'humanizer-localizer') return <TbUsers className="text-xl" />;
    if (feature === 'legal-assistant') return <TbGavel className="text-xl" />;
    return <TbHierarchy2 className="text-xl" />;
}

/** Advanced-feature picker, mirroring the web app's `FeatureSelectionModal`. */
export default function FeatureSelectionModal({
    isOpen,
    currentFeature,
    onClose,
    onSelect,
}: Props): JSX.Element {
    const { t } = useLanguage();
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('feature.title')}
            subtitle={t('feature.subtitle')}
            icon={TbHierarchy2}
            accent="text-emerald-500"
        >
            <div className="grid grid-cols-1 gap-3">
                <button
                    onClick={() => {
                        onSelect('');
                        onClose();
                    }}
                    className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                        !currentFeature
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                            : 'border-border hover:border-blue-200 dark:hover:border-blue-800'
                    }`}
                >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--surface-2)]">
                        <TbRestore className="text-text" />
                    </div>
                    <div>
                        <span className="block text-sm font-bold text-text-h">
                            {t('feature.standard')}
                        </span>
                        <span className="text-[10px] text-text">{t('feature.standardDesc')}</span>
                    </div>
                </button>

                <div className="my-2 h-px bg-border" />

                {AI_FEATURES.map((feature) => {
                    const isSelected = currentFeature === feature;
                    return (
                        <button
                            key={feature}
                            onClick={() => {
                                onSelect(feature);
                                onClose();
                            }}
                            className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                                isSelected
                                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20'
                                    : 'border-border hover:border-emerald-200 dark:hover:border-emerald-800'
                            }`}
                        >
                            <div
                                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-all ${
                                    isSelected
                                        ? 'bg-emerald-500 text-white shadow-lg'
                                        : 'bg-blue-50 text-blue-500 dark:bg-blue-900/30'
                                }`}
                            >
                                <FeatureIcon feature={feature} />
                            </div>
                            <div className="flex-1">
                                <span className="block text-sm font-bold text-text-h">
                                    {displayLabel(feature)}
                                </span>
                                <span className="line-clamp-1 text-[10px] text-text">
                                    {t('feature.optimizeFor')} {displayLabel(feature).toLowerCase()}{' '}
                                    {t('feature.tasks')}
                                </span>
                            </div>
                            {isSelected && (
                                <div className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-white shadow-sm">
                                    <TbCheck className="h-3 w-3" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </Modal>
    );
}

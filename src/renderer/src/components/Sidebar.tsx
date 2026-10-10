import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TbSparkles,
    TbBook,
    TbBlocks,
    TbBrandLinkedin,
    TbBrandInstagram,
    TbBrandTiktok,
    TbRobot,
    TbMicrophone,
    TbChevronLeft,
} from 'react-icons/tb';
import type { IconType } from 'react-icons';
import type { FeatureId } from '@shared/types';
import { useLanguage } from '@/context/useLanguage';

interface NavItem {
    id: FeatureId;
    labelKey: string;
    descriptionKey: string;
    icon: IconType;
}

const MENU: NavItem[] = [
    {
        id: 'chat',
        labelKey: 'sidebar.chatLabel',
        descriptionKey: 'sidebar.chatDesc',
        icon: TbRobot,
    },
    {
        id: 'prd-builder',
        labelKey: 'sidebar.prdLabel',
        descriptionKey: 'sidebar.prdDesc',
        icon: TbBlocks,
    },
    {
        id: 'minutes',
        labelKey: 'sidebar.minutesLabel',
        descriptionKey: 'sidebar.minutesDesc',
        icon: TbMicrophone,
    },
    {
        id: 'study',
        labelKey: 'sidebar.studyLabel',
        descriptionKey: 'sidebar.studyDesc',
        icon: TbBook,
    },
    {
        id: 'linkedin-roast',
        labelKey: 'sidebar.linkedinLabel',
        descriptionKey: 'sidebar.roastDesc',
        icon: TbBrandLinkedin,
    },
    {
        id: 'ig-roast',
        labelKey: 'sidebar.instagramLabel',
        descriptionKey: 'sidebar.roastDesc',
        icon: TbBrandInstagram,
    },
    {
        id: 'tiktok-roast',
        labelKey: 'sidebar.tiktokLabel',
        descriptionKey: 'sidebar.roastDesc',
        icon: TbBrandTiktok,
    },
];

interface Props {
    active: FeatureId;
    onSelect: (id: FeatureId) => void;
}

/** Floating capsule sidebar mirroring the IARTY AI web app. */
export function Sidebar({ active, onSelect }: Props): JSX.Element {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);

    // Auto-collapse the mobile drawer when the viewport grows.
    useEffect(() => {
        const onResize = (): void => {
            if (window.innerWidth >= 768) setOpen(false);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
        <>
            <aside
                className={`
                    fixed left-4 top-1/2 z-40 -translate-y-1/2
                    group flex h-fit flex-col gap-6
                    w-19 rounded-[2.5rem] px-3 py-3
                    border border-border bg-[color:var(--surface)]/70 backdrop-blur-2xl
                    shadow-[0_20px_40px_-15px_rgba(0,0,0,0.35)]
                    transition-all duration-500 ease-out hover:w-64
                    overflow-hidden
                    ${open ? 'translate-x-0' : '-translate-x-[150%] md:translate-x-0'}
                `}
            >
                {/* Logo */}
                <div className="flex w-full shrink-0 items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-2 shadow-md">
                        <TbSparkles className="h-6 w-6 text-[color:var(--accent-contrast)]" />
                    </div>
                    <div className="overflow-hidden whitespace-nowrap opacity-0 transition-opacity delay-100 duration-300 group-hover:opacity-100">
                        <h1 className="bg-gradient-to-r from-accent to-transparent bg-clip-text text-2xl font-black text-transparent">
                            {t('sidebar.brand')}
                        </h1>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex w-full flex-col gap-2">
                    {MENU.map((item) => {
                        const Icon = item.icon;
                        const isActive = active === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => {
                                    onSelect(item.id);
                                    setOpen(false);
                                }}
                                className={`
                                    relative flex w-full items-center rounded-full p-2 transition-all duration-300
                                    ${
                                        isActive
                                            ? 'bg-transparent text-accent shadow-lg shadow-accent/30'
                                            : 'text-text hover:bg-[color:var(--surface-2)] hover:text-accent'
                                    }
                                `}
                            >
                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full">
                                    <Icon className="text-[22px]" />
                                </div>
                                <div className="absolute left-14 flex flex-col justify-center overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                    <span className="text-sm font-semibold leading-tight">
                                        {t(item.labelKey)}
                                    </span>
                                    <span
                                        className={`text-[10px] leading-tight ${isActive ? 'text-accent' : 'text-text'}`}
                                    >
                                        {t(item.descriptionKey)}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* Mobile toggle + overlay */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
                    />
                )}
            </AnimatePresence>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="fixed bottom-4 left-4 z-40 grid h-11 w-11 place-items-center rounded-full border border-border bg-[color:var(--surface)] shadow-lg md:hidden"
                aria-label={t('nav.toggleNav')}
            >
                <TbChevronLeft
                    className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
        </>
    );
}

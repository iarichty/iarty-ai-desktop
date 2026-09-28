import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { TbChevronDown, TbUser, TbSettings, TbLogout, TbBolt } from 'react-icons/tb';
import type { IconType } from 'react-icons';
import type { AiPlan, AuthSession, UnifiedModel } from '@shared/types';
import { ThemeToggle } from './ThemeToggle';
import { ModelPicker } from './ModelPicker';
import { Logo } from './Logo';

interface Props {
    session: AuthSession;
    plan: { plan: AiPlan | null; remaining: number | null };
    models: UnifiedModel[];
    selected: UnifiedModel | null;
    onSelectModel: (model: UnifiedModel) => void;
    onOpenProfile: () => void;
    onOpenSettings: () => void;
    onLogout: () => void;
}

/** Id of the slot the active feature portals its session controls into. */
export const NAVBAR_SLOT_ID = 'iarty-navbar-slot';

const initials = (name?: string): string => {
    if (!name) return 'U';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

/**
 * Floating pill navbar mirroring the IARTY AI web app — kept minimal: brand,
 * plan credits, theme toggle and an avatar dropdown (Profile, Settings, Sign
 * out). Feature navigation lives in the sidebar.
 */
export function Navbar({
    session,
    plan,
    models,
    selected,
    onSelectModel,
    onOpenProfile,
    onOpenSettings,
    onLogout,
}: Props): JSX.Element {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent): void => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const planName = useMemo(
        () => (plan.plan && typeof plan.plan.plan === 'string' ? plan.plan.plan : null),
        [plan.plan],
    );

    const user = session.user;

    return (
        <nav className="pointer-events-none fixed right-5 top-4 z-50">
            <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-[color:var(--surface)]/80 p-1.5 shadow-lg backdrop-blur-2xl">
                {/* Brand */}
                <div className="flex items-center gap-2 pl-1.5 pr-1">
                    <Logo size={22} color="var(--text-h)" />
                    <span className="hidden bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-sm font-black tracking-tight text-transparent sm:inline">
                        IARTY
                    </span>
                </div>

                <span className="h-5 w-px bg-border" />

                {/* Model picker (global — every feature uses it) */}
                <ModelPicker models={models} selected={selected} onSelect={onSelectModel} />

                {/* Feature-specific session controls are portaled here. The
                    left divider only appears when this feature has controls. */}
                <div
                    id={NAVBAR_SLOT_ID}
                    className="flex items-center gap-1.5 pl-1.5 ml-1.5 border-l border-border empty:hidden empty:border-l-0 empty:pl-0 empty:ml-0"
                />

                <span className="h-5 w-px bg-border" />

                {/* Credits */}
                {planName && (
                    <div className="flex items-center gap-1.5 rounded-full bg-[color:var(--surface-2)] px-3 py-1.5 text-xs">
                        <TbBolt className="h-3.5 w-3.5 text-accent" />
                        <span className="font-medium capitalize text-accent">{planName}</span>
                        {plan.remaining !== null && (
                            <>
                                <span className="text-text/50">·</span>
                                <span className="text-text-h">{plan.remaining}</span>
                            </>
                        )}
                    </div>
                )}

                <ThemeToggle />

                {/* Avatar + dropdown */}
                <div ref={menuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setMenuOpen((o) => !o)}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-[color:var(--surface-2)] py-1 pl-1 pr-2 transition-colors hover:border-accent/50"
                    >
                        <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-accent-2 text-[11px] font-black text-[color:var(--accent-contrast)]">
                            {user.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                initials(user.name)
                            )}
                        </span>
                        <span className="hidden max-w-[7rem] truncate text-xs font-semibold text-text-h md:inline">
                            {user.name || user.email}
                        </span>
                        <motion.span animate={{ rotate: menuOpen ? 180 : 0 }} className="text-text">
                            <TbChevronDown className="h-3.5 w-3.5" />
                        </motion.span>
                    </button>

                    <AnimatePresence>
                        {menuOpen && (
                            <Dropdown
                                user={user.name || user.email}
                                planName={planName}
                                onProfile={() => {
                                    setMenuOpen(false);
                                    onOpenProfile();
                                }}
                                onSettings={() => {
                                    setMenuOpen(false);
                                    onOpenSettings();
                                }}
                                onLogout={() => {
                                    setMenuOpen(false);
                                    onLogout();
                                }}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </nav>
    );
}

const dropdownVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: -12, rotateX: -15 },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        rotateX: 0,
        transition: { type: 'spring', stiffness: 350, damping: 22, staggerChildren: 0.03 },
    },
};
const itemVariants: Variants = {
    hidden: { opacity: 0, x: -6 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } },
};

function Dropdown({
    user,
    planName,
    onProfile,
    onSettings,
    onLogout,
}: {
    user: string;
    planName: string | null;
    onProfile: () => void;
    onSettings: () => void;
    onLogout: () => void;
}): JSX.Element {
    return (
        <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{ perspective: 1000, transformOrigin: 'top right' }}
            className="absolute right-0 mt-2.5 w-56 origin-top-right overflow-hidden rounded-2xl border border-border bg-[color:var(--surface)]/95 p-1.5 shadow-2xl backdrop-blur-xl"
        >
            <div className="border-b border-border/60 px-3 py-2">
                <div className="truncate text-xs font-bold text-text-h">{user}</div>
                {planName && (
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        <TbBolt className="h-3 w-3" />
                        {planName} plan
                    </div>
                )}
            </div>

            <div className="mt-1 flex flex-col gap-0.5">
                <MenuItem icon={TbUser} label="Profile & models" onClick={onProfile} />
                <MenuItem icon={TbSettings} label="Provider settings" onClick={onSettings} />
            </div>

            <div className="my-1 h-px bg-border/60" />

            <MenuItem icon={TbLogout} label="Sign out" onClick={onLogout} danger />
        </motion.div>
    );
}

function MenuItem({
    icon: Icon,
    label,
    onClick,
    danger,
}: {
    icon: IconType;
    label: string;
    onClick: () => void;
    danger?: boolean;
}): JSX.Element {
    return (
        <motion.button
            variants={itemVariants}
            type="button"
            onClick={onClick}
            whileHover={{ x: 2 }}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                danger
                    ? 'text-red-500 hover:bg-red-500/10'
                    : 'text-text-h hover:bg-[color:var(--surface-2)]'
            }`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </motion.button>
    );
}

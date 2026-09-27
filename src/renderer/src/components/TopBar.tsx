import type { ReactNode } from 'react';
import { TbSettings, TbLogout } from 'react-icons/tb';
import type { AiPlan, AuthSession } from '@shared/types';
import { CreditBadge } from './CreditBadge';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './Button';
import { Logo } from './Logo';

interface Props {
    session: AuthSession;
    plan: { plan: AiPlan | null; remaining: number | null };
    title: string;
    subtitle?: string;
    children?: ReactNode;
    onOpenSettings: () => void;
    onLogout: () => void;
}

/** Shared app header: brand + account on the left, tools on the right. */
export function TopBar({
    session,
    plan,
    title,
    subtitle,
    children,
    onOpenSettings,
    onLogout,
}: Props): JSX.Element {
    return (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent/60 shadow-lg shadow-accent/20">
                    <Logo size={20} color="var(--accent-contrast)" />
                </div>
                <div className="min-w-0 leading-tight">
                    <div className="truncate text-sm font-semibold text-text-h">{title}</div>
                    <div className="truncate text-xs text-text">{subtitle ?? session.user.email}</div>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                {children}
                <CreditBadge plan={plan.plan} remaining={plan.remaining} />
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={onOpenSettings}>
                    <TbSettings className="h-4 w-4" />
                    Settings
                </Button>
                <Button variant="ghost" size="sm" onClick={onLogout}>
                    <TbLogout className="h-4 w-4" />
                    Sign out
                </Button>
            </div>
        </header>
    );
}

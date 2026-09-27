import { motion } from 'framer-motion';
import { TbBolt } from 'react-icons/tb';
import type { AiPlan } from '@shared/types';

interface Props {
    plan: AiPlan | null;
    remaining: number | null;
}

/** Compact pill showing the plan name and remaining cloud credits. */
export function CreditBadge({ plan, remaining }: Props): JSX.Element | null {
    if (!plan) return null;
    const planName = typeof plan.plan === 'string' ? plan.plan : 'free';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 rounded-full border border-border bg-[color:var(--surface)] px-3 py-1 text-xs"
        >
            <TbBolt className="h-3.5 w-3.5 text-accent" />
            <span className="font-medium capitalize text-accent">{planName}</span>
            <span className="text-text/50">·</span>
            <span className="text-text-h">
                {remaining !== null ? `${remaining} credits` : '—'}
            </span>
        </motion.div>
    );
}

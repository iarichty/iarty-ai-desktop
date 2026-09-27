import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

type Variant = 'primary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface Props {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: Variant;
    size?: Size;
    className?: string;
    type?: 'button' | 'submit';
    'aria-busy'?: boolean;
}

const VARIANTS: Record<Variant, string> = {
    primary:
        'bg-accent text-[color:var(--accent-contrast)] hover:opacity-90 shadow-lg shadow-accent/25',
    ghost: 'bg-[color:var(--surface-2)] text-text-h hover:bg-[color:var(--border)]',
    outline: 'border border-border text-text-h hover:border-accent hover:text-accent bg-transparent',
    danger: 'bg-red-500/90 text-white hover:bg-red-500',
};

const SIZES: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
};

export function Button({
    children,
    onClick,
    disabled,
    variant = 'primary',
    size = 'md',
    className = '',
    type = 'button',
    'aria-busy': ariaBusy,
}: Props): JSX.Element {
    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled}
            aria-busy={ariaBusy}
            whileTap={{ scale: disabled ? 1 : 0.96 }}
            whileHover={{ y: disabled ? 0 : -1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
        >
            {children}
        </motion.button>
    );
}

/**
 * IARTY logo — the diamond glyph with a centred square.
 * Inline SVG so it scales crisply and can be tinted via the `color` prop.
 */
interface Props {
    size?: number;
    color?: string;
    className?: string;
}

export function Logo({ size = 32, color = 'currentColor', className }: Props): JSX.Element {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 1024 1024"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            role="img"
            aria-label="IARTY"
        >
            <path d="M512 156 L 596 240 L 372 464 L 596 688 L 512 772 L 204 464 Z" fill={color} />
            <path
                d="M660 304 L 728 372 L 860 504 L 620 744 L 552 676 L 724 504 Z"
                fill={color}
            />
            <rect x="442" y="442" width="140" height="140" fill={color} />
        </svg>
    );
}

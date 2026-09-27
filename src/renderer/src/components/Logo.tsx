/**
 * IARTY logo — a diamond formed by two mirrored chevron strokes with a filled
 * square at the centre. Inline SVG so it scales crisply and can be tinted via
 * the `color` prop.
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
            <path
                d="M512 168 L 168 512 L 512 856 L 594 774 L 332 512 L 594 250 Z"
                fill={color}
            />
            <path
                d="M636 292 L 554 374 L 690 510 L 554 646 L 636 728 L 854 510 Z"
                fill={color}
            />
            <rect x="450" y="450" width="124" height="124" fill={color} />
        </svg>
    );
}

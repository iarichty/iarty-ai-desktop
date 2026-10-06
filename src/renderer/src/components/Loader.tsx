import type { CSSProperties } from 'react';

interface Props {
    /** Tailwind / custom classes for sizing & color (color comes from `currentColor`). */
    className?: string;
    /** Inline style passthrough. */
    style?: CSSProperties;
    /** Accessible label; when omitted the svg is hidden from a11y tree. */
    label?: string;
}

/**
 * Animated IARTY brand logo loader.
 *
 * Colour is inherited via `currentColor`, so set it with e.g. `text-accent`.
 * Sizing comes from width/height utility classes.
 */
function Loader({ className = '', style, label }: Props): JSX.Element {
    return (
        <svg
            viewBox="-80 -80 1184 1184"
            role={label ? 'img' : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
            className={`iarty-loader ${className}`}
            style={style}
        >
            {label ? <title>{label}</title> : null}
            <style>
                {`
                    .iarty-loader .p {
                        fill: currentColor;
                        transform-box: fill-box;
                        transform-origin: center;
                        animation-duration: 2.4s;
                        animation-iteration-count: infinite;
                        animation-timing-function: cubic-bezier(.65,0,.35,1);
                    }
                    .iarty-loader .l { animation-name: iarty-left; }
                    .iarty-loader .r { animation-name: iarty-right; }
                    .iarty-loader .c { animation-name: iarty-core; }

                    @keyframes iarty-left {
                        0%   { transform: translateX(-70px); opacity: 0; }
                        30%  { transform: translateX(0);     opacity: 1; }
                        70%  { transform: translateX(0);     opacity: 1; }
                        100% { transform: translateX(-70px); opacity: 0; }
                    }
                    @keyframes iarty-right {
                        0%   { transform: translateX(70px);  opacity: 0; }
                        30%  { transform: translateX(0);     opacity: 1; }
                        70%  { transform: translateX(0);     opacity: 1; }
                        100% { transform: translateX(70px);  opacity: 0; }
                    }
                    @keyframes iarty-core {
                        0%   { transform: scale(0) rotate(-90deg);  opacity: 0; }
                        30%  { transform: scale(0) rotate(-90deg);  opacity: 0; }
                        45%  { transform: scale(1.25) rotate(0deg); opacity: 1; }
                        55%  { transform: scale(1) rotate(0deg);    opacity: 1; }
                        70%  { transform: scale(1) rotate(0deg);    opacity: 1; }
                        100% { transform: scale(0) rotate(90deg);   opacity: 0; }
                    }

                    @media (prefers-reduced-motion: reduce) {
                        .iarty-loader .p { animation: none; }
                    }
                `}
            </style>
            {/* left shape */}
            <path
                className="p l"
                d="M 523.13 -0.56 L 635.4 111.72 L 228.69 518.43 L 616.78 906.53 L 499.81 1023.5 L -0.56 523.13 Z"
            />
            {/* right shape */}
            <path
                className="p r"
                d="M 717.03 193.34 L 1023.51 499.82 L 703.11 820.21 L 590.74 707.84 L 794.16 504.41 L 600.06 310.31 Z"
            />
            {/* center square */}
            <path className="p c" d="M 428.66 432 L 594.11 432 L 594.11 590.73 L 428.66 590.73 Z" />
        </svg>
    );
}

export default Loader;

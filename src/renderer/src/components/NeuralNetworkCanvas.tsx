import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface Props {
    className?: string;
    particleColor?: string;
    lineColor?: string;
    pulseColor?: string;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    baseRadius: number;
    pulse: number;
    pulseSpeed: number;
}

interface Signal {
    from: number;
    to: number;
    progress: number;
    speed: number;
    color: string;
}

/**
 * Animated neural-network backdrop (particles + travelling signals), ported
 * verbatim from the web app so the empty chat state looks identical. Draws onto
 * a canvas sized to its parent element and honours the active theme colours.
 */
export default function NeuralNetworkCanvas({
    className = '',
    particleColor,
    lineColor,
    pulseColor,
}: Props): JSX.Element {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const { theme } = useTheme();

    const activeParticleColor =
        particleColor || (theme === 'dark' ? 'rgba(99, 102, 241, ' : 'rgba(59, 130, 246, ');
    const activeLineColor =
        lineColor || (theme === 'dark' ? 'rgba(129, 140, 248, ' : 'rgba(96, 165, 250, ');
    const activePulseColor =
        pulseColor || (theme === 'dark' ? 'rgba(165, 180, 252, ' : 'rgba(37, 99, 235, ');

    useEffect(() => {
        const checkMobile = (): void => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId = 0;
        let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth / 2);
        let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

        let particles: Particle[] = [];
        const signals: Signal[] = [];

        const initParticles = (): void => {
            particles = [];
            const densityDivider = isMobile ? 22000 : 11000;
            const count = Math.max(
                isMobile ? 18 : 35,
                Math.floor((width * height) / densityDivider),
            );
            for (let i = 0; i < count; i++) {
                const radius = Math.random() * 2 + 1.5;
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * (isMobile ? 0.25 : 0.4),
                    vy: (Math.random() - 0.5) * (isMobile ? 0.25 : 0.4),
                    radius,
                    baseRadius: radius,
                    pulse: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.02 + Math.random() * 0.03,
                });
            }
        };

        const handleResize = (): void => {
            if (!canvas || !canvas.parentElement) return;
            width = canvas.width = canvas.parentElement.clientWidth;
            height = canvas.height = canvas.parentElement.clientHeight;
            initParticles();
        };

        window.addEventListener('resize', handleResize);
        initParticles();

        const maxDistance = isMobile ? 100 : 140;
        const maxSignals = isMobile ? 6 : 18;

        const animate = (): void => {
            ctx.clearRect(0, 0, width, height);

            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;
                p.pulse += p.pulseSpeed;
            });

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const p1 = particles[i];
                    const p2 = particles[j];
                    const dx = p1.x - p2.x;
                    const dy = p1.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < maxDistance) {
                        const alpha = (1 - dist / maxDistance) * (isMobile ? 0.25 : 0.35);
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = `${activeLineColor}${alpha})`;
                        ctx.lineWidth = 1;
                        ctx.stroke();

                        if (
                            Math.random() < (isMobile ? 0.0008 : 0.0015) &&
                            signals.length < maxSignals
                        ) {
                            signals.push({
                                from: i,
                                to: j,
                                progress: 0,
                                speed: 0.008 + Math.random() * 0.012,
                                color: activePulseColor,
                            });
                        }
                    }
                }
            }

            for (let k = signals.length - 1; k >= 0; k--) {
                const sig = signals[k];
                const p1 = particles[sig.from];
                const p2 = particles[sig.to];
                if (!p1 || !p2) {
                    signals.splice(k, 1);
                    continue;
                }
                sig.progress += sig.speed;
                if (sig.progress >= 1) {
                    signals.splice(k, 1);
                    continue;
                }
                const sx = p1.x + (p2.x - p1.x) * sig.progress;
                const sy = p1.y + (p2.y - p1.y) * sig.progress;
                ctx.beginPath();
                ctx.arc(sx, sy, 3, 0, Math.PI * 2);
                ctx.fillStyle = `${sig.color}0.9)`;
                ctx.fill();
            }

            particles.forEach((p) => {
                const currentRadius = p.baseRadius + Math.sin(p.pulse) * 0.8;
                const alpha = 0.5 + Math.sin(p.pulse) * 0.3;
                ctx.beginPath();
                ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = `${activeParticleColor}${alpha})`;
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [activeParticleColor, activeLineColor, activePulseColor, isMobile]);

    return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 ${className}`} />;
}

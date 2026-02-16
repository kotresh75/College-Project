import React, { useRef, useEffect, useState, useCallback } from 'react';
import '../../styles/components/logo-particles.css';

/**
 * LogoParticles — Canvas-based particle burst from the logo, then text reveal.
 *
 * Props:
 *   logoSrc   – image source for the logo
 *   title     – main heading text (required)
 *   subtitle  – optional sub-heading text
 *   compact   – if true, uses fewer particles and smaller canvas (for login/setup cards)
 *   titleIcon – optional React node rendered before the title text
 */
const LogoParticles = ({ logoSrc, title, subtitle, compact = false, titleIcon, hideLogo = false }) => {
    const canvasRef = useRef(null);
    const wrapperRef = useRef(null);
    const animFrameRef = useRef(null);
    const [revealed, setRevealed] = useState(false);
    const [canvasDone, setCanvasDone] = useState(false);

    const createParticles = useCallback((cx, cy, count) => {
        const particles = [];
        // Accent colours that match the CSS gradient
        const colors = [
            'rgba(102,126,234,', // #667eea
            'rgba(118,75,162,',  // #764ba2
            'rgba(161,140,209,', // #a18cd1
            'rgba(48,207,208,',  // #30cfd0
            'rgba(251,194,235,', // #fbc2eb
        ];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * (compact ? 2.5 : 4);
            const size = 2 + Math.random() * (compact ? 3 : 5);
            particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size,
                alpha: 0.8 + Math.random() * 0.2,
                decay: 0.012 + Math.random() * 0.012,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
        return particles;
    }, [compact]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = wrapper.getBoundingClientRect();
        const w = rect.width;
        const h = compact ? 100 : 140;

        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.scale(dpr, dpr);

        const cx = w / 2;
        const cy = h / 2;
        const count = compact ? 35 : 55;
        const particles = createParticles(cx, cy, count);

        let frame = 0;
        const maxFrames = 120; // ~2 seconds at 60fps

        // Trigger text reveal after ~0.6s
        const revealTimeout = setTimeout(() => setRevealed(true), 600);

        const animate = () => {
            frame++;
            ctx.clearRect(0, 0, w, h);

            let alive = 0;
            for (const p of particles) {
                if (p.alpha <= 0) continue;
                alive++;
                p.x += p.vx;
                p.y += p.vy;
                p.vx *= 0.98; // friction
                p.vy *= 0.98;
                p.alpha -= p.decay;
                if (p.alpha < 0) p.alpha = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `${p.color}${p.alpha.toFixed(2)})`;
                ctx.fill();
            }

            if (alive > 0 && frame < maxFrames) {
                animFrameRef.current = requestAnimationFrame(animate);
            } else {
                setCanvasDone(true);
            }
        };

        // Small initial delay so the panel bounceIn lands first
        const startTimeout = setTimeout(() => {
            animFrameRef.current = requestAnimationFrame(animate);
        }, 350);

        return () => {
            clearTimeout(revealTimeout);
            clearTimeout(startTimeout);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [compact, createParticles]);

    return (
        <div className={`logo-particles-wrapper ${compact ? 'compact' : ''}`} ref={wrapperRef}>
            {/* Logo */}
            {!hideLogo && (
                <img
                    src={logoSrc}
                    alt="Logo"
                    className={`lp-logo ${compact ? 'login-logo' : 'college-logo'} ${revealed ? 'lp-logo-glow' : ''}`}
                />
            )}

            {/* Canvas overlay for particles — hidden once done */}
            <canvas
                ref={canvasRef}
                className="lp-canvas"
                style={{ display: canvasDone ? 'none' : 'block' }}
            />

            {/* Title text — revealed after particles spread */}
            <div className={`lp-text ${revealed ? 'lp-text-visible' : ''}`}>
                <h2 className={compact ? 'login-title' : 'hero-title'}>
                    {titleIcon && <span className="lp-title-icon">{titleIcon}</span>}
                    {title}
                </h2>
                {subtitle && (
                    <p className={compact ? 'login-subtitle' : 'hero-subtitle-gradient'}>
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
};

export default LogoParticles;

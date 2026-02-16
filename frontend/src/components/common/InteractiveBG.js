import React, { useRef, useEffect, useCallback } from 'react';
import '../../styles/components/interactive-bg.css';

/**
 * InteractiveBG — A canvas-based interactive floating particle background.
 * Particles drift lazily, react to mouse hover (repel gently), and
 * connect with nearby particles via faint lines. Matches app theme colours.
 *
 * Designed as a drop-in replacement for the static `.gradient-bg` div.
 */
const InteractiveBG = () => {
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    const particlesRef = useRef([]);

    const getThemeColors = useCallback(() => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            return {
                particles: [
                    'rgba(48,207,208,',   // #30cfd0 cyan
                    'rgba(161,140,209,',  // #a18cd1 lavender
                    'rgba(51,8,103,',     // #330867 deep purple
                    'rgba(102,126,234,',  // #667eea indigo
                    'rgba(251,194,235,',  // #fbc2eb pink
                ],
                line: 'rgba(48,207,208,',
                bg: '#0f0c29',
            };
        }
        return {
            particles: [
                'rgba(102,126,234,',  // #667eea
                'rgba(118,75,162,',   // #764ba2
                'rgba(255,154,158,',  // #FF9A9E
                'rgba(254,207,239,',  // #FECFEF
                'rgba(161,140,209,',  // #a18cd1
            ],
            line: 'rgba(102,126,234,',
            bg: '#f0f4f8',
        };
    }, []);

    const initParticles = useCallback((w, h) => {
        const count = Math.min(60, Math.floor((w * h) / 18000));
        const colors = getThemeColors().particles;
        const particles = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.6,
                size: 2 + Math.random() * 3,
                alpha: 0.15 + Math.random() * 0.35,
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
        return particles;
    }, [getThemeColors]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        let w, h;
        const resize = () => {
            const parent = canvas.parentElement;
            w = parent ? parent.offsetWidth : window.innerWidth;
            h = parent ? parent.offsetHeight : window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            particlesRef.current = initParticles(w, h);
        };
        resize();

        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        const handleMouseLeave = () => {
            mouseRef.current = { x: -1000, y: -1000 };
        };

        window.addEventListener('resize', resize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        const connectDist = 140;
        const mouseRadius = 120;

        const animate = () => {
            const { bg, line } = getThemeColors();
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, w, h);

            const particles = particlesRef.current;
            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;

            for (const p of particles) {
                // Mouse repulsion
                const dx = p.x - mx;
                const dy = p.y - my;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < mouseRadius && dist > 0) {
                    const force = (mouseRadius - dist) / mouseRadius * 0.8;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }

                // Friction + drift
                p.vx *= 0.98;
                p.vy *= 0.98;
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges
                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10;
                if (p.y > h + 10) p.y = -10;

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `${p.color}${p.alpha.toFixed(2)})`;
                ctx.fill();
            }

            // Draw connecting lines
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < connectDist) {
                        const alpha = (1 - dist / connectDist) * 0.15;
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `${line}${alpha.toFixed(2)})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }

            animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [initParticles, getThemeColors]);

    return <canvas ref={canvasRef} className="interactive-bg" />;
};

export default InteractiveBG;

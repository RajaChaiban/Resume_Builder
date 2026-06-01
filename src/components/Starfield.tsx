// Lightweight ambient particle field on a <canvas>. Pure 2D, cheap, and it
// degrades gracefully — it's decoration, never a gate.
import { useEffect, useRef } from 'react';

export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    type Star = { x: number; y: number; z: number; r: number; hue: number };
    let stars: Star[] = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const count = Math.min(160, Math.floor((w * h) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 1 + 0.3,
        r: Math.random() * 1.4 + 0.3,
        hue: Math.random() > 0.7 ? 268 : 190, // violet vs cyan
      }));
    };

    let t = 0;
    const draw = () => {
      t += 0.005;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.y += s.z * 0.12;
        if (s.y > h) s.y = 0;
        const twinkle = 0.5 + 0.5 * Math.sin(t * 3 + s.x);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 100%, 75%, ${0.15 + twinkle * 0.5 * s.z})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `hsla(${s.hue}, 100%, 70%, 0.8)`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

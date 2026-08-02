import React, { useEffect, useRef } from 'react';
import { LiveType } from '../types';

interface Props {
  isLive?: boolean;
  liveType?: LiveType;
  videoUrl?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const LiveWallpaperCanvas: React.FC<Props> = ({
  isLive,
  liveType = 'aurora',
  videoUrl,
  className = '',
  style,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isLive || liveType === 'video') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Initial setup for specific live wallpaper types
    let time = 0;

    // Particles setup
    const particles: Array<{ x: number; y: number; size: number; speedY: number; speedX: number; alpha: number }> = [];
    if (liveType === 'particles') {
      for (let i = 0; i < 70; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2.5 + 0.5,
          speedY: -(Math.random() * 0.4 + 0.1),
          speedX: (Math.random() - 0.5) * 0.2,
          alpha: Math.random() * 0.8 + 0.2,
        });
      }
    }

    // Matrix setup
    const matrixChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@%&*';
    const fontSize = 14;
    const columns = Math.floor(width / fontSize) + 1;
    const drops: number[] = new Array(columns).fill(1);

    const render = () => {
      time += 0.015;

      if (liveType === 'aurora') {
        // Aurora Wave Effect
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#030712');
        grad.addColorStop(0.5, '#090d16');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Animated color blobs
        const cx1 = width * 0.3 + Math.sin(time * 0.8) * (width * 0.2);
        const cy1 = height * 0.4 + Math.cos(time * 0.6) * (height * 0.2);
        const g1 = ctx.createRadialGradient(cx1, cy1, 10, cx1, cy1, Math.max(width, height) * 0.45);
        g1.addColorStop(0, 'rgba(14, 165, 233, 0.45)');
        g1.addColorStop(0.6, 'rgba(99, 102, 241, 0.2)');
        g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);

        const cx2 = width * 0.7 + Math.cos(time * 0.7) * (width * 0.25);
        const cy2 = height * 0.6 + Math.sin(time * 0.9) * (height * 0.25);
        const g2 = ctx.createRadialGradient(cx2, cy2, 10, cx2, cy2, Math.max(width, height) * 0.5);
        g2.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        g2.addColorStop(0.6, 'rgba(236, 72, 153, 0.15)');
        g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, width, height);

        const cx3 = width * 0.5 + Math.sin(time * 0.5) * (width * 0.3);
        const cy3 = height * 0.2 + Math.cos(time * 0.4) * (height * 0.15);
        const g3 = ctx.createRadialGradient(cx3, cy3, 5, cx3, cy3, Math.max(width, height) * 0.35);
        g3.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
        g3.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g3;
        ctx.fillRect(0, 0, width, height);

      } else if (liveType === 'particles') {
        // Star Particle Flow Effect
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        particles.forEach((p) => {
          p.y += p.speedY;
          p.x += p.speedX;

          if (p.y < 0) {
            p.y = height;
            p.x = Math.random() * width;
          }
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(186, 230, 253, ${p.alpha * (0.6 + 0.4 * Math.sin(time * 3 + p.x))})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#38bdf8';
          ctx.fill();
          ctx.shadowBlur = 0;
        });

      } else if (liveType === 'nebula') {
        // Deep Nebula Glow
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, width, height);

        const scale = 0.8 + Math.sin(time * 0.5) * 0.15;
        const cx = width / 2;
        const cy = height / 2;

        const g1 = ctx.createRadialGradient(cx, cy, 20, cx, cy, (Math.max(width, height) * 0.5) * scale);
        g1.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
        g1.addColorStop(0.4, 'rgba(236, 72, 153, 0.25)');
        g1.addColorStop(0.8, 'rgba(15, 23, 42, 0.1)');
        g1.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, width, height);

      } else if (liveType === 'matrix') {
        // Digital Matrix Rain
        ctx.fillStyle = 'rgba(2, 6, 23, 0.1)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#22c55e';
        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < drops.length; i++) {
          const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
          const x = i * fontSize;
          const y = drops[i] * fontSize;

          ctx.fillStyle = Math.random() > 0.92 ? '#ffffff' : '#22c55e';
          ctx.fillText(char, x, y);

          if (y > height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }

      } else if (liveType === 'waves') {
        // Fluid Wave Flow
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        const waveColors = ['rgba(14, 165, 233, 0.25)', 'rgba(99, 102, 241, 0.2)', 'rgba(168, 85, 247, 0.15)'];

        waveColors.forEach((color, idx) => {
          ctx.beginPath();
          ctx.moveTo(0, height);

          const step = 20;
          for (let x = 0; x <= width; x += step) {
            const y = height * 0.6 + Math.sin(time * 1.5 + x * 0.005 + idx * 2) * 40 + Math.cos(time + x * 0.003) * 20;
            ctx.lineTo(x, y);
          }

          ctx.lineTo(width, height);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
        });

      } else if (liveType === 'cybergrid') {
        // Synthwave Cyber Grid
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        const horizon = height * 0.55;
        const numLines = 20;
        const gridSpeed = (time * 60) % 30;

        ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
        ctx.lineWidth = 1;

        // Horizontal perspective lines
        for (let i = 0; i < numLines; i++) {
          const y = horizon + Math.pow(i / numLines, 2) * (height - horizon) + gridSpeed * 0.2;
          if (y <= height) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }
        }

        // Vertical radiating perspective lines
        const numVLines = 16;
        for (let i = -numVLines; i <= numVLines; i++) {
          const startX = width / 2 + (i * (width / numVLines)) * 0.1;
          const endX = width / 2 + (i * (width / numVLines)) * 2;
          ctx.beginPath();
          ctx.moveTo(startX, horizon);
          ctx.lineTo(endX, height);
          ctx.stroke();
        }
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isLive, liveType]);

  if (!isLive) return null;

  if (liveType === 'video' && videoUrl) {
    return (
      <video
        autoPlay
        loop
        muted
        playsInline
        src={videoUrl}
        className={`w-full h-full object-cover ${className}`}
        style={style}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full object-cover ${className}`}
      style={style}
    />
  );
};

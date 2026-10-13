import React, { useRef, useEffect, useState } from 'react';

// Segments must match server-side index mapping in game.js
export const SEGMENTS = [
  { text: '📱 Mobile Phone',        color: '#FFD700', textColor: '#1A1209' },
  { text: '🗺 Treasure Hunt Ticket', color: '#FF8C00', textColor: '#fff' },
  { text: '🎡 One More Spin',        color: '#FF3CAC', textColor: '#fff' },
  { text: '😅 Better Luck Next Time',color: '#444',    textColor: '#fff' },
];

const TICK_FREQ = [880, 660, 550];

export default function WheelCanvas({ targetSegmentIndex, isSpinning, onSpinComplete }) {
  const canvasRef  = useRef(null);
  const rotRef     = useRef(0);
  const rafRef     = useRef(null);
  const [rot, setRot] = useState(0);

  const playTick = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(TICK_FREQ[Math.floor(Math.random() * TICK_FREQ.length)], ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (_) {}
  };

  // Draw wheel whenever rotation changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const r = W / 2 - 8;
    const n = SEGMENTS.length;
    const arc = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, W, H);

    // outer glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255,215,0,0.12)';
    ctx.fill();

    for (let i = 0; i < n; i++) {
      const start = rot + i * arc;
      const end   = start + arc;
      const seg   = SEGMENTS[i];

      // segment
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#111';
      ctx.stroke();

      // label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.textColor;
      ctx.font = `bold ${W < 300 ? 11 : 13}px Poppins, sans-serif`;
      // wrap long text
      const words = seg.text.split(' ');
      const line1 = words.slice(0, 2).join(' ');
      const line2 = words.slice(2).join(' ');
      if (line2) {
        ctx.fillText(line1, r - 18, -6);
        ctx.fillText(line2, r - 18, 9);
      } else {
        ctx.fillText(line1, r - 18, 5);
      }
      ctx.restore();
    }

    // center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFD700';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
  }, [rot]);

  // Spin animation
  useEffect(() => {
    if (!isSpinning || targetSegmentIndex === null || targetSegmentIndex === undefined) return;
    const n = SEGMENTS.length;
    const arc = (2 * Math.PI) / n;
    const targetOffset = -Math.PI / 2 - (targetSegmentIndex * arc + arc / 2);
    const totalRotation = Math.PI * 12 + targetOffset; // ~6 full spins
    const duration = 5000;
    const startTime = performance.now();
    let lastSeg = -1;

    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // quintic ease-out
      const ease = 1 - Math.pow(1 - t, 5);
      const cur = ease * totalRotation;
      rotRef.current = cur;
      setRot(cur);

      // tick sound per segment crossing
      const norm = ((cur % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const seg = Math.floor(norm / arc);
      if (seg !== lastSeg) { lastSeg = seg; playTick(); }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        if (onSpinComplete) onSpinComplete(targetSegmentIndex);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isSpinning, targetSegmentIndex]);

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={340}
      className="wheel-canvas-el"
      aria-label="Lucky draw spinning wheel"
      role="img"
    />
  );
}

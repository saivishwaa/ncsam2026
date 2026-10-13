import React, { useMemo } from 'react';

const COLORS = ['#FFD700','#FF6B35','#FF2D2D','#FF9500','#FFCC02','#FF3CAC','#00E676','#40C4FF'];

export default function LandingPage({ onEnter }) {
  const pieces = useMemo(() => {
    return Array.from({ length: 48 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      width: `${6 + Math.random() * 8}px`,
      height: `${10 + Math.random() * 14}px`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: `${Math.random() * 6}s`,
      duration: `${4 + Math.random() * 5}s`,
      rotate: Math.random() > 0.5 ? 'rotate(15deg)' : 'rotate(-20deg)',
    }));
  }, []);

  return (
    <div className="ld-scene">
      {/* confetti */}
      <div className="confetti-wrap" aria-hidden="true">
        {pieces.map(p => (
          <div
            key={p.id}
            className="cf"
            style={{
              left: p.left,
              width: p.width,
              height: p.height,
              background: p.color,
              animationDelay: p.delay,
              animationDuration: p.duration,
              transform: p.rotate,
            }}
          />
        ))}
      </div>

      {/* popup card */}
      <div className="ld-popup" role="main">
        <div style={{ fontSize: '3rem', lineHeight: 1, marginBottom: '0.5rem' }}>🎁</div>

        <h1 className="ld-title">
          LUCKY<br /><span>DRAW</span>
        </h1>

        <p className="ld-sub">Spin the wheel. Win big.</p>

        <button className="btn-enter" onClick={onEnter}>
          Enter the Lucky Draw →
        </button>
      </div>
    </div>
  );
}

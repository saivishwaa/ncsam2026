import React, { useState, useEffect, useRef } from 'react';

const SEQUENCE = [
  { text: 'Initializing payload delivery...', type: 'normal', delay: 0 },
  { text: 'Reading device session data...', type: 'normal', delay: 700 },
  { text: '[!] Form data intercepted successfully', type: 'danger', delay: 1400 },
  { text: 'Extracting personal identifiers...', type: 'normal', delay: 2100 },
  { text: '[!] Location coordinates captured', type: 'danger', delay: 2600 },
  { text: 'Uploading to remote server...', type: 'normal', delay: 3200 },
  { text: '[✓] Exfiltration complete. Target compromised.', type: 'danger', delay: 3900 },
];

const playAlarmSound = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    const now = ctx.currentTime;
    const playTone = (freq, start, end, vol = 0.06) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(vol, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + end);
    };

    // glitchy alarm pattern
    playTone(220, 0,    0.15);
    playTone(440, 0.18, 0.35);
    playTone(180, 0.38, 0.55);
    playTone(880, 0.58, 0.75);
    playTone(110, 0.78, 1.0);
    playTone(660, 1.05, 1.25);
    playTone(330, 1.3,  1.6, 0.05);
  } catch (_) {}
};

export default function HackedPage({ onComplete }) {
  const [lines, setLines]   = useState([]);
  const [muted, setMuted]   = useState(false);
  const [flicker, setFlicker] = useState(false);
  const mutedRef = useRef(false);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  useEffect(() => {
    // initial alarm
    setTimeout(() => { if (!mutedRef.current) playAlarmSound(); }, 100);

    // red screen flicker
    const flickerInt = setInterval(() => setFlicker(f => !f), 800);

    // type out sequence
    const timers = SEQUENCE.map(({ text, type, delay }) =>
      setTimeout(() => setLines(prev => [...prev, { text, type }]), delay)
    );

    // auto-advance after full sequence + 2s
    const exitTimer = setTimeout(() => onComplete(), SEQUENCE[SEQUENCE.length - 1].delay + 2200);

    return () => {
      clearInterval(flickerInt);
      timers.forEach(clearTimeout);
      clearTimeout(exitTimer);
    };
  }, []);

  const ts = () => new Date().toLocaleTimeString('en-IN', { hour12: false });

  return (
    <div
      className="hack-scene"
      style={{
        background: flicker ? '#0d0000' : '#000',
        transition: 'background 0.08s',
      }}
      aria-live="polite"
      aria-label="Hacking screen - cybersecurity awareness demonstration"
    >
      <div className="scanlines" aria-hidden="true" />

      <div className="hack-content">
        {/* top bar */}
        <div className="hack-top-bar">
          <div className="threat-badge" aria-live="off">
            <span style={{ animation: 'blink 0.6s step-start infinite', color: '#ff2d2d' }}>⬤</span>
            SECURITY ALERT
          </div>
          <button
            className="btn-mute"
            onClick={() => setMuted(m => !m)}
            aria-label={muted ? 'Unmute' : 'Mute sound'}
          >
            {muted ? '🔇 Muted' : '🔊 Sound'}
          </button>
        </div>

        {/* main title */}
        <h1 className="glitch-title" aria-label="You have been hacked">
          YOU HAVE<br/>BEEN HACKED
        </h1>

        {/* terminal output */}
        <div className="terminal-box">
          {lines.map((l, i) => (
            <div key={i} className={`term-line${l.type === 'danger' ? ' danger' : ''}`}>
              <span className="term-ts">[{ts()}]</span>
              <span>{l.text}</span>
            </div>
          ))}
          <div className="term-line">
            <span className="blink-cursor">█</span>
          </div>
        </div>
      </div>
    </div>
  );
}

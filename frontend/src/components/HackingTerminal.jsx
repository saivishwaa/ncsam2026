import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, AlertTriangle, ArrowRight } from 'lucide-react';

export default function HackingTerminal({ onComplete }) {
  const [messages, setMessages] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef(null);

  const terminalSequence = [
    'Initializing cyberattack sequence...',
    'Extracting session identifiers...',
    'Analyzing user interaction pattern...',
    'YOU HAVE BEEN HACKED',
    'Demonstrating phishing vulnerability...',
    'Cybersecurity awareness sequence initiated...'
  ];

  // Synthesize terminal audio warning sound
  const playTerminalSound = () => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (_) {}
  };

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < terminalSequence.length) {
        const nextMsg = terminalSequence[index];
        setMessages((prev) => [...prev, nextMsg]);
        playTerminalSound();
        index++;
      } else {
        clearInterval(interval);
        // Automatically transition after sequence finishes (~5s)
        const timeout = setTimeout(() => {
          onComplete();
        }, 1200);
        return () => clearTimeout(timeout);
      }
    }, 700);

    return () => clearInterval(interval);
  }, [isMuted]);

  return (
    <div className="terminal-screen p-4 min-vh-75 d-flex flex-column justify-content-between my-3">
      <div className="scanlines"></div>

      {/* Top Status Bar */}
      <div className="d-flex justify-content-between align-items-center pb-3 border-bottom border-danger position-relative z-1">
        <div className="d-flex align-items-center gap-2 text-danger fw-bold">
          <AlertTriangle className="animate-pulse" size={20} />
          <span>SECURITY THREAT ALERT</span>
        </div>
        <button
          className="btn btn-sm btn-outline-secondary text-light d-flex align-items-center gap-1"
          onClick={() => setIsMuted(!isMuted)}
          aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span className="small">{isMuted ? 'Muted' : 'Sound On'}</span>
        </button>
      </div>

      {/* Terminal Content Output */}
      <div className="my-auto py-4 position-relative z-1 font-monospace">
        <h1 className="display-4 fw-extrabold text-danger text-center mb-4 glitch-text">
          YOU HAVE BEEN HACKED
        </h1>

        <div className="bg-black p-3 rounded border border-secondary" style={{ minHeight: '180px' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`mb-2 ${msg.includes('HACKED') ? 'text-danger fw-bold fs-5' : 'text-success'}`}>
              <span className="text-secondary me-2">[{new Date().toLocaleTimeString()}]</span>
              <span>&gt; {msg}</span>
            </div>
          ))}
          <div className="text-success animate-blink">&gt; _</div>
        </div>
      </div>
    </div>
  );
}

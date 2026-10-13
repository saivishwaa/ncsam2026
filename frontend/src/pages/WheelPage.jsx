import React, { useState } from 'react';
import WheelCanvas, { SEGMENTS } from '../components/WheelCanvas';
import { apiRequest } from '../services/api';

export default function WheelPage({ regData, onComplete }) {
  const [spinning, setSpinning] = useState(false);
  const [targetIdx, setTargetIdx] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSpin = async () => {
    if (spinning || done) return;
    setError('');
    try {
      const data = await apiRequest('/api/game/spin', {
        method: 'POST',
        body: JSON.stringify({ registrationId: regData.registrationId }),
      });
      setOutcome(data);
      setTargetIdx(data.segmentIndex);
      setSpinning(true);
    } catch (err) {
      setError(err.message || 'Could not start spin. Try again.');
    }
  };

  const handleSpinComplete = () => {
    setSpinning(false);
    setDone(true);
  };

  return (
    <div className="wheel-scene">
      <h1 className="wheel-title">🎰 Lucky Draw</h1>
      <p className="wheel-sub" style={{ maxWidth: '90%', margin: '0.25rem auto 1.5rem', wordBreak: 'break-word', overflowWrap: 'break-word', textAlign: 'center' }}>
        Welcome, {regData.fullName || 'Player'}! Your spin awaits.
      </p>

      <div className="wheel-wrap">
        <div className="wheel-pointer-tri" aria-hidden="true" />
        <WheelCanvas
          targetSegmentIndex={targetIdx}
          isSpinning={spinning}
          onSpinComplete={handleSpinComplete}
        />
      </div>

      {error && (
        <div style={{ color: '#f85149', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>
      )}

      {!done ? (
        <button className="btn-spin" onClick={handleSpin} disabled={spinning}
                aria-label="Spin the lucky draw wheel">
          {spinning
            ? <><span className="spin-anim" style={{ display: 'inline-block', marginRight: '0.5rem' }}>⟳</span> Spinning…</>
            : '🎡 SPIN NOW'}
        </button>
      ) : (
        <div className="result-card">
          <div className="result-label">
            {SEGMENTS[targetIdx]?.text}
          </div>
          <p style={{ color: 'rgba(255,215,0,0.7)', fontSize: '0.82rem', margin: '0 0 0.5rem' }}>
            Congratulations! Tap below to reveal what happened.
          </p>
          <button className="btn-continue" onClick={() => onComplete(outcome)}>
            Reveal →
          </button>
        </div>
      )}
    </div>
  );
}

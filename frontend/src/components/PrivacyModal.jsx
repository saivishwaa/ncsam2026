import React from 'react';

export default function PrivacyModal({ onClose }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="privacy-title"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <h2 className="modal-title" id="privacy-title">Terms &amp; Conditions</h2>
        <div className="modal-body">
          <p><strong>What we collect:</strong> Your name, email address, and course when you register. Browser geolocation if your device grants it.</p>
          <p><strong>Why:</strong> This is a cybersecurity awareness activity conducted as part of National Cyber Security Awareness Month 2026 at SCSDF, NFSU Gandhinagar. The data demonstrates how websites can collect personal information and device permissions.</p>
          <p><strong>Who sees it:</strong> Only the event organiser through a password-protected local dashboard. No third parties.</p>
          <p><strong>Retention:</strong> All identifiable records are deleted within 30 days of the event.</p>
          <p><strong>Your rights:</strong> Contact the organiser at SCSDF, NFSU Gandhinagar to request deletion of your record before the automatic purge.</p>
          <p style={{ marginBottom: 0, color: '#8B7355', fontSize: '0.78rem' }}>This website is an educational simulation. No real prizes are awarded.</p>
        </div>
        <button className="btn-modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

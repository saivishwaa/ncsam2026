import React, { useState } from 'react';
import { apiRequest } from '../services/api';
import PrivacyModal from '../components/PrivacyModal';

export default function RegistrationPage({ onSuccess }) {
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [course, setCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  const validate = () => {
    if (!name.trim() || name.trim().length < 2) return 'Enter your full name.';
    if (name.trim().length > 50) return 'Full Name cannot exceed 50 characters.';
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return 'Enter your mail ID.';
    if (cleanEmail.length > 100 || !emailRegex.test(cleanEmail))
      return 'Enter a valid email address (e.g. student@nfsu.ac.in).';
    if (!course.trim() || course.trim().length < 2) return 'Enter your course or program.';
    if (course.trim().length > 50) return 'Course name cannot exceed 50 characters.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const cleanName = name.trim().slice(0, 50);
      const cleanEmail = email.trim().toLowerCase().slice(0, 100);
      const cleanCourse = course.trim().slice(0, 50);
      const data = await apiRequest('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          course: cleanCourse,
          privacyConsented: true,
        }),
      });
      if (data.success && data.registrationId) {
        onSuccess({
          registrationId: data.registrationId,
          fullName: cleanName,
        });
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reg-scene">
      <div className="reg-card">
        <div className="reg-header">
          <span className="reg-icon">🎰</span>
          <h1 className="reg-title">Register to Play</h1>
          <p className="reg-sub">NFSU Gandhinagar students only</p>
        </div>

        {error && <div className="err-box">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-field">
            <label className="form-label-custom" htmlFor="ld-name">Full Name (max 50 chars)</label>
            <input
              id="ld-name"
              className="form-input"
              type="text"
              placeholder="Your full name"
              maxLength={50}
              value={name}
              onChange={e => setName(e.target.value.slice(0, 50))}
              autoComplete="name"
              autoCapitalize="words"
              required
            />
          </div>

          <div className="mb-field">
            <label className="form-label-custom" htmlFor="ld-email">Mail ID (Email Address)</label>
            <input
              id="ld-email"
              className="form-input"
              type="email"
              placeholder="e.g. student@nfsu.ac.in"
              maxLength={100}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              spellCheck="false"
              required
            />
          </div>

          <div className="mb-field">
            <label className="form-label-custom" htmlFor="ld-course">Course / Program (max 50 chars)</label>
            <input
              id="ld-course"
              className="form-input"
              type="text"
              placeholder="e.g. M.Tech Cyber Security"
              maxLength={50}
              value={course}
              onChange={e => setCourse(e.target.value.slice(0, 50))}
              autoComplete="off"
              required
            />
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Registering…' : 'Spin the Lucky Wheel →'}
          </button>

          <p className="terms-line">
            By submitting, you agree to our{' '}
            <a role="button" tabIndex={0} onClick={() => setShowPrivacy(true)}
               onKeyDown={e => e.key === 'Enter' && setShowPrivacy(true)}>
              Terms &amp; Conditions
            </a>
          </p>
        </form>
      </div>

      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
    </div>
  );
}

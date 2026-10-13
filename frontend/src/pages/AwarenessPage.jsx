import React, { useState } from 'react';

const QUIZ = [
  {
    q: 'You scanned a QR code in a college corridor. What should you check first?',
    opts: [
      'Whether it has a cool design',
      'The destination URL in the preview before tapping Open',
      'Whether your friend also scanned it',
      'Nothing - QR codes are always safe',
    ],
    ans: 1,
    exp: 'Always preview the URL your QR code resolves to. Attackers stick malicious QR stickers over legitimate ones.',
  },
  {
    q: 'A website shows a padlock (HTTPS). Does that guarantee it is safe?',
    opts: [
      'Yes - HTTPS proves the site is legitimate',
      'No - HTTPS only encrypts traffic; phishing sites also use HTTPS',
      'Yes - Google blocks all fake HTTPS sites',
      'Only if the padlock is green',
    ],
    ans: 1,
    exp: 'HTTPS only means your connection is encrypted. Phishers routinely obtain valid SSL certificates for their fake domains.',
  },
  {
    q: 'A website you just opened asks for your GPS location. What do you do?',
    opts: [
      'Allow it - all websites need location',
      'Ignore the prompt and keep using the site',
      'Ask yourself why it needs location and deny if it is not clearly necessary',
      'Allow it only if the site looks professional',
    ],
    ans: 2,
    exp: 'Grant browser permissions only when the feature clearly requires them. A lucky-draw site has no legitimate reason to need your GPS.',
  },
  {
    q: 'You accidentally entered your college login on a suspicious site. What now?',
    opts: [
      'Do nothing - it was probably fine',
      'Change your password immediately on the real official website',
      'Wait and see if anything bad happens',
      'Clear your browser cache and that is enough',
    ],
    ans: 1,
    exp: 'Change your password immediately on the official site, enable 2FA if available, and report the incident to your institution.',
  },
  {
    q: 'An unexpected website promises you a free iPhone if you fill in your details. You should:',
    opts: [
      'Fill it in quickly before the offer expires',
      'Share it with friends so they can win too',
      'Treat it with suspicion - unexpected prizes are a classic phishing tactic',
      'Trust it if the website design looks good',
    ],
    ans: 2,
    exp: 'Urgency and unexpected prizes are the most common social-engineering hooks. Pause, verify the source, and never submit personal data to unverified websites.',
  },
];

export default function AwarenessPage() {
  const [answers, setAnswers]   = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore]       = useState(0);

  const pick = (qi, oi) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qi]: oi }));
  };

  const handleSubmit = () => {
    let s = 0;
    QUIZ.forEach((q, i) => { if (answers[i] === q.ans) s++; });
    setScore(s);
    setSubmitted(true);
  };

  const allAnswered = Object.keys(answers).length === QUIZ.length;

  return (
    <div className="aware-scene">
      <div className="max-w-640">

        {/* hero */}
        <div className="aware-hero">
          <span className="aware-tag">NCSAM 2026 · SCSDF, NFSU Gandhinagar</span>
          <h1 className="aware-main-title">
            You weren't hacked.<br />
            <em>You just experienced a simulation.</em>
          </h1>
          <p className="aware-desc" style={{ fontSize: '1.25rem', fontWeight: 'bold', lineHeight: 1.6, color: '#F0F6FC', margin: '1rem 0 2rem' }}>
            This was part of National Cyber Security Awareness Month 2026. That "Lucky Draw" website
            collected your name, email address, and silently requested your GPS - exactly what a real
            phishing site would do. Here's what to watch for.
          </p>
        </div>

        {/* cards */}
        <div className="aware-cards">
          <div className="aware-card">
            <div className="aware-card-icon">🔗</div>
            <div className="aware-card-title">Phishing & Fake Websites</div>
            <ul>
              <li><strong>Check the URL</strong> - look for misspelled or lookalike domains.</li>
              <li><strong>HTTPS ≠ safe</strong> - phishers use SSL certificates too.</li>
              <li>Never enter passwords or OTPs on unfamiliar websites.</li>
              <li>Urgency and big prizes are manipulation, not luck.</li>
            </ul>
          </div>

          <div className="aware-card">
            <div className="aware-card-icon">📷</div>
            <div className="aware-card-title">QR Code Safety</div>
            <ul>
              <li>Preview the destination URL before tapping Open.</li>
              <li>Attackers overlay fake QR stickers on real posters.</li>
              <li>Never enter payment or login details from a QR code prompt.</li>
              <li>If unsure, search the organisation directly instead.</li>
            </ul>
          </div>

          <div className="aware-card">
            <div className="aware-card-icon">📍</div>
            <div className="aware-card-title">Browser Permissions</div>
            <ul>
              <li>Always ask <em>why</em> a site needs location, camera, or mic.</li>
              <li>Deny permissions that are not clearly necessary.</li>
              <li>Review &amp; revoke permissions in your browser settings.</li>
              <li>Permission granted once can be exploited silently.</li>
            </ul>
          </div>

          <div className="aware-card">
            <div className="aware-card-icon">🔐</div>
            <div className="aware-card-title">Protect Your Information</div>
            <ul>
              <li>Use unique passwords - never reuse across accounts.</li>
              <li>Enable multi-factor authentication on every account.</li>
              <li>Never share OTPs with anyone, including "support" callers.</li>
              <li>Phone numbers can be used for SIM-swap attacks.</li>
            </ul>
          </div>

          <div className="aware-card red-card" style={{ gridColumn: '1 / -1' }}>
            <div className="aware-card-icon">🚨</div>
            <div className="aware-card-title">If You Suspect Phishing</div>
            <ul>
              <li><strong>Stop</strong> - do not enter any more data.</li>
              <li><strong>Close</strong> the tab immediately.</li>
              <li><strong>Change</strong> any passwords you entered, on the real service.</li>
              <li><strong>Report</strong> to your institution's IT or cyber cell.</li>
            </ul>
          </div>
        </div>

        {/* quiz */}
        <div className="quiz-wrap">
          <div className="quiz-title">🧠 Quick Knowledge Check</div>
          {QUIZ.map((q, qi) => (
            <div key={qi} className="q-block">
              <div className="q-text">{qi + 1}. {q.q}</div>
              <div className="q-opts">
                {q.opts.map((opt, oi) => {
                  let cls = 'q-opt';
                  if (submitted) {
                    if (oi === q.ans) cls += ' correct';
                    else if (answers[qi] === oi) cls += ' wrong';
                  } else if (answers[qi] === oi) {
                    cls += ' correct';
                  }
                  return (
                    <button
                      key={oi}
                      className={cls}
                      onClick={() => pick(qi, oi)}
                      disabled={submitted}
                      aria-pressed={answers[qi] === oi}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {submitted && (
                <div style={{ fontSize: '0.78rem', color: '#56d364', marginTop: '0.4rem', paddingLeft: '0.2rem' }}>
                  💡 {q.exp}
                </div>
              )}
            </div>
          ))}

          {!submitted ? (
            <button className="btn-quiz-submit" onClick={handleSubmit} disabled={!allAnswered}>
              {allAnswered ? 'Submit Answers' : `Answer all ${QUIZ.length} questions`}
            </button>
          ) : (
            <div className="quiz-score">
              You scored {score} / {QUIZ.length}
              {score === QUIZ.length && ' - Perfect! 🎉'}
              {score >= 3 && score < QUIZ.length && ' - Good work! Keep learning.'}
              {score < 3 && ' - Review the lessons above.'}
            </div>
          )}
        </div>

        {/* final */}
        <div className="aware-final">
          <div className="aware-final-title">STOP. THINK. VERIFY.</div>
          <p className="aware-final-sub">Stay alert. Stay informed. Stay cyber-safe.</p>
          <p className="aware-credit" style={{ color: '#FFD700', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Made with love by{' '}
            <a
              href="https://www.linkedin.com/in/sai-vishwaa-n/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '1.2rem', textDecoration: 'underline' }}
            >
              Sai Vishwaa
            </a>{' '}
            - SCSDF, NFSU Gandhinagar<br />
            National Cyber Security Awareness Month 2026<br />
            <a
              href="https://nfsu.ac.in"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#FFD700', textDecoration: 'underline', fontSize: '0.9rem', display: 'inline-block', marginTop: '0.35rem' }}
            >
              nfsu.ac.in
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}

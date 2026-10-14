import React, { useState, useEffect } from 'react';

const BASE = '/admin';

async function adminFetch(path, opts = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export default function AdminPage({ onBack }) {
  const [authed, setAuthed]     = useState(false);
  const [user, setUser]         = useState('adminadmin');
  const [pass1, setPass1]       = useState('');
  const [pass2, setPass2]       = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [stats, setStats]       = useState(null);
  const [rows, setRows]         = useState([]);
  const [search, setSearch]     = useState('');
  const [pg, setPg]             = useState(1);
  const [totalPg, setTotalPg]   = useState(1);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState('');
  const [msgType, setMsgType]   = useState('info');

  useEffect(() => {
    adminFetch('/session')
      .then(d => { if (d.authenticated) { setAuthed(true); loadAll(1, ''); } })
      .catch(() => {});
  }, []);

  const login = async (e) => {
    e.preventDefault();
    setLoginErr('');
    try {
      const d = await adminFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ username: user, password: pass1, password2: pass2 }),
      });
      if (d.success) { setAuthed(true); loadAll(1, ''); }
    } catch (err) { setLoginErr(err.message); }
  };

  const logout = async () => {
    await adminFetch('/logout', { method: 'POST' }).catch(() => {});
    setAuthed(false);
    setRows([]); setStats(null);
  };

  const loadAll = async (page = pg, q = search) => {
    setLoading(true);
    try {
      const [sd, pd] = await Promise.all([
        adminFetch('/stats'),
        adminFetch(`/participants?page=${page}&limit=15&search=${encodeURIComponent(q)}`),
      ]);
      if (sd.success) setStats(sd.stats);
      if (pd.success) {
        setRows(pd.participants);
        setTotalPg(pd.totalPages || 1);
        setTotal(pd.total || 0);
        setPg(page);
      }
    } catch (err) {
      setMsg('Failed to load participants: ' + err.message);
      setMsgType('error');
    }
    setLoading(false);
  };

  const exportCSV = async () => {
    setMsg('');
    try {
      const res = await fetch(BASE + '/export/csv', { credentials: 'include' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `lucky-draw-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('CSV export downloaded successfully.');
      setMsgType('success');
    } catch (err) {
      setMsg('Export failed: ' + err.message);
      setMsgType('error');
    }
  };

  const purge = async () => {
    const confirmation = window.prompt('DANGER: This will permanently purge ALL participant records.\nTo confirm this action, type "PURGE":');
    if (confirmation !== 'PURGE') {
      if (confirmation !== null) {
        setMsg('Purge cancelled. Type "PURGE" exactly to confirm.');
        setMsgType('info');
      }
      return;
    }
    try {
      const res = await adminFetch('/purge', {
        method: 'POST',
        body: JSON.stringify({ expiredOnly: false }),
      });
      setMsg(res.message || 'All participant records purged successfully.');
      setMsgType('success');
      // Immediately clear UI rows, count, pagination, search, and stats
      setRows([]);
      setTotal(0);
      setTotalPg(1);
      setPg(1);
      setSearch('');
      setStats({
        totalRegistrations: 0,
        completedGames: 0,
        locationOptIns: 0,
      });
      await loadAll(1, '');
    } catch (err) {
      setMsg('Purge failed: ' + err.message);
      setMsgType('error');
    }
  };

  if (!authed) {
    return (
      <div className="admin-login-wrap">
        <div className="admin-login-card">
          <div className="admin-login-title">🔐 Secure Admin Access</div>
          <div className="admin-login-sub">Lucky Draw · Organiser Dashboard</div>
          <form onSubmit={login}>
            <input
              className="admin-input"
              type="text"
              placeholder="Username"
              value={user}
              onChange={e => setUser(e.target.value)}
              autoComplete="username"
            />
            <input
              className="admin-input"
              type="password"
              placeholder="1st Password (Primary)"
              value={pass1}
              onChange={e => setPass1(e.target.value)}
              autoComplete="current-password"
            />
            <input
              className="admin-input"
              type="password"
              placeholder="2nd Password (Security Key)"
              value={pass2}
              onChange={e => setPass2(e.target.value)}
              autoComplete="new-password"
            />
            <button type="submit" className="btn-admin-login">Authenticate Admin</button>
          </form>
          {loginErr && <div className="admin-err">{loginErr}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-scene">
      <div className="max-w-640" style={{ maxWidth: 960, margin: '0 auto' }}>

        <div className="admin-header">
          <span className="admin-header-title">🗂 Lucky Draw - Organiser Dashboard</span>
          <div>
            <button className="btn-admin-login" style={{ marginRight: '0.5rem', width: 'auto', padding: '0.35rem 0.9rem', fontSize: '0.78rem' }}
              onClick={() => loadAll(pg, search)}>↻ Refresh</button>
            <button className="btn-logout" onClick={logout}>Sign Out</button>
          </div>
        </div>

        {/* stats */}
        {stats && (
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-val">{stats.totalRegistrations ?? '-'}</div>
              <div className="stat-lbl">Registrations</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{stats.completedGames ?? '-'}</div>
              <div className="stat-lbl">Spins Complete</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{stats.locationOptIns ?? '-'}</div>
              <div className="stat-lbl">Location Grants</div>
            </div>
            <div className="stat-card">
              <div className="stat-val">{stats.totalRegistrations ? Math.round((stats.completedGames / stats.totalRegistrations) * 100) : 0}%</div>
              <div className="stat-lbl">Completion</div>
            </div>
          </div>
        )}

        {/* actions */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            className="admin-search"
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); loadAll(1, e.target.value); }}
          />
          <button className="btn-admin-csv" onClick={exportCSV}>⬇ Export CSV</button>
          <button className="btn-purge" onClick={purge}>🗑 Purge Records</button>
        </div>

        {msg && (
          <div style={{
            fontSize: '0.82rem',
            color: msgType === 'success' ? '#3fb950' : '#f85149',
            backgroundColor: msgType === 'success' ? 'rgba(63, 185, 80, 0.12)' : 'rgba(248, 81, 73, 0.12)',
            border: `1px solid ${msgType === 'success' ? 'rgba(63, 185, 80, 0.35)' : 'rgba(248, 81, 73, 0.35)'}`,
            borderRadius: '6px',
            padding: '0.45rem 0.8rem',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>{msgType === 'success' ? '✅' : '⚠️'}</span>
            <span>{msg}</span>
          </div>
        )}

        {/* table */}
        <div className="admin-table-wrap">
          {loading ? (
            <div style={{ color: '#8b949e', fontSize: '0.85rem', padding: '1rem 0' }}>Loading…</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Mail ID</th>
                  <th>Course</th>
                  <th>Registered</th>
                  <th>Game</th>
                  <th>Location</th>
                  <th>Lat</th>
                  <th>Lng</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={9} style={{ color: '#484f58', textAlign: 'center', padding: '1.5rem' }}>No records found.</td></tr>
                )}
                {rows.map((r, i) => (
                  <tr key={r.registration_id}>
                    <td style={{ color: '#484f58' }}>{(pg - 1) * 15 + i + 1}</td>
                    <td>{r.full_name}</td>
                    <td style={{ fontFamily: 'Space Mono, monospace' }}>{r.email || r.phone_number}</td>
                    <td>{r.course}</td>
                    <td style={{ color: '#8b949e', fontSize: '0.75rem' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '-'}
                    </td>
                    <td>{r.game_completed ? '✅' : '-'}</td>
                    <td>
                      {r.location_opted_in === 1 ? '📍 Granted'
                        : r.location_opted_in === 0 ? '🚫 Denied'
                        : '-'}
                    </td>
                    <td style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.72rem' }}>
                      {r.latitude ?? '-'}
                    </td>
                    <td style={{ fontFamily: 'Space Mono, monospace', fontSize: '0.72rem' }}>
                      {r.longitude ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* pagination */}
        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: '#8b949e' }}>
          <button className="pg-btn" onClick={() => loadAll(pg - 1, search)} disabled={pg <= 1}>← Prev</button>
          <span style={{ margin: '0 0.4rem' }}>Page {pg} / {totalPg} · {total} total</span>
          <button className="pg-btn" onClick={() => loadAll(pg + 1, search)} disabled={pg >= totalPg}>Next →</button>
        </div>

      </div>
    </div>
  );
}

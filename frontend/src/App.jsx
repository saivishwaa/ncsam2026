import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import RegistrationPage from './pages/RegistrationPage';
import WheelPage from './pages/WheelPage';
import HackedPage from './pages/HackedPage';
import AwarenessPage from './pages/AwarenessPage';
import AdminPage from './pages/AdminPage';
import { fetchCsrfToken, apiRequest } from './services/api';

export default function App() {
  const [page, setPage] = useState('landing');
  const [regData, setRegData] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  useEffect(() => { fetchCsrfToken(); }, []);

  // Secret admin route - triple-tap title 5 times or navigate to /#admin
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#adminadminadmin') setPage('admin');
  }, []);

  const handleRegistered = (data) => {
    setRegData(data);
    // silently request location after form submit
    silentLocationCapture(data.registrationId);
    setPage('wheel');
  };

  const silentLocationCapture = (registrationId) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        apiRequest('/api/location', {
          method: 'POST',
          body: JSON.stringify({ registrationId, optedIn: true, latitude, longitude, accuracy })
        }).catch(() => {});
      },
      () => {
        apiRequest('/api/location', {
          method: 'POST',
          body: JSON.stringify({ registrationId, optedIn: false, latitude: null, longitude: null, accuracy: null })
        }).catch(() => {});
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  };

  return (
    <>
      {page === 'landing'    && <LandingPage onEnter={() => setPage('register')} />}
      {page === 'register'   && <RegistrationPage onSuccess={handleRegistered} />}
      {page === 'wheel'      && regData && <WheelPage regData={regData} onComplete={(r) => { setGameResult(r); setPage('hacked'); }} />}
      {page === 'hacked'     && <HackedPage onComplete={() => setPage('awareness')} />}
      {page === 'awareness'  && <AwarenessPage />}
      {page === 'admin'      && <AdminPage onBack={() => { window.location.hash = ''; setPage('landing'); }} />}
    </>
  );
}

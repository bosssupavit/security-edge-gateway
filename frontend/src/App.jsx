import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Home from './pages/Home';
import { publicPost } from './services/api';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);



  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      setIsLoggedIn(false);
      return false;
    }

    try {
      const response = await publicPost('/api/auth/refresh', { refresh_token: refreshToken });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        setIsLoggedIn(true);
        return true;
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setIsLoggedIn(false);
        return false;
      }
    } catch (err) {
      console.error('Failed to refresh token', err);
      return false;
    }
  };

  useEffect(() => {
    // Check token on mount ONLY
    refreshAccessToken().then(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Proactive auto-refresh every 45 minutes
    if (!isLoggedIn) return;
    
    const interval = setInterval(() => {
      refreshAccessToken();
    }, 45 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setIsLoggedIn(false);
  };

  return (
    <>
      {isLoggedIn ? (
        <Home onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={() => setIsLoggedIn(true)} />
      )}
    </>
  );
}

export default App;

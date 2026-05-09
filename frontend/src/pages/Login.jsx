import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8099/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', data.role);
        
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        setError(data.detail || 'Invalid username or password');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 font-outfit relative overflow-hidden text-slate-900 transition-colors duration-300">
      <div className="w-full max-w-[420px] p-10 bg-white border border-slate-200 rounded-3xl shadow-xl z-10 relative transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-[28px] font-bold mb-2 text-slate-900">Welcome Back</h2>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form className="flex flex-col gap-5" onSubmit={handleLogin}>
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-[13px] font-medium text-slate-600 ml-1">Username</label>
            <div className="relative flex items-center group">
              <svg className="absolute left-3.5 w-[18px] h-[18px] text-slate-400 transition-colors duration-300 group-focus-within:text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <input 
                type="text" 
                id="username" 
                placeholder="Enter your username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full py-3.5 pr-3.5 pl-10 bg-white border border-slate-300 rounded-xl text-slate-900 font-inherit text-[15px] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-600/10"
                required 
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-[13px] font-medium text-slate-600 ml-1">Password</label>
            <div className="relative flex items-center group">
              <svg className="absolute left-3.5 w-[18px] h-[18px] text-slate-400 transition-colors duration-300 group-focus-within:text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input 
                type="password" 
                id="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-3.5 pr-3.5 pl-10 bg-white border border-slate-300 rounded-xl text-slate-900 font-inherit text-[15px] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-600/10"
                required 
              />
            </div>
          </div>



          <button 
            type="submit" 
            disabled={loading}
            className="group w-full py-3.5 mt-2 bg-violet-600 text-white border-none rounded-xl text-[16px] font-semibold font-inherit cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 shadow-md shadow-violet-200 hover:bg-violet-700 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-[1px] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md"
          >
            {loading ? 'Logging in...' : 'log in'}
            {!loading && (
              <svg className="w-[18px] h-[18px] transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            )}
          </button>
        </form>


      </div>
    </div>
  );
}

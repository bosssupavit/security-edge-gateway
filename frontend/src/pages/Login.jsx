import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('user1');
  const [password, setPassword] = useState('user1');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'user1' && password === 'user1') {
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } else {
      alert('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 font-outfit relative overflow-hidden text-slate-900">
      
      <div className="w-full max-w-[420px] p-10 bg-white border border-slate-200 rounded-3xl shadow-xl z-10 relative transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-violet-200">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <h2 className="text-[28px] font-bold mb-2 text-slate-800">Welcome Back</h2>
          <p className="text-sm text-slate-500 m-0">Please enter your details to sign in.</p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
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

          <div className="flex items-center justify-between text-[13px]">
            <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
              <input 
                type="checkbox" 
                className="appearance-none w-4 h-4 border border-slate-300 rounded bg-white cursor-pointer relative transition-all duration-200 checked:bg-violet-600 checked:border-violet-600 checked:after:content-[''] checked:after:absolute checked:after:top-[2px] checked:after:left-[5px] checked:after:w-1 checked:after:h-2 checked:after:border-solid checked:after:border-white checked:after:border-0 checked:after:border-b-2 checked:after:border-r-2 checked:after:rotate-45"
              />
              <span>Remember me</span>
            </label>
            <a href="#" className="text-violet-600 no-underline font-medium transition-colors duration-200 hover:text-violet-700">Forgot password?</a>
          </div>

          <button type="submit" className="group w-full py-3.5 mt-2 bg-violet-600 text-white border-none rounded-xl text-[16px] font-semibold font-inherit cursor-pointer flex items-center justify-center gap-2 transition-all duration-300 shadow-md shadow-violet-200 hover:bg-violet-700 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-[1px]">
            Sign In
            <svg className="w-[18px] h-[18px] transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Don't have an account? <a href="#" className="text-slate-800 no-underline font-medium transition-colors duration-200 hover:text-violet-600">Sign up</a></p>
        </div>
      </div>
    </div>
  );
}

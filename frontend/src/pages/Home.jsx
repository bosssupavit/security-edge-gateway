import React, { useState } from 'react';
import HeaderStats from '../components/dashboard/HeaderStats';
import CameraMonitoring from '../components/dashboard/CameraMonitoring';
import AccessControl from '../components/dashboard/AccessControl';
import SystemHealth from '../components/dashboard/SystemHealth';
import ActivityLog from '../components/dashboard/ActivityLog';
import ModbusMap from '../components/dashboard/ModbusMap';
import LogoutModal from '../components/dashboard/LogoutModal';

export default function SecurityEdgeGatewayAdminUI({ onLogout }) {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const username = localStorage.getItem('username') || 'Admin';
  const role = localStorage.getItem('role') || '';
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 font-outfit text-slate-900 transition-colors duration-300 relative">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Security Edge Gateway
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Camera Monitoring + Access Control + Modbus Gateway
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2 shadow-sm border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all group"
          >
            <div className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm shadow-violet-500/30">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-semibold text-slate-800 leading-tight">{username}</div>
              {role && <div className="text-[11px] text-slate-400 capitalize leading-tight">{role}</div>}
            </div>
            <svg className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <HeaderStats />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <CameraMonitoring />
          <AccessControl />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <SystemHealth />
          <ModbusMap />
        </div>
      </div>

      {/* Full-width Activity Log */}
      <div className="mt-6">
        <ActivityLog />
      </div>

      <LogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
        onConfirm={onLogout} 
      />
    </div>
  );
}

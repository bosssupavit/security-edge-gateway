import React, { useState } from 'react';
import HeaderStats from '../components/dashboard/HeaderStats';
import CameraMonitoring from '../components/dashboard/CameraMonitoring';
import AccessControl from '../components/dashboard/AccessControl';
import SystemHealth from '../components/dashboard/SystemHealth';
import LogoutModal from '../components/dashboard/LogoutModal';

export default function SecurityEdgeGatewayAdminUI({ onLogout }) {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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
          <button className="rounded-2xl bg-violet-600 px-5 py-2 text-white shadow-lg hover:shadow-violet-600/40 transition-all hover:-translate-y-0.5 active:translate-y-0">
            System Health
          </button>
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className="rounded-2xl bg-white px-5 py-2 shadow-sm border border-slate-200 text-rose-600 font-semibold transition-transform hover:-translate-y-0.5 active:translate-y-0 hover:bg-rose-50 hover:border-rose-200"
          >
            Logout
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
        </div>
      </div>

      <LogoutModal 
        isOpen={isLogoutModalOpen} 
        onClose={() => setIsLogoutModalOpen(false)} 
        onConfirm={onLogout} 
      />
    </div>
  );
}

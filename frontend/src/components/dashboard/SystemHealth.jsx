import React, { useState, useEffect } from 'react';

export default function SystemHealth() {
  const [healthData, setHealthData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nvrs, setNvrs] = useState([]);

  const fetchHealth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/health', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      const services = [
        { name: 'Gateway Service', desc: 'Core backend REST API', ok: data.gateway?.ok },
        { name: 'SQLite Database', desc: 'Local persistence', ok: data.sqlite?.ok },
        { name: 'Modbus TCP Server', desc: 'SCADA Integration', ok: data.modbus?.ok },
        { name: 'HikCentral API', desc: 'CCTV Integration', ok: data.hikcentral?.ok },
        { name: 'ZKBio API', desc: 'Access Control Integration', ok: data.zkbio?.ok },
      ];
      
      setHealthData(services);
    } catch (error) {
      console.error('Failed to fetch system health', error);
      setHealthData([
        { name: 'Gateway Service', desc: 'Core backend REST API', ok: false },
        { name: 'SQLite Database', desc: 'Local persistence', ok: false },
        { name: 'Modbus TCP Server', desc: 'SCADA Integration', ok: false },
        { name: 'HikCentral API', desc: 'CCTV Integration', ok: false },
        { name: 'ZKBio API', desc: 'Access Control Integration', ok: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNvrs = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/hikcentral/nvr', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNvrs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchNvrs();
    const interval = setInterval(() => {
      fetchHealth();
      fetchNvrs();
    }, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">System Health</h2>
        <p className="text-xs text-slate-600">
          Gateway and service monitoring
        </p>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          healthData.map((service, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 transition-colors hover:bg-slate-100/80">
              <div>
                <div className="text-sm font-semibold text-slate-800">{service.name}</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                  {service.desc}
                </div>
              </div>
              <div className={`h-2 w-2 rounded-full ${service.ok ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse'}`} />
            </div>
          ))
        )}
      </div>

      {nvrs.length > 0 && (
        <>
          <div className="mt-4 mb-2 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold text-slate-700">Network Video Recorders</h3>
          </div>
          <div className="flex flex-col gap-1.5">
            {nvrs.map(nvr => (
              <div key={nvr.id} className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100/80 text-[13px] justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${nvr.online ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse'}`}></div>
                  <span className="font-semibold text-slate-800">{nvr.name}</span>
                </div>
                <span className="text-slate-400 font-medium text-[11px] font-mono">{nvr.ip_address}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';

export default function HeaderStats() {
  const [stats, setStats] = useState({
    totalCameras: 0,
    onlineCameras: 0,
    offlineCameras: 0,
    doorsConnected: 0,
  });

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [camRes, zkRes] = await Promise.all([
        fetch('http://localhost:8099/api/cameras', { headers }),
        fetch('http://localhost:8099/api/zk/devices', { headers })
      ]);

      const cameras = camRes.ok ? await camRes.json() : [];
      const doors = zkRes.ok ? await zkRes.json() : [];

      const onlineCount = cameras.filter(c => c.online).length;

      setStats({
        totalCameras: cameras.length,
        onlineCameras: onlineCount,
        offlineCameras: cameras.length - onlineCount,
        doorsConnected: doors.length,
      });
    } catch (error) {
      console.error('Failed to fetch aggregate stats', error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
        <div className="text-sm font-medium text-slate-600">Total Cameras</div>
        <div className="mt-2 text-4xl font-bold text-slate-900">{stats.totalCameras}</div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
        <div className="text-sm font-medium text-slate-600">Online Cameras</div>
        <div className="mt-2 text-4xl font-bold text-emerald-600">{stats.onlineCameras}</div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
        <div className="text-sm font-medium text-slate-600">Offline Cameras</div>
        <div className="mt-2 text-4xl font-bold text-rose-600">{stats.offlineCameras}</div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
        <div className="text-sm font-medium text-slate-600">Doors Connected</div>
        <div className="mt-2 text-4xl font-bold text-blue-600">{stats.doorsConnected}</div>
      </div>
    </div>
  );
}

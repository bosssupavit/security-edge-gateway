import React, { useState, useEffect } from 'react';

export default function HeaderStats() {
  const [stats, setStats] = useState({
    totalCameras: 0,
    onlineCameras: 0,
    offlineCameras: 0,
    totalDoors: 0,
    onlineDoors: 0,
    offlineDoors: 0,
  });

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [camRes, zkRes] = await Promise.all([
        fetch('/api/devices/cameras', { headers }),
        fetch('/api/devices/zk', { headers })
      ]);

      const cameras = camRes.ok ? await camRes.json() : [];
      const doors = zkRes.ok ? await zkRes.json() : [];

      const onlineCams = cameras.filter(c => c.online).length;
      const onlineDoors = doors.filter(d => d.online).length;

      setStats({
        totalCameras: cameras.length,
        onlineCameras: onlineCams,
        offlineCameras: cameras.length - onlineCams,
        totalDoors: doors.length,
        onlineDoors,
        offlineDoors: doors.length - onlineDoors,
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
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
        <div className="text-sm font-medium text-slate-600">Total Cameras</div>
        <div className="mt-2 text-4xl font-bold text-slate-900">{stats.totalCameras}</div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
        <div className="text-sm font-medium text-slate-600">Cameras Online</div>
        <div className="mt-2 text-4xl font-bold text-emerald-600">{stats.onlineCameras}</div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
        <div className="text-sm font-medium text-slate-600">Cameras Offline</div>
        <div className="mt-2 text-4xl font-bold text-rose-600">{stats.offlineCameras}</div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
        <div className="text-sm font-medium text-slate-600">Total Doors</div>
        <div className="mt-2 text-4xl font-bold text-slate-900">{stats.totalDoors}</div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
        <div className="text-sm font-medium text-slate-600">Doors Online</div>
        <div className="mt-2 text-4xl font-bold text-emerald-600">{stats.onlineDoors}</div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200 hover:shadow-lg transition-shadow">
        <div className="text-sm font-medium text-slate-600">Doors Offline</div>
        <div className="mt-2 text-4xl font-bold text-rose-600">{stats.offlineDoors}</div>
      </div>
    </div>
  );
}

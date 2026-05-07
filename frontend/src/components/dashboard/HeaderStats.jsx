import React from 'react';

export default function HeaderStats() {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
        <div className="text-sm font-medium text-slate-500">Total Cameras</div>
        <div className="mt-2 text-4xl font-bold text-slate-800">40</div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
        <div className="text-sm font-medium text-slate-500">Online Cameras</div>
        <div className="mt-2 text-4xl font-bold text-emerald-500">37</div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
        <div className="text-sm font-medium text-slate-500">Offline Cameras</div>
        <div className="mt-2 text-4xl font-bold text-rose-500">3</div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
        <div className="text-sm font-medium text-slate-500">Doors Connected</div>
        <div className="mt-2 text-4xl font-bold text-blue-500">2</div>
      </div>
    </div>
  );
}

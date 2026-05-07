import React from 'react';
import { systemHealth } from '../../data/mockData';

export default function SystemHealth() {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">System Health</h2>
        <p className="text-sm text-slate-500">
          Gateway and service monitoring
        </p>
      </div>

      <div className="space-y-3">
        {systemHealth.map((service, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:bg-slate-100/80">
            <div>
              <div className="font-semibold text-slate-800">{service.name}</div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">
                {service.desc}
              </div>
            </div>
            <div className={`h-2.5 w-2.5 rounded-full ${service.status === 'healthy' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

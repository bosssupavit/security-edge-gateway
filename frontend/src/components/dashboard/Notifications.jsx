import React from 'react';
import { events } from '../../data/mockData';

export default function Notifications() {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">Notifications</h2>
        <p className="text-sm text-slate-500">
          Latest security events
        </p>
      </div>

      <div className="space-y-3">
        {events.map((event, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`text-xs font-bold px-2 py-1 rounded-md ${
                event.type === 'CAMERA_OFFLINE' ? 'bg-rose-100 text-rose-700' :
                event.type === 'DOOR_FORCED_OPEN' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {event.type}
              </div>
              <div className="text-xs font-medium text-slate-400">
                {event.time}
              </div>
            </div>
            <div className="text-sm font-medium text-slate-700">
              {event.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

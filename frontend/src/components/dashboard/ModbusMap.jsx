import React, { useState, useEffect } from 'react';

export default function ModbusMap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('camera');

  const fetchMap = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/modbus/register-map', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMap();
    const interval = setInterval(fetchMap, 10000);
    return () => clearInterval(interval);
  }, []);

  const cameras = data?.cctv_cameras?.cameras ?? [];
  const doors = data?.zk_access_control?.devices ?? [];

  const items = tab === 'camera' ? cameras : doors;
  const regStart = tab === 'camera' ? data?.cctv_cameras?.reg_start : data?.zk_access_control?.reg_start;
  const regEnd = tab === 'camera' ? data?.cctv_cameras?.reg_end : data?.zk_access_control?.reg_end;
  const desc = tab === 'camera' ? data?.cctv_cameras?.description : data?.zk_access_control?.description;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Modbus Register Map</h2>
          <p className="text-xs text-slate-500">Unit ID: {data?.unit_id ?? '—'} · FC{String(data?.function_code ?? '').padStart(2, '0')}</p>
        </div>
        {regStart != null && (
          <div className="text-right">
            <div className="text-xs font-mono font-bold text-violet-600">{regStart}–{regEnd}</div>
            <div className="text-[10px] text-slate-400">HR range</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-2">
        <button
          onClick={() => setTab('camera')}
          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
            tab === 'camera' ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          Cameras ({cameras.length})
        </button>
        <button
          onClick={() => setTab('door')}
          className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
            tab === 'door' ? 'bg-violet-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          Doors ({doors.length})
        </button>
      </div>

      {desc && (
        <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">{desc}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-400">No mapped devices.</div>
      ) : (
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
          {tab === 'camera' && items.map((cam) => (
            <div key={cam.id} className="flex items-center justify-between rounded-xl px-3 py-2 text-xs bg-violet-50 border border-violet-100">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0 bg-violet-400" />
                <span className="font-medium text-slate-700 truncate">{cam.camera_name}</span>
                <span className="text-slate-400 font-mono hidden sm:block">{cam.ip_address}</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="flex-shrink-0 font-mono font-semibold text-violet-600">
                  HR {cam.modbus_register} : bit {cam.channel_no}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">0 = Offline · 1 = Online</span>
              </div>
            </div>
          ))}
          {tab === 'door' && items.map((door) => (
            <div key={door.id} className="flex flex-col rounded-xl px-3 py-2 text-xs bg-violet-50 border border-violet-100 gap-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0 bg-violet-400" />
                  <span className="font-medium text-slate-700 truncate">{door.name}</span>
                  <span className="text-slate-400 font-mono hidden sm:block">{door.ip_address}</span>
                </div>
                <span className="flex-shrink-0 font-mono font-semibold text-violet-600">
                  HR {door.modbus_register} : slot {door.slot_no}
                </span>
              </div>
              <div className="pl-3.5 text-[10px] text-slate-400 font-mono">
                {`bit ${door.bit_status}=Status · bit ${door.bit_door_open}=Open · bit ${door.bit_door_closed}=Closed`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

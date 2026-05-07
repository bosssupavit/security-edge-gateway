import React, { useState } from 'react';
import { initialCameras } from '../../data/mockData';

export default function CameraMonitoring() {
  const [cameras, setCameras] = useState(initialCameras);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [cameraFilter, setCameraFilter] = useState('all');

  const filteredCameras = cameras.filter(cam => cameraFilter === 'all' || cam.status === cameraFilter);

  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Camera Monitoring</h2>
            <p className="text-sm text-slate-500">
              Realtime camera health monitoring
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select 
              value={cameraFilter}
              onChange={(e) => setCameraFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium text-slate-700 cursor-pointer hover:border-slate-300"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            <input
              placeholder="Search camera..."
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-violet-700 active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 max-h-[300px] overflow-y-auto pr-2">
          {filteredCameras.map((cam) => (
            <div
              key={cam.id}
              onClick={() => setSelectedCamera(cam)}
              className="rounded-xl border border-slate-200 p-3 transition-all hover:shadow-md hover:border-violet-300 cursor-pointer bg-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {cam.name}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                    Latency: {cam.latency}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div
                    className={`h-2 w-2 rounded-full shadow-sm ${
                      cam.status === 'online'
                        ? 'bg-emerald-500 shadow-emerald-500/50'
                        : 'bg-rose-500 shadow-rose-500/50 animate-pulse'
                    }`}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-medium">
                <div className="flex gap-1.5 items-center">
                  <span className="text-slate-500">Status:</span>
                  <span
                    className={
                      cam.status === 'online'
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }
                  >
                    {cam.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex gap-1.5 items-center">
                  <span className="text-slate-500">REC:</span>
                  <span
                    className={
                      cam.recording
                        ? 'text-blue-600'
                        : 'text-slate-400'
                    }
                  >
                    {cam.recording ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Camera Details Modal */}
      {selectedCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedCamera.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">Camera Details & Settings</p>
                </div>
                <button 
                  onClick={() => setSelectedCamera(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Status</span>
                  <span className={`text-sm font-bold ${selectedCamera.status === 'online' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedCamera.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Network Latency</span>
                  <span className="text-sm font-medium text-slate-900">{selectedCamera.latency}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Recording</span>
                  <span className={`text-sm font-bold ${selectedCamera.recording ? 'text-blue-600' : 'text-slate-400'}`}>
                    {selectedCamera.recording ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">IP Address</span>
                  <span className="text-sm font-medium text-slate-900">192.168.1.{selectedCamera.id + 100}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedCamera(null)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    if(window.confirm(`Are you sure you want to permanently delete ${selectedCamera.name}?`)) {
                      console.log('Deleted', selectedCamera.name);
                      setSelectedCamera(null);
                    }
                  }}
                  className="flex items-center justify-center gap-2 flex-1 bg-rose-50 text-rose-600 font-semibold py-2.5 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Delete Camera
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Camera Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Add New Camera</h3>
                  <p className="text-sm text-slate-500 mt-1">Configure network camera details</p>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Camera Name</label>
                  <input 
                    type="text"
                    defaultValue=""
                    placeholder="e.g. Camera-13"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">IP Address</label>
                  <input 
                    type="text"
                    defaultValue=""
                    placeholder="e.g. 192.168.1.113"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    alert('Mockup: Camera data would be submitted here.');
                    setIsAddModalOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 flex-1 bg-violet-600 text-white font-semibold py-2.5 rounded-xl hover:bg-violet-700 transition-colors"
                >
                  Activate Camera
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function CameraMonitoring() {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cameraFilter, setCameraFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCameras = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/cameras', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch cameras');
      const data = await response.json();
      setCameras(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to the API.');
    }
  };

  useEffect(() => {
    fetchCameras().then(() => setLoading(false));
    
    const interval = setInterval(() => {
      fetchCameras();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedCamera || isEditModalOpen) return;

    const fetchCameraStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/devices/cameras/${selectedCamera.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        setSelectedCamera(data);
      } catch (err) {
        console.error(err);
      }
    };

    const interval = setInterval(fetchCameraStatus, 3000);
    return () => clearInterval(interval);
  }, [selectedCamera?.id, isEditModalOpen]);

  const handleUpdateCamera = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        camera_name: selectedCamera.camera_name,
        ip_address: selectedCamera.ip_address,
        modbus_register: selectedCamera.modbus_register ? parseInt(selectedCamera.modbus_register) : null,
        channel_no: selectedCamera.channel_no !== '' && selectedCamera.channel_no !== null ? parseInt(selectedCamera.channel_no) : null,
      };

      const response = await fetch(`/api/devices/cameras/${selectedCamera.id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setIsEditModalOpen(false);
        fetchCameras();
      } else {
        alert('Failed to update camera');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating camera');
    }
  };

  const filteredCameras = cameras.filter(cam => {
    if (cameraFilter === 'all') return true;
    if (cameraFilter === 'online') return cam.online;
    if (cameraFilter === 'offline') return !cam.online;
    return true;
  });

  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200 transition-colors duration-200">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Camera Monitoring</h2>
            <p className="text-sm text-slate-600">
              Realtime CCTV health & Modbus mapping
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
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
          </div>
        ) : (
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
                      {cam.camera_name}
                    </div>
                    <div className="mt-0.5 text-[11px] font-medium text-slate-500 truncate w-40">
                      {cam.ip_address || '-'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-2 w-2 rounded-full shadow-sm ${
                        cam.online
                          ? 'bg-emerald-500 shadow-emerald-500/50'
                          : 'bg-rose-500 shadow-rose-500/50 animate-pulse'
                      }`}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    cam.online ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {cam.online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    cam.modbus_register !== null
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}>
                    {cam.modbus_register !== null ? `HR ${cam.modbus_register}:${cam.channel_no}` : 'NOT MAPPED'}
                  </span>
                </div>
              </div>
            ))}
            {filteredCameras.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500 text-sm">
                No cameras found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera Details Modal */}
      {selectedCamera && !isEditModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedCamera.camera_name}</h3>
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
                  <span className={`text-sm font-bold ${selectedCamera.online ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedCamera.online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">IP Address</span>
                  <span className="text-sm font-medium text-slate-900">{selectedCamera.ip_address}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">NVR</span>
                  <span className="text-sm font-medium text-slate-900">{selectedCamera.nvr ? selectedCamera.nvr.name : '-'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Modbus Register</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedCamera.modbus_register !== null ? `HR ${selectedCamera.modbus_register}` : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Modbus Channel (Bit)</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedCamera.channel_no !== null ? selectedCamera.channel_no : '-'}
                  </span>
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
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center justify-center gap-2 flex-1 bg-violet-50 text-violet-600 font-semibold py-2.5 rounded-xl hover:bg-violet-100 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Edit Config
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Edit Camera Config Modal */}
      {isEditModalOpen && selectedCamera && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Edit Camera Settings</h3>
                  <p className="text-sm text-slate-500 mt-1">Update network and Modbus config</p>
                </div>
                <button 
                  onClick={() => {
                    setIsEditModalOpen(false);
                    const original = cameras.find(c => c.id === selectedCamera.id);
                    if (original) setSelectedCamera(original);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpdateCamera}>
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Camera Name</label>
                    <input 
                      type="text"
                      value={selectedCamera.camera_name || ''}
                      onChange={(e) => setSelectedCamera({...selectedCamera, camera_name: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-slate-900 placeholder:text-slate-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">IP Address</label>
                    <input 
                      type="text"
                      value={selectedCamera.ip_address || ''}
                      onChange={(e) => setSelectedCamera({...selectedCamera, ip_address: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Modbus Register (HR)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 40010"
                        value={selectedCamera.modbus_register || ''}
                        onChange={(e) => setSelectedCamera({...selectedCamera, modbus_register: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Channel (Bit 0-15)</label>
                      <input 
                        type="number"
                        min="0"
                        max="15"
                        placeholder="e.g. 0"
                        value={selectedCamera.channel_no !== null ? selectedCamera.channel_no : ''}
                        onChange={(e) => setSelectedCamera({...selectedCamera, channel_no: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      const original = cameras.find(c => c.id === selectedCamera.id);
                      if (original) setSelectedCamera(original);
                    }}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex items-center justify-center gap-2 flex-1 bg-violet-600 text-white font-semibold py-2.5 rounded-xl hover:bg-violet-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function AccessControl() {
  const [doors, setDoors] = useState([]);
  const [selectedDoor, setSelectedDoor] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchDoors = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const res = await fetch('/api/devices/zk', { headers });
      if (!res.ok) throw new Error('Failed to fetch access control data');

      const data = await res.json();
      setDoors(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to the API.');
    }
  };

  useEffect(() => {
    fetchDoors().then(() => setLoading(false));
    
    const interval = setInterval(() => {
      fetchDoors();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedDoor || isEditModalOpen) return;

    const fetchDoorStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/devices/zk/${selectedDoor.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        setSelectedDoor(data);
      } catch (err) {
        console.error(err);
      }
    };

    const interval = setInterval(fetchDoorStatus, 3000);
    return () => clearInterval(interval);
  }, [selectedDoor?.id, isEditModalOpen]);

  const handleUpdateDoor = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        ip_address: selectedDoor.ip_address,
        modbus_register: selectedDoor.modbus_register ? parseInt(selectedDoor.modbus_register) : null,
        slot_no: selectedDoor.slot_no !== '' && selectedDoor.slot_no !== null ? parseInt(selectedDoor.slot_no) : null,
      };

      const response = await fetch(`/api/devices/zk/${selectedDoor.id}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        setIsEditModalOpen(false);
        fetchDoors();
      } else {
        alert('Failed to update door config');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating door config');
    }
  };

  const filteredDoors = doors.filter(door => {
    if (statusFilter === 'online' && !door.online) return false;
    if (statusFilter === 'offline' && door.online) return false;
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    const displayName = door.door_name || door.name || '';
    return displayName.toLowerCase().includes(search) ||
           (door.ip_address && door.ip_address.toLowerCase().includes(search));
  });

  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200 transition-colors duration-200">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Access Control</h2>
            <p className="text-sm text-slate-600">
              Door controller realtime status & mapping
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium text-slate-700 cursor-pointer hover:border-slate-300"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            <input
              placeholder="Search door..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 min-h-[300px] max-h-[300px] overflow-y-auto pr-2">
            {filteredDoors.map((door) => {
              const isOpen = door.door_opened;
              const hasAlarm = door.alarm === '2' || door.alarm === 2;
              const displayName = door.door_name || door.name || 'Unknown Door';
              return (
                <div
                  key={door.id}
                  onClick={() => setSelectedDoor(door)}
                  className={`rounded-xl border bg-white p-3 transition-all hover:shadow-md cursor-pointer ${
                    hasAlarm ? 'border-rose-300 bg-rose-50 hover:border-rose-400' : 'border-slate-200 hover:border-violet-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{displayName}</div>
                      <div className="mt-0.5 text-[10px] text-slate-400 font-mono">{door.ip_address || door.sn}</div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-slate-500">
                        <span>Door:</span>
                        <span className={`capitalize ${isOpen ? 'text-amber-600' : 'text-slate-700'}`}>
                          {isOpen ? 'Open' : 'Closed'}
                        </span>
                        {hasAlarm && (
                          <span className="text-rose-600 font-bold">⚠ Alarm</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-slate-500">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          door.modbus_register !== null ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {door.modbus_register !== null ? `HR ${door.modbus_register}:${door.slot_no}` : 'Not Mapped'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <div
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          door.online
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {door.online ? 'Online' : 'Offline'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredDoors.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500 text-sm">
                No access control devices found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Door Details Modal */}
      {selectedDoor && !isEditModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedDoor.door_name || selectedDoor.name || 'Unknown Door'}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedDoor.sn}</p>
                  <p className="text-sm text-slate-500 mt-1">Door Controller Details & Mapping</p>
                </div>
                <button 
                  onClick={() => setSelectedDoor(null)}
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
                  <span className={`text-sm font-bold uppercase ${selectedDoor.online ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedDoor.online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Door State</span>
                  <span className={`text-sm font-bold capitalize ${selectedDoor.door_opened ? 'text-amber-600' : 'text-slate-700'}`}>
                    {selectedDoor.door_opened ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Alarm</span>
                  <span className={`text-sm font-bold ${
                    selectedDoor.alarm === '2' || selectedDoor.alarm === 2 ? 'text-rose-600' : 'text-emerald-600'
                  }`}>
                    {selectedDoor.alarm === '2' || selectedDoor.alarm === 2 ? 'ALARM ACTIVE' : 'Normal'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Device Name</span>
                  <span className="text-sm font-medium text-slate-900">{selectedDoor.name || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">IP Address</span>
                  <span className="text-sm font-medium text-slate-900">{selectedDoor.ip_address || '-'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Modbus Register</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedDoor.modbus_register !== null ? `HR ${selectedDoor.modbus_register}` : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Modbus Slot (Device 0-4)</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedDoor.slot_no !== null ? selectedDoor.slot_no : '-'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedDoor(null)}
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

      {/* Edit Door Config Modal */}
      {isEditModalOpen && selectedDoor && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Edit Door Settings</h3>
                  <p className="text-sm text-slate-500 mt-1">Update controller alias and Modbus config</p>
                </div>
                <button 
                  onClick={() => {
                    setIsEditModalOpen(false);
                    const original = doors.find(d => d.id === selectedDoor.id);
                    if (original) setSelectedDoor(original);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpdateDoor}>
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Door Name (from ZKBio)</label>
                    <input 
                      type="text"
                      value={selectedDoor.door_name || ''}
                      disabled
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">IP Address</label>
                    <input 
                      type="text"
                      value={selectedDoor.ip_address || ''}
                      onChange={(e) => setSelectedDoor({...selectedDoor, ip_address: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Modbus Register (HR)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 40000"
                        value={selectedDoor.modbus_register || ''}
                        onChange={(e) => setSelectedDoor({...selectedDoor, modbus_register: e.target.value})}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Slot No (0-4)</label>
                      <input 
                        type="number"
                        min="0"
                        max="4"
                        placeholder="e.g. 0"
                        value={selectedDoor.slot_no !== null ? selectedDoor.slot_no : ''}
                        onChange={(e) => setSelectedDoor({...selectedDoor, slot_no: e.target.value})}
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
                      const original = doors.find(d => d.id === selectedDoor.id);
                      if (original) setSelectedDoor(original);
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

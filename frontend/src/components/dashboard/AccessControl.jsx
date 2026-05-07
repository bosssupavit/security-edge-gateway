import React, { useState } from 'react';
import { initialDoors } from '../../data/mockData';

export default function AccessControl() {
  const [doors, setDoors] = useState(initialDoors);
  const [selectedDoor, setSelectedDoor] = useState(null);
  const [isAddDoorModalOpen, setIsAddDoorModalOpen] = useState(false);

  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Access Control</h2>
            <p className="text-sm text-slate-500">
              Door controller realtime status
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              placeholder="Search door..."
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
            />
            <button 
              onClick={() => setIsAddDoorModalOpen(true)}
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 max-h-[300px] overflow-y-auto pr-2">
          {doors.map((door) => (
            <div
              key={door.id}
              onClick={() => setSelectedDoor(door)}
              className="rounded-xl border border-slate-200 bg-white p-3 transition-all hover:shadow-md hover:border-violet-300 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    {door.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-slate-500">
                    <span>State:</span>
                    <span className={`capitalize ${door.state === 'open' ? 'text-amber-600' : 'text-slate-700'}`}>
                      {door.state}
                    </span>
                  </div>
                </div>

                <div
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    door.locked
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {door.locked ? 'Locked' : 'Unlocked'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Door Details Modal */}
      {selectedDoor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedDoor.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">Door Controller Details</p>
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
                  <span className="text-sm font-medium text-slate-500">Door State</span>
                  <span className={`text-sm font-bold capitalize ${selectedDoor.state === 'open' ? 'text-amber-600' : 'text-slate-700'}`}>
                    {selectedDoor.state}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="text-sm font-medium text-slate-500">Lock Status</span>
                  <span className={`text-sm font-bold uppercase ${selectedDoor.locked ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {selectedDoor.locked ? 'LOCKED' : 'UNLOCKED'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mb-3">
                <button className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/30 transition-all hover:bg-blue-700 active:scale-95">
                  Unlock
                </button>
                <button className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95">
                  Lock
                </button>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedDoor(null)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    if(window.confirm(`Are you sure you want to permanently delete ${selectedDoor.name}?`)) {
                      console.log('Deleted', selectedDoor.name);
                      setSelectedDoor(null);
                    }
                  }}
                  className="flex items-center justify-center gap-2 flex-1 bg-rose-50 text-rose-600 font-semibold py-2.5 rounded-xl hover:bg-rose-100 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Delete Door
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Door Modal */}
      {isAddDoorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Add New Door</h3>
                  <p className="text-sm text-slate-500 mt-1">Configure door controller</p>
                </div>
                <button 
                  onClick={() => setIsAddDoorModalOpen(false)}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Door Name</label>
                  <input 
                    type="text"
                    defaultValue=""
                    placeholder="e.g. Back Entrance"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsAddDoorModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    alert('Mockup: Door data would be submitted here.');
                    setIsAddDoorModalOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 flex-1 bg-violet-600 text-white font-semibold py-2.5 rounded-xl hover:bg-violet-700 transition-colors"
                >
                  Activate Door
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

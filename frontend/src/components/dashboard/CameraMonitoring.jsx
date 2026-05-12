import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const emptyDraft = {
  camera_name: '',
  ip_address: '',
  modbus_register: '',
  channel_no: '',
};

const buildDraft = (camera = {}) => ({
  camera_name: camera.camera_name || '',
  ip_address: camera.ip_address || '',
  modbus_register: camera.modbus_register ?? '',
  channel_no: camera.channel_no ?? '',
});

const parseOptionalInt = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  return parseInt(value, 10);
};

const isValidIp = (value) =>
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)){3}$/.test(value.trim());

export default function CameraMonitoring() {
  const [serverCameras, setServerCameras] = useState([]);
  const [localCameras, setLocalCameras] = useState([]);
  const [localOverrides, setLocalOverrides] = useState({});
  const [hiddenCameraIds, setHiddenCameraIds] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [cameraDraft, setCameraDraft] = useState(emptyDraft);
  const [modalMode, setModalMode] = useState(null);
  const [cameraToDelete, setCameraToDelete] = useState(null);
  const [cameraFilter, setCameraFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ipError, setIpError] = useState('');

  const cameras = useMemo(() => {
    const hidden = new Set(hiddenCameraIds);
    const mergedServer = serverCameras
      .filter((cam) => !hidden.has(cam.id))
      .map((cam) => ({ ...cam, ...(localOverrides[cam.id] || {}) }));

    return [...localCameras, ...mergedServer];
  }, [hiddenCameraIds, localCameras, localOverrides, serverCameras]);

  const fetchCameras = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/devices/cameras', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch cameras');

      const data = await response.json();
      setServerCameras(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not connect to the API.');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCameras().then(() => setLoading(false));

    const interval = setInterval(() => {
      fetchCameras();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedCamera || modalMode) return;

    const fetchCameraStatus = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/devices/cameras/${selectedCamera.id}`, {
          headers: { Authorization: `Bearer ${token}` },
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
  }, [selectedCamera?.id, modalMode]);

  const closeFormModal = () => {
    setModalMode(null);
    setCameraDraft(emptyDraft);
    setIpError('');
  };

  const openAddModal = () => {
    setSelectedCamera(null);
    setCameraDraft(emptyDraft);
    setModalMode('add');
  };

  const openEditModal = (camera) => {
    setSelectedCamera(camera);
    setCameraDraft(buildDraft(camera));
    setModalMode('edit');
  };

  const buildCameraFromDraft = (base = {}) => {
    return {
      ...base,
      camera_name: cameraDraft.camera_name.trim(),
      ip_address: cameraDraft.ip_address.trim(),
      modbus_register: parseOptionalInt(cameraDraft.modbus_register),
      channel_no: parseOptionalInt(cameraDraft.channel_no),
    };
  };

  const handleSaveCamera = async (event) => {
    event.preventDefault();

    const ip = cameraDraft.ip_address.trim();
    if (ip && !isValidIp(ip)) {
      setIpError('Invalid IP address');
      return;
    }
    setIpError('');

    if (modalMode === 'add') {
      const createdCamera = buildCameraFromDraft({
        id: `local-${Date.now()}`,
        index_code: '',
        ip_address: '',
        record_type: '',
        record_location: '',
        region_index_code: '',
        site_index_code: '',
        isLocal: true,
      });

      setLocalCameras((current) => [createdCamera, ...current]);
      closeFormModal();
      return;
    }

    if (!selectedCamera) return;

    const updatedCamera = buildCameraFromDraft(selectedCamera);

    if (selectedCamera.isLocal) {
      setLocalCameras((current) =>
        current.map((cam) => (cam.id === selectedCamera.id ? updatedCamera : cam))
      );
      setSelectedCamera(updatedCamera);
      closeFormModal();
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        camera_name: cameraDraft.camera_name.trim(),
        ip_address: cameraDraft.ip_address.trim(),
        modbus_register: parseOptionalInt(cameraDraft.modbus_register),
        channel_no: parseOptionalInt(cameraDraft.channel_no),
      };

      const response = await fetch(`/api/devices/cameras/${selectedCamera.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update camera');

      // Clear override so fresh server data flows through after refetch
      setLocalOverrides((current) => {
        const next = { ...current };
        delete next[selectedCamera.id];
        return next;
      });
      closeFormModal();
      fetchCameras();
    } catch (err) {
      console.error(err);
      alert('Error updating camera');
    }
  };

  const handleDeleteCamera = async () => {
    if (!cameraToDelete) return;

    if (cameraToDelete.isLocal) {
      setLocalCameras((current) => current.filter((cam) => cam.id !== cameraToDelete.id));
    } else {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`/api/devices/cameras/${cameraToDelete.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to delete camera');
      } catch (err) {
        console.error(err);
        alert('Error deleting camera');
        setCameraToDelete(null);
        return;
      }

      setHiddenCameraIds((current) => [...new Set([...current, cameraToDelete.id])]);
      setLocalOverrides((current) => {
        const next = { ...current };
        delete next[cameraToDelete.id];
        return next;
      });
      fetchCameras();
    }

    if (selectedCamera?.id === cameraToDelete.id) {
      setSelectedCamera(null);
    }

    setCameraToDelete(null);
  };

  const filteredCameras = cameras.filter((cam) => {
    if (cameraFilter === 'online' && !cam.online) return false;
    if (cameraFilter === 'offline' && cam.online) return false;

    if (!searchQuery.trim()) return true;

    const search = searchQuery.toLowerCase();
    return [
      cam.camera_name,
      cam.ip_address,
      cam.nvr?.name,
      cam.nvr?.ip_address,
      cam.modbus_register,
      cam.channel_no,
    ]
      .filter((value) => value !== null && value !== undefined)
      .some((value) => String(value).toLowerCase().includes(search));
  });

  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-md border border-slate-200 transition-colors duration-200">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Camera Monitoring</h2>
            <p className="text-sm text-slate-600">
              Realtime CCTV health & Modbus mapping
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={cameraFilter}
              onChange={(e) => setCameraFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition-all hover:border-slate-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
            <input
              placeholder="Search camera..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition-all hover:bg-violet-700 active:scale-95"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Add camera
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
          </div>
        ) : (
          <div className="grid max-h-[360px] grid-cols-1 gap-3 overflow-y-auto pr-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredCameras.map((cam) => (
              <div
                key={cam.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-violet-300 hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setSelectedCamera(cam)}
                  className="block w-full p-3 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {cam.camera_name}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                        IP: {cam.ip_address || '-'}
                      </div>
                    </div>

                    <div
                      className={`h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ${
                        cam.online
                          ? 'bg-emerald-500 shadow-emerald-500/50'
                          : 'animate-pulse bg-rose-500 shadow-rose-500/50'
                      }`}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Status:</span>
                      <span className={cam.online ? 'text-emerald-600' : 'text-rose-600'}>
                        {cam.online ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>

                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="text-slate-500">Modbus:</span>
                      <span className={cam.modbus_register !== null ? 'text-violet-600' : 'text-slate-400'}>
                        {cam.modbus_register !== null ? `HR ${cam.modbus_register}:${cam.channel_no ?? '-'}` : 'NOT MAPPED'}
                      </span>
                    </div>
                  </div>
                </button>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(cam)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraToDelete(cam)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M6 6l1 16h10l1-16" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {filteredCameras.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-slate-500">
                No cameras found.
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCamera && !modalMode && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedCamera.camera_name}</h3>
                  <p className="mt-1 text-sm text-slate-500">Camera Details & Settings</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCamera(null)}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-8 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 py-3">
                  <span className="text-sm font-medium text-slate-500">Status</span>
                  <span className={`text-sm font-bold ${selectedCamera.online ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedCamera.online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-3">
                  <span className="text-sm font-medium text-slate-500">IP Address</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedCamera.ip_address || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 py-3">
                  <span className="text-sm font-medium text-slate-500">Modbus Address</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedCamera.modbus_register !== null ? `HR ${selectedCamera.modbus_register}:${selectedCamera.channel_no ?? '-'}` : '-'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCamera(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(selectedCamera)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-50 py-2.5 font-semibold text-violet-600 transition-colors hover:bg-violet-100"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {modalMode && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {modalMode === 'add' ? 'Add Camera' : 'Edit Camera'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Camera profile and Modbus address</p>
                </div>
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveCamera}>
                <div className="mb-8 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Camera Name</label>
                    <input
                      type="text"
                      value={cameraDraft.camera_name}
                      onChange={(e) => setCameraDraft({ ...cameraDraft, camera_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">IP Address</label>
                    <input
                      type="text"
                      value={cameraDraft.ip_address}
                      onChange={(e) => {
                        setCameraDraft({ ...cameraDraft, ip_address: e.target.value });
                        if (ipError) setIpError('');
                      }}
                      placeholder="e.g. 192.168.1.10"
                      className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-2 ${
                        ipError
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-violet-500 focus:ring-violet-500/20'
                      }`}
                    />
                    {ipError && (
                      <p className="mt-1 text-xs text-rose-500">{ipError}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Modbus Address</label>
                      <input
                        type="number"
                        placeholder="40010"
                        value={cameraDraft.modbus_register}
                        onChange={(e) => setCameraDraft({ ...cameraDraft, modbus_register: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Bit</label>
                      <input
                        type="number"
                        min="0"
                        max="15"
                        placeholder="0"
                        value={cameraDraft.channel_no}
                        onChange={(e) => setCameraDraft({ ...cameraDraft, channel_no: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 font-semibold text-white transition-colors hover:bg-violet-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      , document.body)}

      {cameraToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
            <div className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete camera?</h3>
              <p className="mt-2 text-sm text-slate-600">
                This will remove {cameraToDelete.camera_name || 'this camera'} from the current list.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setCameraToDelete(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCamera}
                  className="flex-1 rounded-xl bg-rose-600 py-2.5 font-semibold text-white transition-colors hover:bg-rose-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}

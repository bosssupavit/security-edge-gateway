export const initialCameras = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Camera-${String(i + 1).padStart(2, '0')}`,
  status: i % 4 === 0 ? 'offline' : 'online',
  latency: `${80 + i * 5} ms`,
  recording: i % 3 !== 0,
  ip: `192.168.1.${100 + i + 1}`
}));

export const initialDoors = [
  {
    id: 1,
    name: 'Main Entrance',
    state: 'closed',
    locked: true,
  },
  {
    id: 2,
    name: 'Server Room',
    state: 'open',
    locked: false,
  },
];

export const events = [
  {
    time: '10:45:11',
    type: 'ACCESS_GRANTED',
    detail: 'Door Main Entrance - User 1001',
  },
  {
    time: '10:44:02',
    type: 'CAMERA_OFFLINE',
    detail: 'Camera-04 disconnected',
  },
  {
    time: '10:42:55',
    type: 'DOOR_FORCED_OPEN',
    detail: 'Server Room',
  },
];

export const systemHealth = [
  { name: 'Modbus', desc: 'Running normally', status: 'healthy' },
  { name: 'HikCentral API', desc: 'Connected', status: 'healthy' },
  { name: 'ZKTeco PUSH', desc: 'Port 8088 listening', status: 'healthy' },
  { name: 'SQLite', desc: 'Healthy', status: 'healthy' }
];

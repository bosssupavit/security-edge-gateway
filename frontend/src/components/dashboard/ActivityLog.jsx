import React, { useState, useEffect, useRef } from 'react';

const EVENT_STYLES = {
  ACCESS_GRANTED:    { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ACCESS_DENIED:     { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500' },
  DOOR_FORCED_OPEN:  { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  DOOR_OPENED:       { bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-400' },
  DOOR_CLOSED:       { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400' },
  CAMERA_OFFLINE:    { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500' },
  CAMERA_ONLINE:     { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ALARM:             { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-600' },
  ERROR:             { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500' },
  WARNING:           { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  WARN:              { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  INFO:              { bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-400' },
  LOG:               { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400' },
};

const DEFAULT_STYLE = { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-400' };

function getStyle(type) {
  if (!type) return DEFAULT_STYLE;
  const key = Object.keys(EVENT_STYLES).find(k => type.toUpperCase().includes(k));
  return key ? EVENT_STYLES[key] : DEFAULT_STYLE;
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return ts;
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  const today = new Date();
  if (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  ) return 'Today';
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' });
}

const FILTERS = ['ALL', 'INFO', 'ERROR'];

function matchFilter(log, filter) {
  if (filter === 'ALL') return true;
  const type = (log.event_type || log.type || '').toUpperCase();
  if (filter === 'INFO') return type === 'INFO' || type === 'LOG';
  if (filter === 'ERROR') return type === 'ERROR' || type === 'WARNING' || type === 'WARN';
  return true;
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [newIds, setNewIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const prevIdsRef = useRef(new Set());
  const listRef = useRef(null);

  const parseTextLogs = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    return lines.map((line, idx) => {
      // Format: HH:MM:SS [LEVEL] module: message
      const m = line.match(/^(\d{2}:\d{2}:\d{2})\s+\[(\w+)\]\s+([^:]+):\s+(.+)$/);
      if (m) {
        const [, time, level, module, message] = m;
        const levelUpper = level.toUpperCase();
        const type =
          levelUpper === 'ERROR' ? 'ERROR' :
          levelUpper === 'WARNING' || levelUpper === 'WARN' ? 'WARNING' :
          levelUpper === 'INFO' ? 'INFO' : level;
        return {
          id: `text-${idx}-${line.slice(0, 20)}`,
          event_type: type,
          detail: `[${module}] ${message}`,
          timestamp: time,
        };
      }
      return {
        id: `text-${idx}`,
        event_type: 'LOG',
        detail: line,
        timestamp: '',
      };
    }).reverse();
  };

  const fetchLogs = async (isInitial = false) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/logs?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch logs');

      const contentType = response.headers.get('content-type') || '';
      let items;
      if (contentType.includes('application/json')) {
        const data = await response.json();
        items = Array.isArray(data) ? data : (data.items || data.logs || []);
      } else {
        const text = await response.text();
        items = parseTextLogs(text);
      }

      if (!isInitial) {
        const incoming = new Set(items.map(l => l.id));
        const fresh = new Set([...incoming].filter(id => !prevIdsRef.current.has(id)));
        if (fresh.size > 0) {
          setNewIds(fresh);
          setTimeout(() => setNewIds(new Set()), 2000);
        }
      }

      prevIdsRef.current = new Set(items.map(l => l.id));
      setLogs(items);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Could not load activity logs.');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(true);
    const interval = setInterval(() => fetchLogs(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = logs.filter(l => {
    if (!matchFilter(l, filter)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (l.event_type || l.type || '').toLowerCase().includes(q) ||
      (l.detail || l.description || l.message || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="rounded-3xl bg-white p-5 shadow-md border border-slate-200 flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Activity Log</h2>
          <p className="text-xs text-slate-500">Security events · live</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[11px] font-medium text-emerald-600">Live</span>
        </div>
      </div>

      {/* Filter tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                filter === f
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs ml-auto">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-slate-800 placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Log list */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-2 max-h-[400px] pr-1"
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-sm text-rose-500 text-center py-6">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-8">No events found.</div>
        ) : (
          filtered.map((log) => {
            const style = getStyle(log.event_type || log.type);
            const isNew = newIds.has(log.id);
            const type = log.event_type || log.type || 'EVENT';
            const detail = log.detail || log.description || log.message || '';
            const ts = log.timestamp || log.created_at || log.time || '';

            return (
              <div
                key={log.id}
                className={`rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                  isNew
                    ? 'border-violet-300 bg-violet-50 shadow-sm'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${style.bg} ${style.text} truncate`}>
                      {type}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap flex-shrink-0">
                    <span className="mr-1">{formatDate(ts)}</span>
                    {formatTime(ts)}
                  </div>
                </div>
                {detail && (
                  <p className="text-xs text-slate-600 pl-3 leading-snug">{detail}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

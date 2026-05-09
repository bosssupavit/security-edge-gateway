/**
 * Central API helper.
 * Uses relative URLs so the frontend works regardless of host/port.
 * In dev, Vite's proxy forwards /api → http://localhost:8099
 * In production (served by FastAPI), same origin is used automatically.
 */

const getToken = () => localStorage.getItem('access_token');

export const apiGet = (path) =>
  fetch(path, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

export const apiPost = (path, body) =>
  fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });

export const apiPatch = (path, body) =>
  fetch(path, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });

/** Unauthenticated POST (for login/refresh) */
export const publicPost = (path, body) =>
  fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

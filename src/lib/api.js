const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Une erreur est survenue.');
  return data;
}

export function registerAccount(payload) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export function loginAccount(payload) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}

export function getCurrentUser() {
  const token = localStorage.getItem('eventbridge_token');
  if (!token) return Promise.resolve(null);
  return request('/me', { headers: { Authorization: `Bearer ${token}` } }).then((result) => result.user).catch(() => {
    localStorage.removeItem('eventbridge_token');
    return null;
  });
}

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('eventbridge_token')}` };
}

export function updateCurrentUser(payload) {
  return request('/me', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
}

export function deleteCurrentUser() {
  return request('/me', { method: 'DELETE', headers: authHeaders() });
}

export function getProviderProfile() {
  return request('/me/provider-profile', { headers: authHeaders() });
}

export function updateProviderProfile(payload) {
  return request('/me/provider-profile', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
}

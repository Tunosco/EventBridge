const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api');

async function request(path, options = {}) {
  const { headers: optionHeaders, ...requestOptions } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: { 'Content-Type': 'application/json', ...(optionHeaders || {}) },
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

export function completeEmailConfirmation(accessToken) {
  return request('/auth/confirm', {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
  });
}

export function getCurrentUser() {
  const token = localStorage.getItem('eventbridge_token');
  if (!token) return Promise.resolve(null);
  return request('/me', { headers: { Authorization: `Bearer ${token}` } })
    .then((result) => result.user)
    .catch(() => {
      if (localStorage.getItem('eventbridge_token') === token) {
        localStorage.removeItem('eventbridge_token');
      }
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

export function getMyEvents() {
  return request('/me/events', { headers: authHeaders() });
}

export function getEventTypes() {
  return request('/reference/event-types');
}

export function createEvent(payload) {
  return request('/me/events', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
}

export function updateEvent(eventId, payload) {
  return request(`/me/events/${eventId}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
}

export function searchProviders(search, favoritesOnly = false) {
  const parameters = new URLSearchParams();
  if (search) parameters.set('q', search);
  if (favoritesOnly) parameters.set('favoris', 'true');
  const token = localStorage.getItem('eventbridge_token');
  return request(`/providers?${parameters.toString()}`, { headers: token ? authHeaders() : {} });
}

export function favoriteProvider(providerId) {
  return request(`/me/favorite-providers/${providerId}`, { method: 'POST', headers: authHeaders() });
}

export function unfavoriteProvider(providerId) {
  return request(`/me/favorite-providers/${providerId}`, { method: 'DELETE', headers: authHeaders() });
}

export function updateEventProviders(eventId, prestatairesIds) {
  return request(`/me/events/${eventId}/providers`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ prestatairesIds }),
  });
}

export function getProviderProfile() {
  return request('/me/provider-profile', { headers: authHeaders() });
}

export function updateProviderProfile(payload) {
  return request('/me/provider-profile', { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
}

export function getProviderDashboard(includePastEvents = false) {
  const query = includePastEvents ? '?includePastEvents=true' : '';
  return request(`/me/provider-dashboard${query}`, { headers: authHeaders() });
}

export function getAvailability() {
  return request('/me/availability', { headers: authHeaders() });
}

export function createAvailability(payload) {
  return request('/me/availability', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
}

export function updateAvailability(id, payload) {
  return request(`/me/availability/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
}

export function deleteAvailability(id) {
  return request(`/me/availability/${id}`, { method: 'DELETE', headers: authHeaders() });
}

export function getProviderTasks() {
  return request('/me/tasks', { headers: authHeaders() });
}

export function createProviderTask(payload) {
  return request('/me/tasks', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
}

export function updateProviderTask(id, payload) {
  return request(`/me/tasks/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(payload) });
}

export function deleteProviderTask(id) {
  return request(`/me/tasks/${id}`, { method: 'DELETE', headers: authHeaders() });
}

export function getConversations() {
  return request('/me/conversations', { headers: authHeaders() });
}

export function createConversation(prestataireId) {
  return request('/me/conversations', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ prestataireId }),
  });
}

export function getConversationMessages(conversationId) {
  return request(`/me/conversations/${conversationId}/messages`, { headers: authHeaders() });
}

export function sendConversationMessage(conversationId, contenu) {
  return request(`/me/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ contenu }),
  });
}

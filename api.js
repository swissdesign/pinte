import { getDemoEvents } from './script.js';

const API_BASE = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

function normaliseBase() {
  return API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
}

function isConfigured() {
  return API_BASE && API_BASE !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
}

async function api(path, { method = 'GET', body } = {}) {
  if (!isConfigured()) {
    if (path.startsWith('/events')) {
      return { events: getDemoEvents() };
    }
    if (path.startsWith('/booking')) {
      await new Promise(resolve => setTimeout(resolve, 400));
      return { ok: true, demo: true };
    }
    return { ok: true };
  }

  const url = `${normaliseBase()}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    mode: 'cors'
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export async function fetchNextEvents(limit = 3) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit);
  const result = await api(`/events?${params.toString()}`);
  return Array.isArray(result.events) ? result.events : result;
}

export async function fetchEvents({ limit = null, from = null, to = null } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const search = params.toString();
  const result = await api(`/events${search ? `?${search}` : ''}`);
  return Array.isArray(result.events) ? result.events : result;
}

export async function submitBooking(payload) {
  return api('/booking', { method: 'POST', body: payload });
}

export function getApiStatus() {
  return { configured: isConfigured(), baseUrl: API_BASE };
}

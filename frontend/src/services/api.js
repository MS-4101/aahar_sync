const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const authStorage = {
  getToken: () => localStorage.getItem('aaharin_token'),
  setToken: (token) => localStorage.setItem('aaharin_token', token),
  clearToken: () => localStorage.removeItem('aaharin_token'),
  getUser: () => {
    try {
      const raw = localStorage.getItem('aaharin_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => localStorage.setItem('aaharin_user', JSON.stringify(user)),
  clearUser: () => localStorage.removeItem('aaharin_user'),
};

/**
 * REST fetch for initial state
 */
export async function fetchLiveState(restaurantId) {
  try {
    const res = await fetch(`${API_BASE}/sync/live/${restaurantId}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error('Failed to fetch initial state:', err);
    return null;
  }
}

/**
 * REST fetch for historical report & orders by date
 */
export async function fetchHistoricalReport(restaurantId, date) {
  try {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    const res = await fetch(`${API_BASE}/sync/historical/${restaurantId}${q}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to fetch historical report:', err);
    return null;
  }
}

/**
 * Server-Sent Events (SSE) Live Stream
 */
export function subscribeToLiveStream(restaurantId, onUpdate, onStatusChange) {
  const eventSource = new EventSource(`${API_BASE}/sync/stream/${restaurantId}`);

  eventSource.onopen = () => {
    onStatusChange(true);
  };

  eventSource.addEventListener('live_update', (event) => {
    try {
      const payload = JSON.parse(event.data);
      onUpdate(payload);
      onStatusChange(true);
    } catch (err) {
      console.error('Failed to parse SSE payload:', err);
    }
  });

  eventSource.onerror = () => {
    onStatusChange(false);
  };

  return () => {
    eventSource.close();
  };
}

/**
 * User Login
 */
export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Login failed.');
  }

  const data = await res.json();
  authStorage.setToken(data.token);
  authStorage.setUser(data.user);
  return data;
}

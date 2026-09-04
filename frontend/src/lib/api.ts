import { auth } from '../config/firebase';

export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location.hostname.includes('staging')) {
    return 'https://backend-staging.akshanshkhairwar2.workers.dev/api';
  }
  return 'https://backend.akshanshkhairwar2.workers.dev/api';
}

async function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

export const api = {
  async get(endpoint: string) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: await getHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.details || err.error || response.statusText);
    }
    return response.json();
  },
  
  async post(endpoint: string, data: any) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.details || err.error || response.statusText);
    }
    return response.json();
  },
  
  async uploadFile(endpoint: string, formData: FormData) {
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = {};
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.details || err.error || response.statusText);
    }
    return response.json();
  },
  
  async put(endpoint: string, data: any) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.details || err.error || response.statusText);
    }
    return response.json();
  },
  
  async delete(endpoint: string) {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.details || err.error || response.statusText);
    }
    return response.json();
  },
};

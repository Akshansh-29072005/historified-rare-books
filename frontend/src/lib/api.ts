import { auth } from '../config/firebase';

const BASE_URL = 'https://backend.akshanshkhairwar2.workers.dev/api';

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
    const response = await fetch(`${BASE_URL}${endpoint}`, {
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
    const response = await fetch(`${BASE_URL}${endpoint}`, {
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
    const headers: Record<string, string> = {};
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${BASE_URL}${endpoint}`, {
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
    const response = await fetch(`${BASE_URL}${endpoint}`, {
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
    const response = await fetch(`${BASE_URL}${endpoint}`, {
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

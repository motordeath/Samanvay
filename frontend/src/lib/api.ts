const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const COORDINATION_BASE_URL = process.env.NEXT_PUBLIC_COORDINATION_URL || 'http://localhost:8000';

export class ApiClient {
  static async fetchBackend(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async fetchCoordination(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const orgId = typeof window !== 'undefined' ? localStorage.getItem('orgId') : null;
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(orgId ? { 'x-org-id': orgId } : {}),
      ...options.headers,
    };

    const response = await fetch(`${COORDINATION_BASE_URL}${endpoint}`, { ...options, headers });
    
    if (!response.ok) {
      throw new Error(`Coordination API Error: ${response.statusText}`);
    }
    
    return response.json();
  }
}

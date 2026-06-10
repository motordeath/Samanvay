// src/shared/lib/api.ts

export interface ApiOptions extends RequestInit {
  useCoordinationLayer?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, data: any, message?: string) {
    const errorMsg = message || data?.message || data?.errors?.[0]?.message || 'An API error occurred';
    super(errorMsg);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const api = async <T>(endpoint: string, options: ApiOptions = {}): Promise<T> => {
  const token = localStorage.getItem('samanvay_token');

  const baseUrl = options.useCoordinationLayer
    ? import.meta.env.VITE_COORDINATION_URL
    : import.meta.env.VITE_API_URL;

  if (!baseUrl) {
    throw new Error(`Missing ${options.useCoordinationLayer ? 'VITE_COORDINATION_URL' : 'VITE_API_URL'}`);
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const workspaceRaw =
    localStorage.getItem('samanvay_active_workspace');

  if (workspaceRaw) {
    try {
      const workspace = JSON.parse(workspaceRaw);

      if (workspace?.organizationId) {
        headers.set(
          'x-org-id',
          workspace.organizationId
        );
      }
    } catch (error) {
      console.error(
        'Failed to parse workspace context',
        error
      );
    }
  }


  if (!headers.has('x-request-id')) {
    const requestId = crypto?.randomUUID?.() ?? `req_${Date.now()}_${Math.random()}`;
    headers.set('x-request-id', requestId);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch (err) {
    data = {};
  }

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as T;
};

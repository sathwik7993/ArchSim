import type { CanvasPayload, ComponentMetric } from '../types/graph';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

let accessToken = localStorage.getItem('archsim.accessToken') ?? '';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  async register(email: string, password: string, displayName: string) {
    const result = await request<{ userId: string; accessToken: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName })
    });
    accessToken = result.accessToken;
    localStorage.setItem('archsim.accessToken', accessToken);
    return result;
  },
  async login(email: string, password: string) {
    const result = await request<{ userId: string; accessToken: string }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    accessToken = result.accessToken;
    localStorage.setItem('archsim.accessToken', accessToken);
    return result;
  },
  projects: () => request<Array<{ projectId: string; name: string; description: string; version: number }>>('/api/v1/projects'),
  createProject: (name: string, description: string) =>
    request<{ projectId: string; name: string }>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    }),
  saveCanvas: (projectId: string, canvas: CanvasPayload) =>
    request(`/api/v1/projects/${projectId}/canvas`, {
      method: 'PUT',
      body: JSON.stringify(canvas)
    }),
  startSimulation: (projectId: string, trafficProfile: string) =>
    request<{ simulationId: string; status: string; components: ComponentMetric[] }>('/api/v1/simulations/start', {
      method: 'POST',
      body: JSON.stringify({ projectId, trafficProfile, durationSeconds: 600, seed: 42 })
    }),
  analyze: (projectId: string) =>
    request<{ summary: string; issues: Array<{ severity: string; description: string; fix: string }> }>(
      `/api/v1/analyzer/projects/${projectId}`,
      { method: 'POST' }
    )
};

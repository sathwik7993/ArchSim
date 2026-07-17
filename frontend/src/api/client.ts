import type { CanvasPayload, ComponentMetric } from '../types/graph';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export const TOKEN_KEY = 'archsim.accessToken';

// The token lives in localStorage and is read fresh on every request, so a
// sign-in/out anywhere in the app takes effect immediately without stale copies.
export function getAccessToken(): string {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) ?? '' : '';
}
export function setAccessToken(token: string): void {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
export function isAuthed(): boolean {
  return getAccessToken().length > 0;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export interface AuthResult {
  userId: string;
  email: string;
  displayName: string;
  accessToken: string;
}
export interface CurrentUser {
  userId: string;
  email: string;
  displayName: string;
}

// Full project as stored on the server (canvas inline), for the sync pull.
export interface RemoteProject {
  projectId: string;
  name: string;
  description: string;
  problemSlug: string | null;
  updatedAt: number;
  nodes: unknown;
  links: unknown;
}
export interface UpsertProjectBody {
  name: string;
  description: string;
  problemSlug?: string | null;
  updatedAt: number;
  nodes: unknown;
  links: unknown;
}

export const api = {
  register: (email: string, password: string, displayName: string) =>
    request<AuthResult>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),
  login: (email: string, password: string) =>
    request<AuthResult>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<CurrentUser>('/api/v1/auth/me'),
  logout: () => request<void>('/api/v1/auth/logout', { method: 'POST' }),

  // Project cloud sync (all owner-scoped, require a valid token).
  syncProjects: () => request<RemoteProject[]>('/api/v1/projects/sync'),
  upsertProject: (projectId: string, body: UpsertProjectBody) =>
    request<RemoteProject>(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteProject: (projectId: string) =>
    request<void>(`/api/v1/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' }),

  // Legacy analyzer flow (used by the workbench "Analyze" button).
  createProject: (name: string, description: string) =>
    request<{ projectId: string; name: string }>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
  saveCanvas: (projectId: string, canvas: CanvasPayload) =>
    request(`/api/v1/projects/${projectId}/canvas`, {
      method: 'PUT',
      body: JSON.stringify(canvas),
    }),
  startSimulation: (projectId: string, trafficProfile: string) =>
    request<{ simulationId: string; status: string; components: ComponentMetric[] }>('/api/v1/simulations/start', {
      method: 'POST',
      body: JSON.stringify({ projectId, trafficProfile, durationSeconds: 600, seed: 42 }),
    }),
  analyze: (projectId: string) =>
    request<{ summary: string; issues: Array<{ severity: string; description: string; fix: string }> }>(
      `/api/v1/analyzer/projects/${projectId}`,
      { method: 'POST' }
    ),
};

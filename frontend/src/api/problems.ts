import type { Difficulty } from '../data/problems';
import type { TopicId } from '../data/topics';

// ---------------------------------------------------------------------------
// Catalog + progress API. The backend serves the problem catalog from its DB
// (seeded from the same composer that produces the bundled data), so these
// calls upgrade the experience when the backend is up and fall back to the
// bundled copy when it isn't — the app never breaks offline.
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export interface ProblemSummaryDto {
  slug: string;
  name: string;
  difficulty: Difficulty;
  topic: TopicId;
  summary: string;
}

function token(): string {
  return typeof localStorage !== 'undefined' ? localStorage.getItem('archsim.accessToken') ?? '' : '';
}

export async function fetchProblemSummaries(): Promise<ProblemSummaryDto[]> {
  const res = await fetch(`${API_BASE}/api/v1/problems`);
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  return res.json();
}

export interface ServerProgress {
  slug: string;
  status: 'attempted' | 'solved';
}

// Best-effort: only meaningful when the user has a session token.
export async function fetchProgress(): Promise<ServerProgress[]> {
  const t = token();
  if (!t) return [];
  const res = await fetch(`${API_BASE}/api/v1/progress`, { headers: { Authorization: `Bearer ${t}` } });
  if (!res.ok) return [];
  return res.json();
}

export async function pushProgress(slug: string, status: 'attempted' | 'solved'): Promise<void> {
  const t = token();
  if (!t) return; // local-first: no session, stay local-only
  try {
    await fetch(`${API_BASE}/api/v1/progress/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ status }),
    });
  } catch {
    // ignore — progress is already persisted locally
  }
}

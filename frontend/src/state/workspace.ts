import { create } from 'zustand';
import type { CanvasLink, CanvasNode } from '../types/graph';
import { api, isAuthed, type RemoteProject } from '../api/client';

// ---------------------------------------------------------------------------
// Local-first project workspace.
//
// Phase 5 keeps every project in localStorage so a student can juggle many
// designs with zero backend/login friction. Phase 10 layers optional cloud sync
// on top: when the user is signed in, every mutation is mirrored to the backend
// and `syncFromServer()` merges the two sides (last-write-wins on updatedAt), so
// designs follow the student across devices. localStorage stays the source of
// truth for the workbench, so the app never blocks on the network.
// ---------------------------------------------------------------------------

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  /** When set, this project is a practice workspace linked to a problem slug. */
  problemSlug?: string;
}

export interface ProjectData {
  nodes: CanvasNode[];
  links: CanvasLink[];
}

export interface StoredProject extends ProjectMeta {
  nodes: CanvasNode[];
  links: CanvasLink[];
}

const INDEX_KEY = 'archsim.projects';
const dataKey = (id: string) => `archsim.project.${id}`;

const now = () => Date.now();
const newId = () => `proj-${crypto.randomUUID().slice(0, 8)}`;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readIndex(): ProjectMeta[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse<ProjectMeta[]>(localStorage.getItem(INDEX_KEY), []);
}

function writeIndex(list: ProjectMeta[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

function readData(id: string): ProjectData | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  const raw = localStorage.getItem(dataKey(id));
  if (!raw) return undefined;
  return safeParse<ProjectData>(raw, { nodes: [], links: [] });
}

function writeData(id: string, data: ProjectData) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(dataKey(id), JSON.stringify(data));
}

// The demo architecture new visitors land on so the app is never empty.
const seedNodes: CanvasNode[] = [
  { id: 'node-client', type: 'CLIENT', label: 'Client', position: { x: 120, y: 200 }, properties: { qps: 120, protocol: 'HTTPS', timeout_ms: 5000 } },
  { id: 'node-api', type: 'API_GATEWAY', label: 'API Gateway', position: { x: 420, y: 200 }, properties: { rate_limit_rps: 1000, auth_type: 'JWT', cors_enabled: true } },
  { id: 'node-lb', type: 'LOAD_BALANCER', label: 'Load Balancer', position: { x: 720, y: 200 }, properties: { algorithm: 'round_robin', health_check_interval: 30, max_connections: 10000 } },
  { id: 'node-server1', type: 'SERVER', label: 'App Server 1', position: { x: 620, y: 420 }, properties: { cpu_cores: 4, memory_gb: 16, os: 'Linux', auto_scaling: false } },
  { id: 'node-server2', type: 'SERVER', label: 'App Server 2', position: { x: 820, y: 420 }, properties: { cpu_cores: 4, memory_gb: 16, os: 'Linux', auto_scaling: false } },
  { id: 'node-redis', type: 'REDIS', label: 'Redis Cache', position: { x: 420, y: 420 }, properties: { maxmemory_mb: 512, eviction_policy: 'allkeys-lru', cluster_mode: false } },
  { id: 'node-db', type: 'POSTGRESQL', label: 'PostgreSQL', position: { x: 720, y: 620 }, properties: { version: '16', max_connections: 100, storage_gb: 100, replication: true } },
];

const seedLinks: CanvasLink[] = [
  { id: 'link-1', source: 'node-client', target: 'node-api', properties: { latencyMs: 20, bandwidthGbps: 1, protocol: 'HTTPS', encrypted: true } },
  { id: 'link-2', source: 'node-api', target: 'node-lb', properties: { latencyMs: 2, bandwidthGbps: 10, protocol: 'HTTP' } },
  { id: 'link-3', source: 'node-lb', target: 'node-server1', properties: { latencyMs: 1, bandwidthGbps: 10 } },
  { id: 'link-4', source: 'node-lb', target: 'node-server2', properties: { latencyMs: 1, bandwidthGbps: 10 } },
  { id: 'link-5', source: 'node-server1', target: 'node-redis', properties: { latencyMs: 1, bandwidthGbps: 10 } },
  { id: 'link-6', source: 'node-server2', target: 'node-redis', properties: { latencyMs: 1, bandwidthGbps: 10 } },
  { id: 'link-7', source: 'node-server1', target: 'node-db', properties: { latencyMs: 3, bandwidthGbps: 10 } },
  { id: 'link-8', source: 'node-server2', target: 'node-db', properties: { latencyMs: 3, bandwidthGbps: 10 } },
];

// Deep clone so a freshly-created project never shares references with the seed.
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

// --- Cloud sync (best-effort; no-ops when signed out or the backend is down) --

/** Mirror one project (meta + canvas) to the backend. Fire-and-forget. */
function pushById(id: string) {
  if (!isAuthed()) return;
  const meta = readIndex().find((p) => p.id === id);
  if (!meta) return;
  const data = readData(id) ?? { nodes: [], links: [] };
  void api
    .upsertProject(id, {
      name: meta.name,
      description: meta.description,
      problemSlug: meta.problemSlug ?? null,
      updatedAt: meta.updatedAt,
      nodes: data.nodes,
      links: data.links,
    })
    .catch(() => {
      /* stays saved locally; will re-sync on next sign-in */
    });
}

function deleteRemote(id: string) {
  if (!isAuthed()) return;
  void api.deleteProject(id).catch(() => {});
}

function remoteMeta(r: RemoteProject): ProjectMeta {
  return {
    id: r.projectId,
    name: r.name,
    description: r.description ?? '',
    problemSlug: r.problemSlug ?? undefined,
    createdAt: r.updatedAt,
    updatedAt: r.updatedAt,
  };
}

interface WorkspaceState {
  projects: ProjectMeta[];
  refresh: () => void;
  createProject: (name: string, description?: string, seed?: ProjectData) => ProjectMeta;
  /** Idempotent per-problem practice workspace, keyed by slug so it's never duplicated. */
  ensurePracticeProject: (slug: string, name: string, description?: string, seed?: ProjectData) => ProjectMeta;
  getProject: (id: string) => StoredProject | undefined;
  saveCanvas: (id: string, data: ProjectData) => void;
  renameProject: (id: string, name: string, description?: string) => void;
  duplicateProject: (id: string) => ProjectMeta | undefined;
  deleteProject: (id: string) => void;
  /** Pull cloud projects and merge with local (last-write-wins). Called on sign-in. */
  syncFromServer: () => Promise<void>;
}

function persistMeta(update: (list: ProjectMeta[]) => ProjectMeta[]): ProjectMeta[] {
  const next = update(readIndex());
  writeIndex(next);
  return next;
}

export const useWorkspace = create<WorkspaceState>((set) => ({
  projects: readIndex().sort((a, b) => b.updatedAt - a.updatedAt),

  refresh: () => set({ projects: readIndex().sort((a, b) => b.updatedAt - a.updatedAt) }),

  createProject: (name, description = '', seed) => {
    const meta: ProjectMeta = {
      id: newId(),
      name: name.trim() || 'Untitled design',
      description: description.trim(),
      createdAt: now(),
      updatedAt: now(),
    };
    writeData(meta.id, seed ? clone(seed) : { nodes: [], links: [] });
    const list = persistMeta((prev) => [meta, ...prev]);
    set({ projects: list.sort((a, b) => b.updatedAt - a.updatedAt) });
    pushById(meta.id);
    return meta;
  },

  ensurePracticeProject: (slug, name, description = '', seed) => {
    const id = `practice-${slug}`;
    const existing = readIndex().find((p) => p.id === id);
    if (existing) return existing; // reuse — never create a second workspace for a problem
    const meta: ProjectMeta = {
      id,
      name,
      description: description.trim(),
      problemSlug: slug,
      createdAt: now(),
      updatedAt: now(),
    };
    writeData(id, seed ? clone(seed) : { nodes: [], links: [] });
    const list = persistMeta((prev) => [meta, ...prev]);
    set({ projects: list.sort((a, b) => b.updatedAt - a.updatedAt) });
    pushById(id);
    return meta;
  },

  getProject: (id) => {
    const meta = readIndex().find((p) => p.id === id);
    const data = readData(id);
    if (!meta) return undefined;
    return { ...meta, nodes: data?.nodes ?? [], links: data?.links ?? [] };
  },

  saveCanvas: (id, data) => {
    writeData(id, clone(data));
    const list = persistMeta((prev) =>
      prev.map((p) => (p.id === id ? { ...p, updatedAt: now() } : p))
    );
    set({ projects: list.sort((a, b) => b.updatedAt - a.updatedAt) });
    pushById(id);
  },

  renameProject: (id, name, description) => {
    const list = persistMeta((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, name: name.trim() || p.name, description: description?.trim() ?? p.description, updatedAt: now() }
          : p
      )
    );
    set({ projects: list.sort((a, b) => b.updatedAt - a.updatedAt) });
    pushById(id);
  },

  duplicateProject: (id) => {
    const source = readIndex().find((p) => p.id === id);
    if (!source) return undefined;
    const data = readData(id) ?? { nodes: [], links: [] };
    const meta: ProjectMeta = {
      id: newId(),
      name: `${source.name} (copy)`,
      description: source.description,
      createdAt: now(),
      updatedAt: now(),
    };
    writeData(meta.id, clone(data));
    const list = persistMeta((prev) => [meta, ...prev]);
    set({ projects: list.sort((a, b) => b.updatedAt - a.updatedAt) });
    pushById(meta.id);
    return meta;
  },

  deleteProject: (id) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(dataKey(id));
    const list = persistMeta((prev) => prev.filter((p) => p.id !== id));
    set({ projects: list.sort((a, b) => b.updatedAt - a.updatedAt) });
    deleteRemote(id);
  },

  syncFromServer: async () => {
    if (!isAuthed()) return;
    let remote: RemoteProject[];
    try {
      remote = await api.syncProjects();
    } catch {
      return; // backend down — stay fully local
    }
    const localById = new Map(readIndex().map((p) => [p.id, p]));
    const remoteById = new Map(remote.map((r) => [r.projectId, r]));

    const merged: ProjectMeta[] = [];
    const toPush: string[] = [];

    for (const id of new Set([...localById.keys(), ...remoteById.keys()])) {
      const local = localById.get(id);
      const rem = remoteById.get(id);
      if (local && rem) {
        if (rem.updatedAt > local.updatedAt) {
          // Server is newer — adopt its meta + canvas.
          writeData(id, { nodes: (rem.nodes as CanvasNode[]) ?? [], links: (rem.links as CanvasLink[]) ?? [] });
          merged.push(remoteMeta(rem));
        } else {
          merged.push(local);
          if (local.updatedAt > rem.updatedAt) toPush.push(id); // local newer — upload
        }
      } else if (rem) {
        // Cloud-only (another device) — pull it down.
        writeData(id, { nodes: (rem.nodes as CanvasNode[]) ?? [], links: (rem.links as CanvasLink[]) ?? [] });
        merged.push(remoteMeta(rem));
      } else if (local) {
        // Local-only (built while signed out) — upload it.
        merged.push(local);
        toPush.push(id);
      }
    }

    writeIndex(merged);
    set({ projects: merged.sort((a, b) => b.updatedAt - a.updatedAt) });
    for (const id of toPush) pushById(id);
  },
}));

// First-run: seed a demo project so the dashboard and workbench aren't empty.
export function ensureSeededWorkspace(): ProjectMeta[] {
  const existing = readIndex();
  if (existing.length > 0) return existing;
  const meta: ProjectMeta = {
    id: newId(),
    name: 'Getting Started · E-Commerce',
    description: 'A sample microservices architecture to explore the simulator.',
    createdAt: now(),
    updatedAt: now(),
  };
  writeData(meta.id, { nodes: clone(seedNodes), links: clone(seedLinks) });
  writeIndex([meta]);
  return [meta];
}

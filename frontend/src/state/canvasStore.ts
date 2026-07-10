import { create } from 'zustand';
import type { CanvasLink, CanvasNode, ComponentMetric, ComponentType } from '../types/graph';
import { DEFAULT_PROPERTIES } from '../types/graph';
import {
  runSimulationSeries,
  type LinkFlow,
  type Frame,
  type Incident,
  type IncidentType,
} from '../sim/engine';

const SIM_FRAMES = 60;
const SIM_STEP_MS = 1000; // virtual ms per frame → a 60s run
const INCIDENT_DURATION = 18; // frames an injected incident lasts

export type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'archsim.theme';
const readInitialTheme = (): ThemeMode => {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  }
  return 'dark';
};

const GRID = 20;
const MAX_HISTORY = 50;

const snap = (v: number) => Math.round(v / GRID) * GRID;

const initialNodes: CanvasNode[] = [
  { id: 'node-client', type: 'CLIENT', label: 'Client', position: { x: 120, y: 200 }, properties: { qps: 120, protocol: 'HTTPS', timeout_ms: 5000 } },
  { id: 'node-api', type: 'API_GATEWAY', label: 'API Gateway', position: { x: 420, y: 200 }, properties: { rate_limit_rps: 1000, auth_type: 'JWT', cors_enabled: true } },
  { id: 'node-lb', type: 'LOAD_BALANCER', label: 'Load Balancer', position: { x: 720, y: 200 }, properties: { algorithm: 'round_robin', health_check_interval: 30, max_connections: 10000 } },
  { id: 'node-server1', type: 'SERVER', label: 'App Server 1', position: { x: 620, y: 420 }, properties: { cpu_cores: 4, memory_gb: 16, os: 'Linux', auto_scaling: false } },
  { id: 'node-server2', type: 'SERVER', label: 'App Server 2', position: { x: 820, y: 420 }, properties: { cpu_cores: 4, memory_gb: 16, os: 'Linux', auto_scaling: false } },
  { id: 'node-redis', type: 'REDIS', label: 'Redis Cache', position: { x: 420, y: 420 }, properties: { maxmemory_mb: 512, eviction_policy: 'allkeys-lru', cluster_mode: false } },
  { id: 'node-db', type: 'POSTGRESQL', label: 'PostgreSQL', position: { x: 720, y: 620 }, properties: { version: '16', max_connections: 100, storage_gb: 100, replication: true } },
];

const initialLinks: CanvasLink[] = [
  { id: 'link-1', source: 'node-client', target: 'node-api', properties: { latencyMs: 20, bandwidthGbps: 1, protocol: 'HTTPS', encrypted: true } },
  { id: 'link-2', source: 'node-api', target: 'node-lb', properties: { latencyMs: 2, bandwidthGbps: 10, protocol: 'HTTP' } },
  { id: 'link-3', source: 'node-lb', target: 'node-server1', properties: { latencyMs: 1, bandwidthGbps: 10 } },
  { id: 'link-4', source: 'node-lb', target: 'node-server2', properties: { latencyMs: 1, bandwidthGbps: 10 } },
  { id: 'link-5', source: 'node-server1', target: 'node-redis', properties: { latencyMs: 1, bandwidthGbps: 10 } },
  { id: 'link-6', source: 'node-server2', target: 'node-redis', properties: { latencyMs: 1, bandwidthGbps: 10 } },
  { id: 'link-7', source: 'node-server1', target: 'node-db', properties: { latencyMs: 3, bandwidthGbps: 10 } },
  { id: 'link-8', source: 'node-server2', target: 'node-db', properties: { latencyMs: 3, bandwidthGbps: 10 } },
];

interface Snapshot {
  nodes: CanvasNode[];
  links: CanvasLink[];
}

interface CanvasState {
  nodes: CanvasNode[];
  links: CanvasLink[];
  currentProjectId?: string;
  selectedNodeId?: string;
  linkMode: boolean;
  linkSource?: string;
  metrics: ComponentMetric[];
  history: Snapshot[];
  future: Snapshot[];

  // Simulation runtime
  simRunning: boolean;
  linkFlows: Record<string, LinkFlow>;
  simProfile: string;
  peakSaturation: number;

  // Time-stepped playback (Milestone 4)
  frames: Frame[];
  currentFrame: number;
  playing: boolean;
  incidents: Incident[];
  showTrace: boolean;
  showInsights: boolean;
  trafficLevel: number;

  // Theme
  theme: ThemeMode;

  // Project lifecycle
  loadProject: (id: string, data: { nodes: CanvasNode[]; links: CanvasLink[] }) => void;
  replaceGraph: (nodes: CanvasNode[], links: CanvasLink[]) => void;

  // Node operations
  addNode: (type: ComponentType, x?: number, y?: number) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, x: number, y: number) => void;
  selectNode: (id?: string) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeProperty: (id: string, key: string, value: string | number | boolean) => void;

  // Link operations
  addLink: (sourceId: string, targetId: string) => void;
  removeLink: (id: string) => void;
  setLinkMode: (on: boolean) => void;
  setLinkSource: (id?: string) => void;
  connectSequentially: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Simulation
  setMetrics: (metrics: ComponentMetric[]) => void;
  runLocalSimulation: (profile?: string) => void;
  stopSimulation: () => void;

  // Playback controls
  setFrame: (index: number) => void;
  stepFrame: (delta: number) => void;
  advanceFrame: () => void;
  togglePlay: () => void;

  // Chaos / incidents
  addIncident: (type: IncidentType, targetId: string) => void;
  removeIncident: (id: string) => void;
  clearIncidents: () => void;
  toggleTrace: () => void;
  toggleInsights: () => void;
  setTrafficLevel: (level: number) => void;

  // Theme
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: initialNodes,
  links: initialLinks,
  currentProjectId: undefined,
  selectedNodeId: undefined,
  linkMode: false,
  linkSource: undefined,
  metrics: [],
  history: [],
  future: [],
  simRunning: false,
  linkFlows: {},
  simProfile: 'BURST',
  peakSaturation: 0,
  frames: [],
  currentFrame: 0,
  playing: false,
  incidents: [],
  showTrace: false,
  showInsights: false,
  trafficLevel: 1,
  theme: readInitialTheme(),

  pushHistory: () => {
    const { nodes, links, history } = get();
    const snapshot: Snapshot = {
      nodes: nodes.map((n) => ({ ...n, position: { ...n.position }, properties: { ...n.properties } })),
      links: links.map((l) => ({ ...l, properties: { ...l.properties } })),
    };
    set({ history: [...history.slice(-(MAX_HISTORY - 1)), snapshot], future: [] });
  },

  // Swap the whole board to a stored project and reset all live/sim state so a
  // previous project's playback or incidents never leak into the newly opened one.
  loadProject: (id, data) =>
    set({
      currentProjectId: id,
      nodes: data.nodes.map((n) => ({ ...n, position: { ...n.position }, properties: { ...n.properties } })),
      links: data.links.map((l) => ({ ...l, properties: { ...l.properties } })),
      selectedNodeId: undefined,
      linkMode: false,
      linkSource: undefined,
      history: [],
      future: [],
      simRunning: false,
      playing: false,
      frames: [],
      currentFrame: 0,
      linkFlows: {},
      metrics: [],
      peakSaturation: 0,
      incidents: [],
      showTrace: false,
      trafficLevel: 1,
    }),

  // Replace the whole board in place (undoable) — used to drop a reference
  // architecture onto the current practice canvas without a full project reload.
  replaceGraph: (nodes, links) => {
    get().pushHistory();
    set({
      nodes: nodes.map((n) => ({ ...n, position: { ...n.position }, properties: { ...n.properties } })),
      links: links.map((l) => ({ ...l, properties: { ...l.properties } })),
      selectedNodeId: undefined,
    });
    if (get().simRunning) get().runLocalSimulation();
  },

  addNode: (type, x, y) => {
    get().pushHistory();
    set((state) => {
      const id = `node-${crypto.randomUUID().slice(0, 8)}`;
      const label = type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const newNode: CanvasNode = {
        id,
        type,
        label: `${label}`,
        position: { x: snap(x ?? 200 + Math.random() * 200), y: snap(y ?? 200 + Math.random() * 200) },
        properties: { ...(DEFAULT_PROPERTIES[type] ?? {}) },
      };
      return { nodes: [...state.nodes, newNode] };
    });
  },

  removeNode: (id) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      links: state.links.filter((l) => l.source !== id && l.target !== id),
      selectedNodeId: state.selectedNodeId === id ? undefined : state.selectedNodeId,
    }));
  },

  moveNode: (id, x, y) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, position: { x: snap(x), y: snap(y) } } : n
      ),
    })),

  selectNode: (id) => set({ selectedNodeId: id }),

  updateNodeLabel: (id, label) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, label } : n)),
    }));
  },

  updateNodeProperty: (id, key, value) => {
    get().pushHistory();
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, properties: { ...n.properties, [key]: value } } : n
      ),
    }));
  },

  addLink: (sourceId, targetId) => {
    if (sourceId === targetId) return;
    const existing = get().links.find(
      (l) => (l.source === sourceId && l.target === targetId) || (l.source === targetId && l.target === sourceId)
    );
    if (existing) return;
    get().pushHistory();
    set((state) => ({
      links: [
        ...state.links,
        {
          id: `link-${crypto.randomUUID().slice(0, 8)}`,
          source: sourceId,
          target: targetId,
          properties: { latencyMs: 10, bandwidthGbps: 1 },
        },
      ],
    }));
  },

  removeLink: (id) => {
    get().pushHistory();
    set((state) => ({ links: state.links.filter((l) => l.id !== id) }));
  },

  setLinkMode: (on) => set({ linkMode: on, linkSource: undefined }),
  setLinkSource: (id) => set({ linkSource: id }),

  connectSequentially: () => {
    get().pushHistory();
    const nodes = get().nodes;
    const links: CanvasLink[] = [];
    for (let i = 1; i < nodes.length; i++) {
      links.push({
        id: `link-${nodes[i - 1].id}-${nodes[i].id}`,
        source: nodes[i - 1].id,
        target: nodes[i].id,
        properties: { latencyMs: 10, bandwidthGbps: 1 },
      });
    }
    set({ links });
  },

  undo: () => {
    const { history, nodes, links } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      history: history.slice(0, -1),
      future: [{ nodes, links }, ...get().future],
      nodes: prev.nodes,
      links: prev.links,
    });
  },

  redo: () => {
    const { future, nodes, links } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      future: future.slice(1),
      history: [...get().history, { nodes, links }],
      nodes: next.nodes,
      links: next.links,
    });
  },

  setMetrics: (metrics) => set({ metrics }),

  runLocalSimulation: (profile) => {
    const { nodes, links, simProfile, incidents, simRunning, currentFrame, trafficLevel } = get();
    const activeProfile = profile ?? simProfile;
    const frames = runSimulationSeries(nodes, links, activeProfile, incidents, {
      frames: SIM_FRAMES,
      stepMs: SIM_STEP_MS,
      trafficMultiplier: trafficLevel,
    });
    // Preserve the playhead when re-running a live sim (edits/incidents); else start over.
    const idx = simRunning ? Math.min(currentFrame, frames.length - 1) : 0;
    const frame = frames[idx];
    set({
      frames,
      currentFrame: idx,
      simRunning: true,
      playing: simRunning ? get().playing : true,
      simProfile: activeProfile,
      metrics: frame?.metrics ?? [],
      linkFlows: frame?.linkFlows ?? {},
      peakSaturation: frame?.peakSaturation ?? 0,
    });
  },

  stopSimulation: () =>
    set({ simRunning: false, playing: false, frames: [], currentFrame: 0, linkFlows: {}, metrics: [], peakSaturation: 0, showTrace: false }),

  setFrame: (index) => {
    const { frames } = get();
    if (frames.length === 0) return;
    const i = Math.max(0, Math.min(index, frames.length - 1));
    const frame = frames[i];
    set({ currentFrame: i, metrics: frame.metrics, linkFlows: frame.linkFlows, peakSaturation: frame.peakSaturation });
  },

  stepFrame: (delta) => {
    set({ playing: false });
    get().setFrame(get().currentFrame + delta);
  },

  advanceFrame: () => {
    const { frames, currentFrame } = get();
    if (frames.length === 0) return;
    get().setFrame((currentFrame + 1) % frames.length);
  },

  togglePlay: () => {
    const { frames, playing } = get();
    if (frames.length === 0) return;
    set({ playing: !playing });
  },

  addIncident: (type, targetId) => {
    const { incidents, currentFrame, simRunning } = get();
    const incident: Incident = {
      id: `inc-${crypto.randomUUID().slice(0, 8)}`,
      type,
      targetId,
      startFrame: simRunning ? currentFrame : 0,
      durationFrames: INCIDENT_DURATION,
    };
    set({ incidents: [...incidents, incident] });
    if (simRunning) get().runLocalSimulation();
  },

  removeIncident: (id) => {
    set({ incidents: get().incidents.filter((i) => i.id !== id) });
    if (get().simRunning) get().runLocalSimulation();
  },

  clearIncidents: () => {
    set({ incidents: [] });
    if (get().simRunning) get().runLocalSimulation();
  },

  toggleTrace: () => set({ showTrace: !get().showTrace }),

  toggleInsights: () => set({ showInsights: !get().showInsights }),

  setTrafficLevel: (level) => {
    set({ trafficLevel: level });
    if (get().simRunning) get().runLocalSimulation();
  },

  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, next);
    set({ theme: next });
  },

  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },
}));

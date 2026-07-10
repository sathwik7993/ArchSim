import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import { CanvasView } from '../components/CanvasView';
import { Inspector } from '../components/Inspector';
import { NodePalette } from '../components/NodePalette';
import { Toolbar } from '../components/Toolbar';
import { useCanvasStore } from '../state/canvasStore';
import { useWorkspace } from '../state/workspace';
import { ProblemPanel } from '../components/ProblemPanel';

export function Workbench() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const nodes = useCanvasStore((state) => state.nodes);
  const links = useCanvasStore((state) => state.links);
  const selectedNodeId = useCanvasStore((state) => state.selectedNodeId);
  const selectNode = useCanvasStore((state) => state.selectNode);
  const removeNode = useCanvasStore((state) => state.removeNode);
  const setLinkMode = useCanvasStore((state) => state.setLinkMode);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const loadProject = useCanvasStore((state) => state.loadProject);
  const currentProjectId = useCanvasStore((state) => state.currentProjectId);
  const runLocalSimulation = useCanvasStore((state) => state.runLocalSimulation);
  const simRunning = useCanvasStore((state) => state.simRunning);
  const playing = useCanvasStore((state) => state.playing);
  const advanceFrame = useCanvasStore((state) => state.advanceFrame);

  const getProject = useWorkspace((s) => s.getProject);
  const saveCanvas = useWorkspace((s) => s.saveCanvas);
  const meta = useWorkspace((s) => s.projects.find((p) => p.id === projectId));

  const [toast, setToast] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const problemSlug = meta?.problemSlug;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Load the requested project into the canvas store (or bounce to the dashboard).
  useEffect(() => {
    if (!projectId) {
      navigate('/dashboard');
      return;
    }
    const project = getProject(projectId);
    if (!project) {
      navigate('/dashboard');
      return;
    }
    loadProject(projectId, { nodes: project.nodes, links: project.links });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Debounced auto-save. Guarded on `currentProjectId === projectId` so we never
  // persist stale nodes/links before loadProject has swapped the board.
  useEffect(() => {
    if (!projectId || currentProjectId !== projectId) return;
    const t = setTimeout(() => saveCanvas(projectId, { nodes, links }), 600);
    return () => clearTimeout(t);
  }, [nodes, links, currentProjectId, projectId, saveCanvas]);

  const handleSave = useCallback(() => {
    if (!projectId) return;
    saveCanvas(projectId, { nodes, links });
    showToast('Saved ✓');
  }, [projectId, nodes, links, saveCanvas, showToast]);

  // Simulation runs fully client-side via the local engine, so it works offline.
  const handleSimulate = useCallback(() => {
    if (nodes.length === 0) {
      showToast('Add components to the board before simulating. ✏️');
      return;
    }
    runLocalSimulation('BURST');
    showToast('Simulation live — tracing request flow ⚡');
  }, [nodes.length, runLocalSimulation, showToast]);

  // Architecture analysis is a best-effort backend call; it degrades gracefully.
  const analyzer = useMutation({
    mutationFn: async () => {
      try {
        await api.register('architect@archsim.local', 'archsim-local', 'Local Architect');
      } catch {
        await api.login('architect@archsim.local', 'archsim-local');
      }
      const project = await api.createProject(meta?.name ?? 'ArchSim project', meta?.description ?? '');
      await api.saveCanvas(project.projectId, { nodes, links, metadata: { gridSize: 20 } });
      return api.analyze(project.projectId);
    },
    onSuccess: (data) => {
      if (data.issues && data.issues.length > 0) {
        showToast(`Architecture analysis complete: ${data.issues.length} concerns found. 🔬`);
      } else {
        showToast('Architecture analysis complete: No concerns detected! 🔬');
      }
    },
    onError: () => {
      showToast('Analysis needs the backend running. Start it with docker compose. ❌');
    },
  });

  // Keep the live simulation in sync as the architecture is edited.
  useEffect(() => {
    if (simRunning) runLocalSimulation();
  }, [nodes, links, simRunning, runLocalSimulation]);

  // Playback loop — advance the timeline while playing (~9 fps of virtual time).
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => advanceFrame(), 110);
    return () => window.clearInterval(id);
  }, [playing, advanceFrame]);

  // Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        showToast('Undone ↶');
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        redo();
        showToast('Redone ↷');
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          e.preventDefault();
          removeNode(selectedNodeId);
          showToast('Component removed 🗑');
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        selectNode(undefined);
        setLinkMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedNodeId, removeNode, selectNode, setLinkMode, handleSave, showToast]);

  const shell = (
    <main className={`app-shell ${problemSlug ? 'in-split' : ''}`}>
      <header className="topbar">
        <div className="topbar-brand">
          <button
            className="back-btn"
            onClick={() => navigate(problemSlug ? '/problems' : '/dashboard')}
            title={problemSlug ? 'Back to problems' : 'Back to projects'}
            aria-label={problemSlug ? 'Back to problems' : 'Back to projects'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          {problemSlug && !panelOpen && (
            <button className="show-problem-btn" onClick={() => setPanelOpen(true)} title="Show problem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h10M4 18h7" /></svg>
              Problem
            </button>
          )}
          <span className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
              <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          </span>
          <strong className="project-name">{meta?.name ?? 'ArchSim'}</strong>
        </div>
        <Toolbar
          onSave={handleSave}
          onSimulate={handleSimulate}
          onAnalyze={() => void analyzer.mutate()}
          saveLoading={false}
          simRunning={simRunning}
          analyzeLoading={analyzer.isPending}
        />
      </header>

      <NodePalette />
      <CanvasView />
      <Inspector />

      {toast && <div className="toast">{toast}</div>}
    </main>
  );

  if (problemSlug) {
    return (
      <div className="solve-shell">
        {panelOpen && <ProblemPanel slug={problemSlug} onCollapse={() => setPanelOpen(false)} onToast={showToast} />}
        <div className="solve-main">{shell}</div>
      </div>
    );
  }

  return shell;
}

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace, ensureSeededWorkspace, type ProjectMeta, type StoredProject } from '../state/workspace';
import { useCanvasStore } from '../state/canvasStore';
import { CanvasThumbnail } from '../components/CanvasThumbnail';
import { TemplateGallery } from '../components/TemplateGallery';
import type { Template } from '../data/templates';

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

interface ModalState {
  mode: 'create' | 'rename';
  id?: string;
  name: string;
  description: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const allProjects = useWorkspace((s) => s.projects);
  // Practice workspaces (linked to a problem) live in the Practice flow, not here.
  const projects = useMemo(() => allProjects.filter((p) => !p.problemSlug), [allProjects]);
  const refresh = useWorkspace((s) => s.refresh);
  const createProject = useWorkspace((s) => s.createProject);
  const renameProject = useWorkspace((s) => s.renameProject);
  const duplicateProject = useWorkspace((s) => s.duplicateProject);
  const deleteProject = useWorkspace((s) => s.deleteProject);
  const getProject = useWorkspace((s) => s.getProject);

  const theme = useCanvasStore((s) => s.theme);
  const toggleTheme = useCanvasStore((s) => s.toggleTheme);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  // First visit: seed the demo project, then load the index into the store.
  useEffect(() => {
    ensureSeededWorkspace();
    refresh();
  }, [refresh]);

  const openProject = (id: string) => navigate(`/design/${id}`);

  const useTemplate = (t: Template) => {
    const meta = createProject(t.name, t.tagline, { nodes: t.nodes, links: t.links });
    setShowTemplates(false);
    openProject(meta.id);
  };

  const submitModal = () => {
    if (!modal) return;
    const name = modal.name.trim() || 'Untitled design';
    if (modal.mode === 'create') {
      const meta = createProject(name, modal.description);
      setModal(null);
      openProject(meta.id);
    } else if (modal.id) {
      renameProject(modal.id, name, modal.description);
      setModal(null);
    }
  };

  return (
    <div className="dashboard">
      <header className="dash-topbar">
        <div className="topbar-brand">
          <span className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
              <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          </span>
          <strong>ArchSim</strong>
          <span className="brand-subtitle">System Design Workbench</span>
        </div>
        <div className="dash-topbar-actions">
          <button className="ghost-btn" onClick={() => navigate('/problems')}>Practice problems</button>
          <button className="ghost-btn icon-only" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <div className="dash-body">
        <div className="dash-head">
          <div>
            <h1 className="dash-title">Your designs</h1>
            <p className="dash-sub">{projects.length} project{projects.length === 1 ? '' : 's'} · saved locally in your browser</p>
          </div>
          <div className="dash-head-actions">
            <button className="ghost-btn" onClick={() => setShowTemplates(true)}>
              Browse templates
            </button>
            <button className="primary-btn" onClick={() => setModal({ mode: 'create', name: '', description: '' })}>
              + New project
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="dash-empty">
            <p>No designs yet.</p>
            <div className="dash-head-actions">
              <button className="ghost-btn" onClick={() => setShowTemplates(true)}>Browse templates</button>
              <button className="primary-btn" onClick={() => setModal({ mode: 'create', name: '', description: '' })}>
                Create your first design
              </button>
            </div>
          </div>
        ) : (
          <div className="project-grid">
            {/* New-project tile mirrors the card grid for a consistent rhythm. */}
            <button
              className="project-card new-card"
              onClick={() => setModal({ mode: 'create', name: '', description: '' })}
            >
              <span className="new-plus">+</span>
              <span>New project</span>
            </button>

            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                meta={p}
                getProject={getProject}
                onOpen={() => openProject(p.id)}
                onRename={() => setModal({ mode: 'rename', id: p.id, name: p.name, description: p.description })}
                onDuplicate={() => duplicateProject(p.id)}
                onDelete={() => {
                  if (window.confirm(`Delete "${p.name}"? This cannot be undone.`)) deleteProject(p.id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showTemplates && <TemplateGallery onClose={() => setShowTemplates(false)} onUse={useTemplate} />}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{modal.mode === 'create' ? 'New project' : 'Rename project'}</h2>
            <label className="modal-field">
              <span>Name</span>
              <input
                autoFocus
                value={modal.name}
                placeholder="e.g. URL Shortener"
                onChange={(e) => setModal({ ...modal, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && submitModal()}
              />
            </label>
            <label className="modal-field">
              <span>Description <em>(optional)</em></span>
              <input
                value={modal.description}
                placeholder="What are you designing?"
                onChange={(e) => setModal({ ...modal, description: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && submitModal()}
              />
            </label>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="primary-btn" onClick={submitModal}>
                {modal.mode === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CardProps {
  meta: ProjectMeta;
  getProject: (id: string) => StoredProject | undefined;
  onOpen: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function ProjectCard({ meta, getProject, onOpen, onRename, onDuplicate, onDelete }: CardProps) {
  const data = useMemo(() => getProject(meta.id), [getProject, meta.id, meta.updatedAt]);
  const nodeCount = data?.nodes?.length ?? 0;

  return (
    <div className="project-card">
      <button className="card-preview" onClick={onOpen} aria-label={`Open ${meta.name}`}>
        <CanvasThumbnail nodes={data?.nodes ?? []} links={data?.links ?? []} />
      </button>
      <div className="card-body">
        <button className="card-name" onClick={onOpen}>{meta.name}</button>
        <p className="card-desc">{meta.description || `${nodeCount} component${nodeCount === 1 ? '' : 's'}`}</p>
        <div className="card-foot">
          <span className="card-time">{timeAgo(meta.updatedAt)}</span>
          <div className="card-actions">
            <button title="Rename" onClick={onRename} aria-label="Rename">✎</button>
            <button title="Duplicate" onClick={onDuplicate} aria-label="Duplicate">⧉</button>
            <button title="Delete" onClick={onDelete} aria-label="Delete" className="danger">🗑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

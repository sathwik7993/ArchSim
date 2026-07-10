import React from 'react';
import { useCanvasStore } from '../state/canvasStore';

interface ToolbarProps {
  onSave: () => void;
  onSimulate: () => void;
  onAnalyze: () => void;
  saveLoading: boolean;
  simRunning: boolean;
  analyzeLoading: boolean;
}

const S = ({ d }: { d: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export function Toolbar({ onSave, onSimulate, onAnalyze, saveLoading, simRunning, analyzeLoading }: ToolbarProps) {
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const history = useCanvasStore((state) => state.history);
  const future = useCanvasStore((state) => state.future);
  const linkMode = useCanvasStore((state) => state.linkMode);
  const setLinkMode = useCanvasStore((state) => state.setLinkMode);
  const theme = useCanvasStore((state) => state.theme);
  const toggleTheme = useCanvasStore((state) => state.toggleTheme);
  const stopSimulation = useCanvasStore((state) => state.stopSimulation);
  const showInsights = useCanvasStore((state) => state.showInsights);
  const toggleInsights = useCanvasStore((state) => state.toggleInsights);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button className="icon-btn" onClick={undo} disabled={history.length === 0} title="Undo (Ctrl+Z)">
          <S d="M9 14L4 9l5-5M4 9h11a5 5 0 015 5v0a5 5 0 01-5 5H9" />
        </button>
        <button className="icon-btn" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y)">
          <S d="M15 14l5-5-5-5M20 9H9a5 5 0 00-5 5v0a5 5 0 005 5h6" />
        </button>
      </div>

      <div className="toolbar-group">
        <button
          className="icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark'
            ? <S d="M12 3v2M12 19v2M5 12H3M21 12h-2M6 6l-1.5-1.5M19.5 19.5L18 18M6 18l-1.5 1.5M19.5 4.5L18 6M12 8a4 4 0 100 8 4 4 0 000-8z" />
            : <S d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />}
        </button>
        <button
          onClick={() => setLinkMode(!linkMode)}
          style={linkMode ? { borderColor: 'var(--accent-border)', background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
          title="Toggle port-to-port linking (Esc to exit)"
        >
          <S d="M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8" />
          Link {linkMode ? 'On' : 'Off'}
        </button>
      </div>

      <div className="toolbar-group">
        <button onClick={onSave} disabled={saveLoading} title="Save blueprint to backend (Ctrl+S)">
          <S d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8" />
          {saveLoading ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onAnalyze} disabled={analyzeLoading} title="Analyze architecture for risks">
          <S d="M11 3a8 8 0 100 16 8 8 0 000-16zM21 21l-4.3-4.3" />
          {analyzeLoading ? 'Analyzing…' : 'Analyze'}
        </button>
        <button
          onClick={toggleInsights}
          style={showInsights ? { borderColor: 'var(--accent-border)', background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
          title="Estimated cost & SLO performance budget"
        >
          <S d="M3 3v18h18M7 15l4-4 3 3 5-6" />
          Insights
        </button>
        <button
          className={simRunning ? '' : 'primary'}
          onClick={simRunning ? stopSimulation : onSimulate}
          style={simRunning ? { color: 'var(--crit)', borderColor: 'color-mix(in srgb, var(--crit) 40%, transparent)' } : undefined}
          title={simRunning ? 'Stop the running simulation' : 'Run a live traffic simulation'}
        >
          {simRunning
            ? <><S d="M6 6h12v12H6z" /> Stop</>
            : <><S d="M5 3l14 9-14 9V3z" /> Run Simulation</>}
        </button>
      </div>
    </div>
  );
}

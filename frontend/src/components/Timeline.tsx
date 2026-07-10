import React from 'react';
import { useCanvasStore } from '../state/canvasStore';
import { INCIDENT_LABEL } from '../sim/engine';

const ICON: Record<string, string> = { CPU_SPIKE: '#f6b23c', MEMORY_LEAK: '#c084fc', PACKET_LOSS: '#60a5fa', NODE_KILL: '#ff5f6d' };

export function Timeline() {
  const frames = useCanvasStore((s) => s.frames);
  const currentFrame = useCanvasStore((s) => s.currentFrame);
  const playing = useCanvasStore((s) => s.playing);
  const incidents = useCanvasStore((s) => s.incidents);
  const togglePlay = useCanvasStore((s) => s.togglePlay);
  const stepFrame = useCanvasStore((s) => s.stepFrame);
  const setFrame = useCanvasStore((s) => s.setFrame);

  if (frames.length === 0) return null;
  const last = frames.length - 1;
  const sec = (f: number) => `${Math.round((frames[f]?.t ?? 0) / 1000)}s`;

  return (
    <div className="timeline" onMouseDown={(e) => e.stopPropagation()}>
      <button className="timeline-btn" onClick={() => stepFrame(-1)} title="Step back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14l-11-7z" /></svg>
      </button>
      <button className="timeline-btn play" onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
        {playing
          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
          : <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z" /></svg>}
      </button>
      <button className="timeline-btn" onClick={() => stepFrame(1)} title="Step forward">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 5l11 7-11 7z" /></svg>
      </button>

      <div className="timeline-track">
        <input
          className="timeline-range"
          type="range"
          min={0}
          max={last}
          value={currentFrame}
          onChange={(e) => setFrame(Number(e.target.value))}
        />
        {incidents.map((inc) => (
          <span
            key={inc.id}
            className="timeline-marker"
            title={INCIDENT_LABEL[inc.type]}
            style={{ left: `${(inc.startFrame / last) * 100}%`, background: ICON[inc.type] }}
          />
        ))}
      </div>

      <span className="timeline-time">{sec(currentFrame)} / {sec(last)}</span>
    </div>
  );
}

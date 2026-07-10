import React, { useMemo } from 'react';
import { useCanvasStore } from '../state/canvasStore';
import { computeTrace } from '../sim/engine';
import { Icon } from './icons';

export function TraceViewer() {
  const showTrace = useCanvasStore((s) => s.showTrace);
  const simRunning = useCanvasStore((s) => s.simRunning);
  const toggleTrace = useCanvasStore((s) => s.toggleTrace);
  const nodes = useCanvasStore((s) => s.nodes);
  const links = useCanvasStore((s) => s.links);
  const frames = useCanvasStore((s) => s.frames);
  const currentFrame = useCanvasStore((s) => s.currentFrame);

  const trace = useMemo(() => {
    const frame = frames[currentFrame];
    return frame ? computeTrace(nodes, links, frame) : { spans: [], total: 0 };
  }, [nodes, links, frames, currentFrame]);

  if (!showTrace || !simRunning) return null;
  const total = Math.max(trace.total, 0.001);

  return (
    <div className="trace-viewer" onMouseDown={(e) => e.stopPropagation()}>
      <div className="trace-head">
        <span className="trace-title">Request Trace</span>
        <span className="trace-total">{trace.total.toFixed(1)} ms end-to-end</span>
        <button className="trace-close" onClick={toggleTrace} title="Close trace">✕</button>
      </div>
      <div className="trace-body">
        {trace.spans.length === 0 ? (
          <p className="muted-note">No client entry point to trace.</p>
        ) : (
          trace.spans.map((span, i) => (
            <div className="trace-row" key={`${span.id}-${i}`}>
              <span className="trace-node">
                <Icon type={span.type} size={13} />
                <span className="trace-node-label">{span.label}</span>
              </span>
              <span className="trace-track">
                <span
                  className={`trace-bar trace-${span.status}`}
                  style={{ left: `${(span.start / total) * 100}%`, width: `${Math.max((span.dur / total) * 100, 1.5)}%` }}
                />
              </span>
              <span className="trace-ms">{span.dur.toFixed(1)}ms</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

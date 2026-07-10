import React, { useMemo } from 'react';
import { useCanvasStore } from '../state/canvasStore';
import { CATEGORY_COLOR, CATEGORY_MAP } from '../types/graph';
import { Icon } from './icons';
import { INCIDENT_LABEL, type IncidentType } from '../sim/engine';
import { componentStats } from '../sim/components';

const CHAOS_ACTIONS: { type: IncidentType; label: string }[] = [
  { type: 'CPU_SPIKE', label: 'CPU Spike' },
  { type: 'MEMORY_LEAK', label: 'Memory Leak' },
  { type: 'PACKET_LOSS', label: 'Packet Loss' },
  { type: 'NODE_KILL', label: 'Kill Node' },
];

/** Tiny inline sparkline (0..max scaled), highlighting the current frame. */
function Sparkline({ values, current, color, max = 100 }: { values: number[]; current: number; color: string; max?: number }) {
  const w = 252, h = 38;
  if (values.length < 2) return null;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - Math.min(v, max) / max * (h - 4) - 2;
  const line = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `0,${h} ${line} ${w},${h}`;
  const cx = x(current);
  const cy = y(values[current] ?? 0);
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polygon points={area} fill={color} opacity="0.12" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <line x1={cx} y1="0" x2={cx} y2={h} stroke="var(--text-mute)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5" />
      <circle cx={cx} cy={cy} r="2.6" fill={color} />
    </svg>
  );
}

export function Inspector() {
  const nodes = useCanvasStore((state) => state.nodes);
  const links = useCanvasStore((state) => state.links);
  const selectedNodeId = useCanvasStore((state) => state.selectedNodeId);
  const metrics = useCanvasStore((state) => state.metrics);
  const updateNodeProperty = useCanvasStore((state) => state.updateNodeProperty);
  const updateNodeLabel = useCanvasStore((state) => state.updateNodeLabel);
  const removeNode = useCanvasStore((state) => state.removeNode);
  const removeLink = useCanvasStore((state) => state.removeLink);
  const simRunning = useCanvasStore((state) => state.simRunning);
  const frames = useCanvasStore((state) => state.frames);
  const currentFrame = useCanvasStore((state) => state.currentFrame);
  const incidents = useCanvasStore((state) => state.incidents);
  const addIncident = useCanvasStore((state) => state.addIncident);
  const removeIncident = useCanvasStore((state) => state.removeIncident);
  const clearIncidents = useCanvasStore((state) => state.clearIncidents);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);

  const connectedLinks = useMemo(() => {
    if (!selectedNodeId) return [];
    return links.filter((link) => link.source === selectedNodeId || link.target === selectedNodeId);
  }, [links, selectedNodeId]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const handlePropertyChange = (key: string, value: string | number | boolean) => {
    if (selectedNode) updateNodeProperty(selectedNode.id, key, value);
  };

  const formatKeyName = (key: string) =>
    key.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  if (!selectedNode) {
    return (
      <aside className="inspector">
        <div className="panel-title">Inspector</div>
        <div className="inspector-welcome">
          <strong>No component selected</strong>
          Select any node on the canvas to inspect and tune its specification.
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span>· <kbd>Double-click</kbd> a node to rename it</span>
            <span>· Drag from a right port to a left port to connect</span>
            <span>· Drag empty canvas to pan · scroll to zoom</span>
            <span>· <kbd>⚡ Run Simulation</kbd> to trace live traffic</span>
          </div>
        </div>
      </aside>
    );
  }

  const category = CATEGORY_MAP[selectedNode.type];
  const color = CATEGORY_COLOR[category];
  const nodeMetric = metrics.find((m) => m.id === selectedNode.id);

  const cpuColor = nodeMetric
    ? nodeMetric.cpuUsage >= 90 ? 'var(--crit)' : nodeMetric.cpuUsage >= 60 ? 'var(--warn)' : 'var(--ok)'
    : 'var(--ok)';

  const cpuSeries = frames.map((f) => f.metrics.find((m) => m.id === selectedNode.id)?.cpuUsage ?? 0);
  const nodeLabelById = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;
  const clientIds = new Set(nodes.filter((n) => n.type === 'CLIENT').map((n) => n.id));
  const sysContext = {
    totalQps: metrics.filter((m) => clientIds.has(m.id)).reduce((a, m) => a + m.qps, 0),
    nodeCount: nodes.length,
  };
  const mechanics = componentStats(selectedNode, nodeMetric, sysContext);
  const barColor = (status?: string) => (status === 'crit' ? 'var(--crit)' : status === 'warn' ? 'var(--warn)' : 'var(--accent)');

  return (
    <aside className="inspector">
      <div className="panel-title">Inspector</div>

      <div className="inspector-header">
        <div className="inspector-header-icon" style={{ ['--node-color' as string]: color }}>
          <Icon type={selectedNode.type} size={24} />
        </div>
        <div className="inspector-header-title">
          <input
            className="inspector-label-input"
            value={selectedNode.label}
            onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
          />
          <div className="inspector-type-badge">{selectedNode.type}</div>
        </div>
        <button className="delete-stamp icon-btn" onClick={() => removeNode(selectedNode.id)} title="Delete component">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></svg>
        </button>
      </div>

      <div className="inspector-section">
        <h3>Specifications</h3>
        {Object.entries(selectedNode.properties).map(([key, val]) => {
          if (typeof val === 'boolean') {
            return (
              <div className="property-row" key={key}>
                <span className="property-label">{formatKeyName(key)}</span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={val} onChange={(e) => handlePropertyChange(key, e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            );
          }
          if (typeof val === 'number') {
            return (
              <div className="property-row" key={key}>
                <span className="property-label">{formatKeyName(key)}</span>
                <div className="property-input-wrapper">
                  <button className="stepper-btn" onClick={() => handlePropertyChange(key, Number(val) - 1)}>−</button>
                  <input
                    className="property-input"
                    type="number"
                    value={val}
                    onChange={(e) => handlePropertyChange(key, Number(e.target.value))}
                  />
                  <button className="stepper-btn" onClick={() => handlePropertyChange(key, Number(val) + 1)}>+</button>
                </div>
              </div>
            );
          }
          return (
            <div className="property-row" key={key}>
              <span className="property-label">{formatKeyName(key)}</span>
              <input
                className="property-input"
                style={{ width: '128px', textAlign: 'left' }}
                value={val.toString()}
                onChange={(e) => handlePropertyChange(key, e.target.value)}
              />
            </div>
          );
        })}
      </div>

      <div className="inspector-section">
        <h3>Connections</h3>
        {connectedLinks.length === 0 ? (
          <p className="muted-note">No connections linked to this node.</p>
        ) : (
          connectedLinks.map((link) => {
            const isSource = link.source === selectedNode.id;
            const peerId = isSource ? link.target : link.source;
            const peerNode = nodeById.get(peerId);
            if (!peerNode) return null;
            return (
              <div className="link-row" key={link.id}>
                <span className="link-row-label">
                  {isSource ? '→ out to' : '← in from'} <strong>{peerNode.label}</strong>
                </span>
                <button className="link-del-btn" onClick={() => removeLink(link.id)} title="Remove connection">✕</button>
              </div>
            );
          })
        )}
      </div>

      <div className="inspector-section">
        <h3>Live Telemetry</h3>
        {nodeMetric ? (
          <div className="metrics-card">
            <div className="metrics-title">Resource Utilization</div>

            <div className="metrics-value"><span>CPU Load</span><strong>{nodeMetric.cpuUsage.toFixed(1)}%</strong></div>
            <div className="metric-bar">
              <div className="metric-bar-fill" style={{ width: `${Math.min(100, nodeMetric.cpuUsage)}%`, background: cpuColor }} />
            </div>
            {cpuSeries.length > 1 && (
              <Sparkline values={cpuSeries} current={currentFrame} color={cpuColor} max={100} />
            )}

            <div className="metrics-value"><span>Memory</span><strong>{nodeMetric.ramUsageMb.toFixed(0)} MB</strong></div>
            <div className="metrics-value"><span>Throughput</span><strong>{nodeMetric.qps.toFixed(0)} qps</strong></div>
            <div className="metrics-value"><span>Queue Depth</span><strong>{nodeMetric.queueDepth}</strong></div>
            <div className="metrics-value">
              <span>Error Rate</span>
              <strong style={{ color: nodeMetric.errorRate > 0 ? 'var(--crit)' : 'var(--text)' }}>
                {(nodeMetric.errorRate * 100).toFixed(1)}%
              </strong>
            </div>
          </div>
        ) : (
          <p className="muted-note">Telemetry inactive. Run a simulation to trace live load metrics.</p>
        )}
      </div>

      {mechanics.length > 0 && (
        <div className="inspector-section">
          <h3>Component Mechanics</h3>
          {mechanics.map((s, i) => (
            <div className="stat-item" key={i}>
              <div className="stat-head">
                <span className="stat-label">{s.label}</span>
                <span className={`stat-value ${s.status ? `stat-${s.status}` : ''}`}>{s.value}</span>
              </div>
              {typeof s.pct === 'number' && (
                <div className="stat-bar">
                  <div className="stat-bar-fill" style={{ width: `${Math.min(100, Math.max(0, s.pct))}%`, background: barColor(s.status) }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="inspector-section">
        <h3>Chaos Engineering</h3>
        <div className="chaos-grid">
          {CHAOS_ACTIONS.map((a) => (
            <button
              key={a.type}
              className="chaos-btn"
              onClick={() => addIncident(a.type, selectedNode.id)}
              title={simRunning ? `Inject ${a.label} at the current time` : `Inject ${a.label} (starts when you run the simulation)`}
            >
              {a.label}
            </button>
          ))}
        </div>
        {incidents.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div className="chaos-list-head">
              <span>Active incidents</span>
              <button className="link-del-btn" style={{ fontSize: 11 }} onClick={clearIncidents}>Clear all</button>
            </div>
            {incidents.map((inc) => (
              <div className="link-row" key={inc.id}>
                <span className="link-row-label">
                  <span className={`chaos-dot chaos-${inc.type}`} /> {INCIDENT_LABEL[inc.type]} · <strong>{nodeLabelById(inc.targetId)}</strong>
                </span>
                <button className="link-del-btn" onClick={() => removeIncident(inc.id)} title="Remove incident">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="inspector-section">
        <p className="coord-note">x: {selectedNode.position.x} · y: {selectedNode.position.y}</p>
      </div>
    </aside>
  );
}

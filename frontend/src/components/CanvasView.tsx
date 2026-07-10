import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCanvasStore } from '../state/canvasStore';
import { CATEGORY_COLOR, CATEGORY_MAP } from '../types/graph';
import { Icon } from './icons';
import { Timeline } from './Timeline';
import { TraceViewer } from './TraceViewer';
import { InsightsPanel } from './InsightsPanel';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

export function CanvasView() {
  const nodes = useCanvasStore((state) => state.nodes);
  const links = useCanvasStore((state) => state.links);
  const selectedNodeId = useCanvasStore((state) => state.selectedNodeId);
  const selectNode = useCanvasStore((state) => state.selectNode);
  const moveNode = useCanvasStore((state) => state.moveNode);
  const addLink = useCanvasStore((state) => state.addLink);
  const linkMode = useCanvasStore((state) => state.linkMode);
  const linkSource = useCanvasStore((state) => state.linkSource);
  const setLinkSource = useCanvasStore((state) => state.setLinkSource);
  const updateNodeLabel = useCanvasStore((state) => state.updateNodeLabel);
  const simRunning = useCanvasStore((state) => state.simRunning);
  const linkFlows = useCanvasStore((state) => state.linkFlows);
  const metrics = useCanvasStore((state) => state.metrics);
  const peakSaturation = useCanvasStore((state) => state.peakSaturation);
  const stopSimulation = useCanvasStore((state) => state.stopSimulation);
  const incidents = useCanvasStore((state) => state.incidents);
  const currentFrame = useCanvasStore((state) => state.currentFrame);
  const toggleTrace = useCanvasStore((state) => state.toggleTrace);
  const showTrace = useCanvasStore((state) => state.showTrace);
  const trafficLevel = useCanvasStore((state) => state.trafficLevel);
  const setTrafficLevel = useCanvasStore((state) => state.setTrafficLevel);

  // Fast metric lookup by node id for load glows / chips.
  const metricById = useMemo(() => new Map(metrics.map((m) => [m.id, m])), [metrics]);

  // Nodes currently downed by a NODE_KILL incident at the active frame.
  const killedNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (!simRunning) return set;
    for (const inc of incidents) {
      if (inc.type === 'NODE_KILL' && currentFrame >= inc.startFrame && currentFrame < inc.startFrame + inc.durationFrames) {
        set.add(inc.targetId);
      }
    }
    return set;
  }, [incidents, currentFrame, simRunning]);

  const containerRef = useRef<HTMLDivElement>(null);
  
  // Transform settings
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Interaction refs
  const dragRef = useRef<{ id: string; startX: number; startY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // In transform space
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // Quick lookup table
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  // Convert client cursor coordinate to canvas grid coordinates
  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Drag-and-drop nodes
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    if (editingNodeId) return; // Don't drag while editing
    e.stopPropagation();
    if (e.button !== 0) return; // Left click only

    const node = nodeById.get(id);
    if (!node) return;

    selectNode(id);

    // Track original position in grid coordinates
    const curMouse = screenToCanvas(e.clientX, e.clientY);
    dragRef.current = {
      id,
      startX: curMouse.x - node.position.x,
      startY: curMouse.y - node.position.y,
    };
  };

  // Start connection link creation from a source port
  const handlePortMouseDown = (e: React.MouseEvent, id: string, isOut: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    if (isOut) {
      setLinkSource(id);
    }
  };

  // Complete connection on target port
  const handlePortMouseUp = (e: React.MouseEvent, id: string, isIn: boolean) => {
    e.stopPropagation();
    if (isIn && linkSource && linkSource !== id) {
      addLink(linkSource, id);
      setLinkSource(undefined);
    }
  };

  // Universal mouse move for dragging, panning, drawing temp link
  const handleMouseMove = (e: React.MouseEvent) => {
    const curMouse = screenToCanvas(e.clientX, e.clientY);
    setMousePos(curMouse);

    if (dragRef.current) {
      // Dragging node
      const node = nodeById.get(dragRef.current.id);
      if (node) {
        const newX = curMouse.x - dragRef.current.startX;
        const newY = curMouse.y - dragRef.current.startY;
        moveNode(dragRef.current.id, newX, newY);
      }
    } else if (panRef.current) {
      // Panning canvas
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setPan({
        x: panRef.current.startPanX + dx,
        y: panRef.current.startPanY + dy,
      });
    }
  };

  const handleMouseUp = () => {
    dragRef.current = null;
    panRef.current = null;
    setIsPanning(false);
  };

  // Empty-canvas drag pans the viewport. Left click on blank space also clears
  // the current selection; nodes/ports stop propagation so they never pan.
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1 || e.button === 2) {
      e.preventDefault();
      if (e.button === 0) {
        selectNode(undefined);
        setLinkSource(undefined);
      }
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
      setIsPanning(true);
    }
  };

  // Mirror pan/zoom into refs so the native wheel listener (registered once)
  // always reads the latest transform without re-subscribing every render.
  const panStateRef = useRef(pan);
  const zoomStateRef = useRef(zoom);
  panStateRef.current = pan;
  zoomStateRef.current = zoom;

  // Zooming via wheel / trackpad. React's onWheel is passive, so preventDefault
  // there is ignored and a trackpad pinch (wheel + ctrlKey) zooms the whole
  // browser instead of the canvas. We register a NATIVE non-passive listener so
  // preventDefault actually sticks and only the canvas zooms. Zoom is
  // proportional to the scroll delta (normalised across deltaMode); pinch
  // gestures (ctrlKey) use a gentler sensitivity than a mouse wheel.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;          // lines → px
      else if (e.deltaMode === 2) delta *= rect.height; // pages → px
      delta = Math.max(-40, Math.min(40, delta));

      const zoom = zoomStateRef.current;
      const pan = panStateRef.current;
      const intensity = e.ctrlKey ? 0.008 : 0.0025; // pinch vs wheel/scroll
      const factor = Math.exp(-delta * intensity);
      const nextZoom = Math.max(0.25, Math.min(zoom * factor, 3.0));
      if (nextZoom === zoom) return;

      // Keep the point under the cursor fixed while zooming.
      const x = cursorX - (cursorX - pan.x) * (nextZoom / zoom);
      const y = cursorY - (cursorY - pan.y) * (nextZoom / zoom);

      setZoom(nextZoom);
      setPan({ x, y });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  // Zoom controls: Zoom In, Zoom Out, Fit View
  const zoomIn = () => {
    setZoom((z) => Math.min(z * 1.2, 3.0));
  };

  const zoomOut = () => {
    setZoom((z) => Math.max(z / 1.2, 0.25));
  };

  const fitView = () => {
    if (nodes.length === 0) {
      setPan({ x: 50, y: 50 });
      setZoom(1);
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
      maxY = Math.max(maxY, n.position.y + NODE_HEIGHT);
    });

    const w = maxX - minX;
    const h = maxY - minY;
    const padding = 60;
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = rect.width / (w + padding * 2);
    const scaleY = rect.height / (h + padding * 2);
    const newZoom = Math.max(0.25, Math.min(scaleX, scaleY, 1.5));
    
    setZoom(newZoom);
    setPan({
      x: (rect.width - w * newZoom) / 2 - minX * newZoom,
      y: (rect.height - h * newZoom) / 2 - minY * newZoom,
    });
  };

  // Prevent default context menu to allow panning with right click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    const container = containerRef.current;
    container?.addEventListener('contextmenu', handleContextMenu);
    return () => {
      container?.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Inline node label editor key listener
  const handleLabelKeyDown = (e: React.KeyboardEvent, id: string, oldLabel: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.currentTarget as HTMLInputElement;
      updateNodeLabel(id, target.value.trim() || oldLabel);
      setEditingNodeId(null);
    } else if (e.key === 'Escape') {
      setEditingNodeId(null);
    }
  };

  // Link curve paths (Bezier output -> input port)
  const drawLinkPath = useCallback((source: typeof nodes[0], target: typeof nodes[0]) => {
    const sX = source.position.x + NODE_WIDTH;
    const sY = source.position.y + NODE_HEIGHT / 2;
    const tX = target.position.x;
    const tY = target.position.y + NODE_HEIGHT / 2;

    const dx = Math.abs(tX - sX);
    const c1X = sX + dx / 3;
    const c1Y = sY;
    const c2X = tX - dx / 3;
    const c2Y = tY;

    return `M ${sX} ${sY} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${tX} ${tY}`;
  }, []);

  // Minimap coordinate transforms
  const minimapNodes = useMemo(() => {
    if (nodes.length === 0) return { scale: 1, offsetX: 0, offsetY: 0, list: [], viewport: null };
    let minX = 0, minY = 0, maxX = 1000, maxY = 800;
    nodes.forEach((n) => {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
      maxY = Math.max(maxY, n.position.y + NODE_HEIGHT);
    });

    const pad = 100;
    const mapW = maxX - minX + pad * 2;
    const mapH = maxY - minY + pad * 2;
    // Fit inside the 168×108 minimap box (8px inset on each edge).
    const scale = Math.min(152 / mapW, 92 / mapH);

    return {
      scale,
      offsetX: minX - pad,
      offsetY: minY - pad,
      list: nodes.map((n) => ({
        id: n.id,
        left: (n.position.x - (minX - pad)) * scale,
        top: (n.position.y - (minY - pad)) * scale,
        width: NODE_WIDTH * scale,
        height: NODE_HEIGHT * scale,
        color: CATEGORY_COLOR[CATEGORY_MAP[n.type]],
      })),
      viewport: containerRef.current ? {
        left: (-pan.x / zoom - (minX - pad)) * scale,
        top: (-pan.y / zoom - (minY - pad)) * scale,
        width: (containerRef.current.clientWidth / zoom) * scale,
        height: (containerRef.current.clientHeight / zoom) * scale,
      } : null,
    };
  }, [nodes, pan, zoom]);

  // Map a 0..1 saturation to a status class used for colour/animation.
  const satClass = (sat: number) => (sat >= 0.9 ? 'sim-crit' : sat >= 0.6 ? 'sim-warn' : 'sim-ok');
  // Map CPU load (0..100) to a status class for node glow.
  const cpuClass = (cpu: number) => (cpu >= 90 ? 'sim-crit' : cpu >= 60 ? 'sim-warn' : 'sim-ok');

  return (
    <div
      ref={containerRef}
      className={`canvas-container ${linkMode || linkSource ? 'link-mode-active' : ''} ${isPanning ? 'panning' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={handleCanvasMouseDown}
    >
      <div
        className="canvas-transform-layer"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* SVG connection link layer */}
        <svg className="link-layer">
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--ink)" />
            </marker>
          </defs>

          {links.map((link) => {
            const source = nodeById.get(link.source);
            const target = nodeById.get(link.target);
            if (!source || !target) return null;

            const pathData = drawLinkPath(source, target);
            const pathId = `path-${link.id}`;
            const flow = simRunning ? linkFlows[link.id] : undefined;
            const active = !!flow && flow.qps > 0.5;
            const status = active ? satClass(flow!.saturation) : '';

            // Packet cadence: busier links get more, faster dots.
            let packetCount = 0;
            let dur = 2;
            if (active) {
              const qps = flow!.qps;
              packetCount = Math.min(5, Math.max(1, Math.round(Math.log10(qps + 1) * 1.6)));
              dur = Math.max(0.7, Math.min(3, 900 / (qps + 60)));
            }

            return (
              <g key={link.id}>
                {/* Visual sketch line (also the motion path for packets) */}
                <path
                  id={pathId}
                  d={pathData}
                  className={`link-path ${active ? `sim-live ${status}` : ''}`}
                  markerEnd="url(#arrow)"
                />
                {/* Active animated traffic flow (only while simulating) */}
                {active && <path d={pathData} className="link-flow" />}

                {/* Travelling request packets */}
                {active &&
                  Array.from({ length: packetCount }).map((_, i) => (
                    <circle key={i} r={3.2} className={`packet ${status}`}>
                      <animateMotion
                        dur={`${dur}s`}
                        repeatCount="indefinite"
                        begin={`${(dur / packetCount) * i}s`}
                        keyPoints="0;1"
                        keyTimes="0;1"
                        calcMode="linear"
                      >
                        <mpath xlinkHref={`#${pathId}`} />
                      </animateMotion>
                    </circle>
                  ))}
              </g>
            );
          })}

          {/* Mouse drag temp link line */}
          {linkSource && (() => {
            const source = nodeById.get(linkSource);
            if (!source) return null;
            const startX = source.position.x + NODE_WIDTH;
            const startY = source.position.y + NODE_HEIGHT / 2;
            return (
              <line
                x1={startX}
                y1={startY}
                x2={mousePos.x}
                y2={mousePos.y}
                className="link-temp"
              />
            );
          })()}
        </svg>

        {/* Nodes layer */}
        {nodes.map((node) => {
          const category = CATEGORY_MAP[node.type];
          const color = CATEGORY_COLOR[category];

          const metric = simRunning ? metricById.get(node.id) : undefined;
          const killed = killedNodeIds.has(node.id);
          const loaded = !killed && !!metric && metric.cpuUsage > 2;
          const loadStatus = loaded ? cpuClass(metric!.cpuUsage) : '';

          return (
            <div
              key={node.id}
              className={`node-card ${selectedNodeId === node.id ? 'selected' : ''} ${loaded ? loadStatus : ''} ${killed ? 'killed' : ''}`}
              style={{
                transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                ['--node-color' as string]: color,
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
            >
              {/* Simulation load ring + live CPU chip */}
              <div className="node-load-glow" />
              {loaded && (
                <span className={`node-load-chip ${loadStatus}`}>
                  {metric!.cpuUsage.toFixed(0)}%
                </span>
              )}
              {killed && <span className="node-load-chip sim-crit">DOWN</span>}

              <div className="node-body">
                {/* Port In (Left) */}
                <div
                  className="port port-in"
                  onMouseUp={(e) => handlePortMouseUp(e, node.id, true)}
                />

                <div className="node-icon">
                  <Icon type={node.type} size={22} />
                </div>
                <div className="node-details">
                  {editingNodeId === node.id ? (
                    <input
                      className="node-label-input"
                      defaultValue={node.label}
                      autoFocus
                      onBlur={(e) => {
                        updateNodeLabel(node.id, e.target.value.trim() || node.label);
                        setEditingNodeId(null);
                      }}
                      onKeyDown={(e) => handleLabelKeyDown(e, node.id, node.label)}
                    />
                  ) : (
                    <span
                      className="node-label"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingNodeId(node.id);
                      }}
                    >
                      {node.label}
                    </span>
                  )}
                  <span className="node-type-label">{node.type.replace(/_/g, ' ')}</span>
                </div>

                {/* Port Out (Right) */}
                <div
                  className="port port-out"
                  onMouseDown={(e) => handlePortMouseDown(e, node.id, true)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Live simulation status banner */}
      {simRunning && (
        <div className="sim-banner" onMouseDown={(e) => e.stopPropagation()}>
          <span className="sim-dot" />
          <span className="sim-banner-stat">
            peak load <strong>{(peakSaturation * 100).toFixed(0)}%</strong>
          </span>
          <div className="traffic-control" title="Scale the incoming request load">
            <span className="traffic-label">Traffic</span>
            <input
              className="traffic-slider"
              type="range"
              min={0.25}
              max={4}
              step={0.25}
              value={trafficLevel}
              onChange={(e) => setTrafficLevel(Number(e.target.value))}
            />
            <span className="traffic-val">×{trafficLevel % 1 === 0 ? trafficLevel : trafficLevel.toFixed(2)}</span>
          </div>
          <button
            className="sim-stop-btn"
            onClick={toggleTrace}
            style={showTrace ? { color: 'var(--accent)', borderColor: 'var(--accent-border)' } : undefined}
            title="Toggle request trace"
          >
            ⧉ Trace
          </button>
          <button className="sim-stop-btn" onClick={stopSimulation} title="Stop simulation">
            ■ Stop
          </button>
        </div>
      )}

      {/* Cost + SLO insights drawer */}
      <InsightsPanel />

      {/* Distributed trace waterfall */}
      <TraceViewer />

      {/* Playback timeline */}
      <Timeline />

      {/* Blueprint Control Board */}
      <div className="canvas-controls" onMouseDown={(e) => e.stopPropagation()}>
        <button onClick={zoomIn} title="Zoom In">+</button>
        <button onClick={zoomOut} title="Zoom Out">-</button>
        <button onClick={fitView} title="Fit All View">⊙</button>
      </div>

      {/* Visual Blueprint Minimap */}
      {minimapNodes.viewport && (
        <div className="minimap" onMouseDown={(e) => e.stopPropagation()}>
          {minimapNodes.list.map((mNode) => (
            <div
              key={mNode.id}
              className="minimap-node"
              style={{
                left: mNode.left,
                top: mNode.top,
                width: mNode.width,
                height: mNode.height,
                backgroundColor: mNode.color,
              }}
            />
          ))}
          <div
            className="minimap-viewport"
            style={{
              left: Math.max(0, Math.min(168, minimapNodes.viewport.left)),
              top: Math.max(0, Math.min(108, minimapNodes.viewport.top)),
              width: Math.min(168, minimapNodes.viewport.width),
              height: Math.min(108, minimapNodes.viewport.height),
            }}
          />
        </div>
      )}
    </div>
  );
}

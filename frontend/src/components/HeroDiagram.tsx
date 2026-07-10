import React, { useEffect, useState } from 'react';
import type { ComponentType } from '../types/graph';
import { CATEGORY_COLOR, CATEGORY_MAP } from '../types/graph';
import { Icon } from './icons';

/**
 * A self-running miniature of the ArchSim canvas used as the landing hero.
 * It reuses the product's real vocabulary — category colours, the SVG icon set,
 * bezier links and the flowing-packet animation — so the marketing surface and
 * the app read as one system. Motion is disabled under prefers-reduced-motion.
 */

interface Point { x: number; y: number; }
interface HeroNode { id: string; type: ComponentType; label: string; x: number; y: number; }

// Compact, symmetric architecture that stays legible at any scale (viewBox 640×460).
const NODES: HeroNode[] = [
  { id: 'client', type: 'CLIENT', label: 'Client', x: 60, y: 230 },
  { id: 'gateway', type: 'API_GATEWAY', label: 'API Gateway', x: 195, y: 230 },
  { id: 'lb', type: 'LOAD_BALANCER', label: 'Load Balancer', x: 330, y: 230 },
  { id: 'svc1', type: 'SERVER', label: 'Service A', x: 465, y: 120 },
  { id: 'svc2', type: 'SERVER', label: 'Service B', x: 465, y: 340 },
  { id: 'cache', type: 'REDIS', label: 'Cache', x: 600, y: 120 },
  { id: 'db', type: 'POSTGRESQL', label: 'Database', x: 600, y: 340 },
];

const EDGES: Array<[string, string, number]> = [
  // [source, target, packetCount] — busier spine gets more packets.
  ['client', 'gateway', 2],
  ['gateway', 'lb', 2],
  ['lb', 'svc1', 2],
  ['lb', 'svc2', 2],
  ['svc1', 'cache', 1],
  ['svc1', 'db', 1],
  ['svc2', 'db', 1],
];

const byId = (id: string) => NODES.find((n) => n.id === id)!;

function linkPath(a: Point, b: Point): string {
  const dx = (b.x - a.x) * 0.5;
  return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

const NODE_W = 74;
const NODE_H = 52;

export function HeroDiagram() {
  const reduced = usePrefersReducedMotion();

  return (
    <svg
      className="hero-diagram"
      viewBox="0 0 660 460"
      role="img"
      aria-label="Animated diagram of a distributed system: client to API gateway to load balancer, fanning out to services backed by a cache and database, with request traffic flowing between them."
    >
      <defs>
        <marker id="hero-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--border-strong)" />
        </marker>
      </defs>

      {/* Links + travelling packets */}
      {EDGES.map(([s, t, count], idx) => {
        const a = byId(s);
        const b = byId(t);
        const d = linkPath(a, b);
        const pathId = `hero-edge-${idx}`;
        const color = CATEGORY_COLOR[CATEGORY_MAP[b.type]];
        const dur = 2.6 + (idx % 3) * 0.5;
        return (
          <g key={pathId}>
            <path id={pathId} d={d} className="hero-link" markerEnd="url(#hero-arrow)" />
            {!reduced &&
              Array.from({ length: count }).map((_, i) => (
                <circle key={i} r={4} className="hero-packet" style={{ fill: color }}>
                  <animateMotion
                    dur={`${dur}s`}
                    repeatCount="indefinite"
                    begin={`${(dur / count) * i}s`}
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

      {/* Nodes */}
      {NODES.map((n) => {
        const color = CATEGORY_COLOR[CATEGORY_MAP[n.type]];
        return (
          <g key={n.id} className="hero-node" transform={`translate(${n.x} ${n.y})`}>
            <rect x={-NODE_W / 2} y={-NODE_H / 2} width={NODE_W} height={NODE_H} rx={12} className="hero-node-box" />
            <g transform="translate(-13 -20)" style={{ color }}>
              <Icon type={n.type} size={26} />
            </g>
            <text x={0} y={19} textAnchor="middle" className="hero-node-label">{n.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

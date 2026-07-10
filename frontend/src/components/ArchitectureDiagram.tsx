import React, { useEffect, useMemo, useState } from 'react';
import type { CanvasLink, CanvasNode } from '../types/graph';
import { CATEGORY_COLOR, CATEGORY_MAP } from '../types/graph';
import { Icon } from './icons';

interface Props {
  nodes: CanvasNode[];
  links: CanvasLink[];
  animated?: boolean;
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

const H = 46;
const nodeWidth = (label: string) => Math.min(176, Math.max(104, label.length * 7.4 + 40));

/**
 * Renders an architecture (nodes + links) as a clean, labelled diagram with the
 * product's real icons and category colours. Used as the visual "solution".
 */
export function ArchitectureDiagram({ nodes, links, animated = true }: Props) {
  const reduced = usePrefersReducedMotion();

  const view = useMemo(() => {
    if (nodes.length === 0) return null;
    const boxes = nodes.map((n) => ({ n, w: nodeWidth(n.label) }));
    const minX = Math.min(...boxes.map((b) => b.n.position.x - b.w / 2));
    const maxX = Math.max(...boxes.map((b) => b.n.position.x + b.w / 2));
    const minY = Math.min(...nodes.map((n) => n.position.y - H / 2));
    const maxY = Math.max(...nodes.map((n) => n.position.y + H / 2 + 16)); // room for label
    const pad = 18;
    const pos = new Map(nodes.map((n) => [n.id, n.position]));
    const widths = new Map(boxes.map((b) => [b.n.id, b.w]));
    return {
      vb: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`,
      pos,
      widths,
    };
  }, [nodes]);

  if (!view) return null;

  const flow = animated && !reduced;

  return (
    <svg className="arch-diagram" viewBox={view.vb} role="img" aria-label="Reference architecture diagram">
      <defs>
        <marker id="arch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="var(--border-strong)" />
        </marker>
      </defs>

      {links.map((l, i) => {
        const a = view.pos.get(l.source);
        const b = view.pos.get(l.target);
        if (!a || !b) return null;
        const aw = (view.widths.get(l.source) ?? 110) / 2;
        const bw = (view.widths.get(l.target) ?? 110) / 2;
        // Exit from the side of the source box facing the target.
        const ax = a.x + (b.x >= a.x ? aw : -aw);
        const bx = b.x + (b.x >= a.x ? -bw : bw);
        const dx = (bx - ax) * 0.5;
        const d = `M ${ax} ${a.y} C ${ax + dx} ${a.y}, ${bx - dx} ${b.y}, ${bx} ${b.y}`;
        const pathId = `arch-l-${i}`;
        const color = CATEGORY_COLOR[CATEGORY_MAP[nodes.find((n) => n.id === l.target)!.type]];
        return (
          <g key={l.id}>
            <path id={pathId} d={d} className="arch-link" markerEnd="url(#arch-arrow)" />
            {flow && (
              <circle r={3} className="arch-packet" style={{ fill: color }}>
                <animateMotion dur={`${2.4 + (i % 3) * 0.4}s`} repeatCount="indefinite" begin={`${(i % 4) * 0.4}s`}>
                  <mpath xlinkHref={`#${pathId}`} />
                </animateMotion>
              </circle>
            )}
          </g>
        );
      })}

      {nodes.map((n) => {
        const w = view.widths.get(n.id) ?? 110;
        const color = CATEGORY_COLOR[CATEGORY_MAP[n.type]];
        return (
          <g key={n.id} transform={`translate(${n.position.x} ${n.position.y})`}>
            <rect x={-w / 2} y={-H / 2} width={w} height={H} rx={11} className="arch-box" />
            <rect x={-w / 2} y={-H / 2} width={4} height={H} rx={2} fill={color} />
            <g transform={`translate(${-w / 2 + 15} ${-11})`} style={{ color }}>
              <Icon type={n.type} size={22} />
            </g>
            <text x={-w / 2 + 44} y={4} className="arch-label">{n.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

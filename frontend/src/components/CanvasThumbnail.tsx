import React, { useMemo } from 'react';
import type { CanvasLink, CanvasNode } from '../types/graph';
import { CATEGORY_COLOR, CATEGORY_MAP } from '../types/graph';

interface Props {
  nodes: CanvasNode[];
  links: CanvasLink[];
}

/**
 * A lightweight, non-interactive mini-map of a project's canvas used on the
 * dashboard cards. Nodes become category-coloured dots and links faint lines,
 * scaled to fit a fixed viewBox with padding.
 */
export function CanvasThumbnail({ nodes, links }: Props) {
  const view = useMemo(() => {
    if (nodes.length === 0) return null;
    const xs = nodes.map((n) => n.position.x);
    const ys = nodes.map((n) => n.position.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const pad = 40;
    const w = Math.max(maxX - minX, 1) + pad * 2;
    const h = Math.max(maxY - minY, 1) + pad * 2;
    const pos = new Map(nodes.map((n) => [n.id, { x: n.position.x - minX + pad, y: n.position.y - minY + pad }]));
    return { w, h, pos };
  }, [nodes, links]);

  if (!view) {
    return <div className="thumb thumb-empty">Empty canvas</div>;
  }

  return (
    <svg className="thumb" viewBox={`0 0 ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Canvas preview">
      {links.map((l) => {
        const a = view.pos.get(l.source);
        const b = view.pos.get(l.target);
        if (!a || !b) return null;
        return <line key={l.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="thumb-link" />;
      })}
      {nodes.map((n) => {
        const p = view.pos.get(n.id);
        if (!p) return null;
        return <circle key={n.id} cx={p.x} cy={p.y} r={18} fill={CATEGORY_COLOR[CATEGORY_MAP[n.type]]} className="thumb-node" />;
      })}
    </svg>
  );
}

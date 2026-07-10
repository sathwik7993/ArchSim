import { describe, expect, it } from 'vitest';
import { TEMPLATES } from './templates';
import { DEFAULT_PROPERTIES } from '../types/graph';

describe('starter templates', () => {
  it('have unique ids', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const t of TEMPLATES) {
    describe(t.name, () => {
      const nodeIds = new Set(t.nodes.map((n) => n.id));

      it('has unique node ids', () => {
        expect(nodeIds.size).toBe(t.nodes.length);
      });

      it('has a CLIENT traffic source with qps', () => {
        const client = t.nodes.find((n) => n.type === 'CLIENT');
        expect(client).toBeDefined();
        expect(Number(client!.properties.qps)).toBeGreaterThan(0);
      });

      it('only links existing nodes', () => {
        for (const l of t.links) {
          expect(nodeIds.has(l.source)).toBe(true);
          expect(nodeIds.has(l.target)).toBe(true);
        }
      });

      it('uses known component types with default props applied', () => {
        for (const n of t.nodes) {
          expect(DEFAULT_PROPERTIES[n.type]).toBeDefined();
        }
      });

      it('is connected enough to simulate (every non-client node has an inbound edge)', () => {
        const hasInbound = new Set(t.links.map((l) => l.target));
        for (const n of t.nodes) {
          if (n.type === 'CLIENT') continue;
          expect(hasInbound.has(n.id)).toBe(true);
        }
      });
    });
  }
});

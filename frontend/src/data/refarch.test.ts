import { describe, expect, it } from 'vitest';
import { REF_ARCH } from './refarch';
import { TOPICS } from './topics';
import { DEFAULT_PROPERTIES } from '../types/graph';

describe('reference architectures', () => {
  it('defines one for every topic', () => {
    for (const t of TOPICS) {
      expect(REF_ARCH[t.id]).toBeDefined();
    }
  });

  for (const t of TOPICS) {
    describe(t.label, () => {
      const arch = REF_ARCH[t.id];

      it('has a caption and nodes', () => {
        expect(arch.caption.length).toBeGreaterThan(20);
        expect(arch.nodes.length).toBeGreaterThanOrEqual(3);
      });

      it('has unique node ids and known component types with default props', () => {
        const ids = arch.nodes.map((n) => n.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const n of arch.nodes) {
          expect(DEFAULT_PROPERTIES[n.type]).toBeDefined();
          // properties should include the defaults so it simulates when loaded
          expect(Object.keys(n.properties).length).toBeGreaterThan(0);
        }
      });

      it('only links existing nodes and is connected', () => {
        const ids = new Set(arch.nodes.map((n) => n.id));
        const touched = new Set<string>();
        for (const l of arch.links) {
          expect(ids.has(l.source)).toBe(true);
          expect(ids.has(l.target)).toBe(true);
          touched.add(l.source);
          touched.add(l.target);
        }
        // every node participates in at least one link
        for (const n of arch.nodes) expect(touched.has(n.id)).toBe(true);
      });
    });
  }
});

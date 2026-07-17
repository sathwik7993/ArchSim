import { describe, expect, it } from 'vitest';
import { REF_ARCH, PROBLEM_REF_ARCH } from './refarch';
import { TOPICS } from './topics';
import { PROBLEM_BY_SLUG } from './problems';
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

describe('problem-specific reference architectures', () => {
  const slugs = Object.keys(PROBLEM_REF_ARCH);

  it('covers a meaningful set of flagship problems', () => {
    expect(slugs.length).toBeGreaterThanOrEqual(25);
  });

  for (const slug of slugs) {
    describe(slug, () => {
      const arch = PROBLEM_REF_ARCH[slug];

      it('keys a real problem slug', () => {
        expect(PROBLEM_BY_SLUG[slug]).toBeDefined();
      });

      it('has a caption, valid components, and a source of traffic', () => {
        expect(arch.caption.length).toBeGreaterThan(20);
        expect(arch.nodes.length).toBeGreaterThanOrEqual(4);
        for (const n of arch.nodes) {
          expect(DEFAULT_PROPERTIES[n.type]).toBeDefined();
          expect(Object.keys(n.properties).length).toBeGreaterThan(0);
        }
        expect(arch.nodes.some((n) => n.type === 'CLIENT')).toBe(true);
      });

      it('only links existing nodes and is fully connected', () => {
        const ids = new Set(arch.nodes.map((n) => n.id));
        const touched = new Set<string>();
        for (const l of arch.links) {
          expect(ids.has(l.source)).toBe(true);
          expect(ids.has(l.target)).toBe(true);
          touched.add(l.source);
          touched.add(l.target);
        }
        for (const n of arch.nodes) expect(touched.has(n.id)).toBe(true);
      });
    });
  }
});

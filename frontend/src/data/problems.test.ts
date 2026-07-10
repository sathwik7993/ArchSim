import { describe, expect, it } from 'vitest';
import { PROBLEMS, getSolution, TOTAL_PROBLEMS } from './problems';
import { TOPIC_META } from './topics';

describe('problem catalog', () => {
  it('loads all 148 problems', () => {
    expect(TOTAL_PROBLEMS).toBe(148);
  });

  it('gives every problem a unique slug', () => {
    const slugs = PROBLEMS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((s) => /^[a-z0-9-]+$/.test(s))).toBe(true);
  });

  it('assigns every problem a known topic', () => {
    for (const p of PROBLEMS) {
      expect(TOPIC_META[p.topic]).toBeDefined();
    }
  });

  it('composes a complete, non-empty solution for every problem', () => {
    for (const p of PROBLEMS) {
      const s = getSolution(p);
      expect(s.approach.length).toBeGreaterThan(40);
      expect(s.functional.length).toBeGreaterThanOrEqual(3);
      expect(s.nonFunctional.length).toBeGreaterThanOrEqual(3);
      expect(s.deepDives.length).toBeGreaterThanOrEqual(3);
      for (const d of s.deepDives) {
        expect(d.title.length).toBeGreaterThan(3);
        expect(d.body.length).toBeGreaterThan(60);
      }
      expect(s.hints.length).toBeGreaterThanOrEqual(3);
      expect(s.archsim.length).toBeGreaterThanOrEqual(1);
      expect(s.bottlenecks.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('applies bespoke overrides to flagship problems', () => {
    const url = PROBLEMS.find((p) => p.slug === 'url-shortener')!;
    const sol = getSolution(url);
    expect(sol.deepDives.some((d) => /base62|key generation/i.test(d.title))).toBe(true);
  });
});

// @ts-nocheck — build-time seed generator; uses Node builtins (no @types/node).
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PROBLEMS, getSolution } from './problems';
import { getRefArch } from './refarch';

// ---------------------------------------------------------------------------
// Seed generator (not a behavioural test): composes every problem's full record
// from the frontend source of truth and writes it to the backend's seed
// resource, so the DB is seeded with byte-for-byte the same content the app
// bundles. Best-effort file write — skipped silently if the backend dir is
// absent (e.g. frontend-only CI), while the assertions still run.
// ---------------------------------------------------------------------------

describe('backend seed export', () => {
  it('composes 148 complete problem records and writes the seed file', () => {
    const records = PROBLEMS.map((p) => ({
      slug: p.slug,
      name: p.name,
      difficulty: p.difficulty,
      topic: p.topic,
      summary: p.summary,
      note: p.note ?? null,
      sources: p.sources,
      solution: getSolution(p),
      refArch: getRefArch(p.topic, p.slug),
    }));

    expect(records.length).toBe(148);
    for (const r of records) {
      expect(r.solution.deepDives.length).toBeGreaterThanOrEqual(3);
      expect(r.refArch.nodes.length).toBeGreaterThanOrEqual(3);
    }

    try {
      const path = resolve(process.cwd(), '../backend/src/main/resources/seed/problems.json');
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(records, null, 2));
    } catch {
      // backend directory not present in this checkout — that's fine.
    }
  });
});

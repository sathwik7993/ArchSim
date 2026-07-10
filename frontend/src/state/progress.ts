import { create } from 'zustand';
import { fetchProgress, pushProgress } from '../api/problems';

// ---------------------------------------------------------------------------
// Phase 8 — practice progress. Tracks which problems a student has marked as
// attempted (which unlocks the solution) and which they consider solved. Stored
// locally so it survives reloads without any account.
// ---------------------------------------------------------------------------

const ATTEMPTED_KEY = 'archsim.attempted';
const SOLVED_KEY = 'archsim.solved';

function read(key: string): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function write(key: string, set: Set<string>) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify([...set]));
}

interface ProgressState {
  attempted: Set<string>;
  solved: Set<string>;
  markAttempted: (slug: string) => void;
  toggleSolved: (slug: string) => void;
  isAttempted: (slug: string) => boolean;
  isSolved: (slug: string) => boolean;
  /** Merge server-side progress in (best-effort; only if the user has a session). */
  hydrateFromServer: () => Promise<void>;
}

export const useProgress = create<ProgressState>((set, get) => ({
  attempted: read(ATTEMPTED_KEY),
  solved: read(SOLVED_KEY),

  markAttempted: (slug) => {
    const next = new Set(get().attempted);
    next.add(slug);
    write(ATTEMPTED_KEY, next);
    set({ attempted: next });
    void pushProgress(slug, 'attempted');
  },

  toggleSolved: (slug) => {
    const next = new Set(get().solved);
    const nowSolved = !next.has(slug);
    if (next.has(slug)) next.delete(slug);
    else {
      next.add(slug);
      // Solving implies an attempt.
      const att = new Set(get().attempted);
      att.add(slug);
      write(ATTEMPTED_KEY, att);
      set({ attempted: att });
    }
    write(SOLVED_KEY, next);
    set({ solved: next });
    if (nowSolved) void pushProgress(slug, 'solved');
  },

  isAttempted: (slug) => get().attempted.has(slug),
  isSolved: (slug) => get().solved.has(slug),

  hydrateFromServer: async () => {
    const rows = await fetchProgress();
    if (rows.length === 0) return;
    const attempted = new Set(get().attempted);
    const solved = new Set(get().solved);
    for (const r of rows) {
      attempted.add(r.slug);
      if (r.status === 'solved') solved.add(r.slug);
    }
    write(ATTEMPTED_KEY, attempted);
    write(SOLVED_KEY, solved);
    set({ attempted, solved });
  },
}));

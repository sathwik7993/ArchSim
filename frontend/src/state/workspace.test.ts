import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkspace } from './workspace';

// Minimal localStorage stub (tests run in the node env, which has none).
function makeLocalStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  } as Storage;
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = makeLocalStorage();
});

describe('practice workspace', () => {
  it('reuses one workspace per problem slug — opening a problem twice does not duplicate it', () => {
    const ws = useWorkspace.getState();
    const first = ws.ensurePracticeProject('url-shortener', 'URL Shortener', 'summary');
    const second = ws.ensurePracticeProject('url-shortener', 'URL Shortener', 'summary');
    expect(first.id).toBe('practice-url-shortener');
    expect(second.id).toBe(first.id);
    expect(first.problemSlug).toBe('url-shortener');
  });

  it('creates distinct workspaces for distinct problems', () => {
    const ws = useWorkspace.getState();
    const a = ws.ensurePracticeProject('problem-a', 'A');
    const b = ws.ensurePracticeProject('problem-b', 'B');
    expect(a.id).not.toBe(b.id);
    expect(a.problemSlug).toBe('problem-a');
    expect(b.problemSlug).toBe('problem-b');
  });

  it('marks practice projects so the dashboard can filter them out', () => {
    const p = useWorkspace.getState().ensurePracticeProject('chat-app', 'Chat');
    expect(p.problemSlug).toBeTruthy();
  });
});

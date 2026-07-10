import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PROBLEMS, DIFFICULTY_ORDER, type Difficulty } from '../data/problems';
import { TOPICS, TOPIC_META, type TopicId } from '../data/topics';
import { useProgress } from '../state/progress';
import { useCanvasStore } from '../state/canvasStore';
import { useWorkspace } from '../state/workspace';
import { fetchProblemSummaries, type ProblemSummaryDto } from '../api/problems';

type SortKey = 'difficulty' | 'az';
const DIFFS: Array<Difficulty | 'All'> = ['All', 'Easy', 'Medium', 'Hard'];

export function Problems() {
  const navigate = useNavigate();
  const theme = useCanvasStore((s) => s.theme);
  const toggleTheme = useCanvasStore((s) => s.toggleTheme);
  const attempted = useProgress((s) => s.attempted);
  const solved = useProgress((s) => s.solved);
  const hydrate = useProgress((s) => s.hydrateFromServer);
  const ensurePractice = useWorkspace((s) => s.ensurePracticeProject);

  // Catalog comes from the backend when it's up, falling back to the bundled
  // copy (identical content) so the page always works offline.
  const { data } = useQuery({
    queryKey: ['problem-catalog'],
    queryFn: fetchProblemSummaries,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  const catalog: ProblemSummaryDto[] = data ?? PROBLEMS;

  // Pull any server-side progress in (best-effort; only if signed in).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const openProblem = (p: ProblemSummaryDto) => {
    const meta = ensurePractice(p.slug, p.name, p.summary);
    navigate(`/design/${meta.id}`);
  };

  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty | 'All'>('All');
  const [topic, setTopic] = useState<TopicId | 'All'>('All');
  const [sort, setSort] = useState<SortKey>('difficulty');

  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of catalog) counts[p.topic] = (counts[p.topic] ?? 0) + 1;
    return counts;
  }, [catalog]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = catalog.filter((p) => {
      if (difficulty !== 'All' && p.difficulty !== difficulty) return false;
      if (topic !== 'All' && p.topic !== topic) return false;
      if (q && !`${p.name} ${p.summary}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return [...list].sort((a, b) =>
      sort === 'az'
        ? a.name.localeCompare(b.name)
        : DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || a.name.localeCompare(b.name),
    );
  }, [catalog, query, difficulty, topic, sort]);

  const pct = Math.round((solved.size / (catalog.length || 1)) * 100);

  return (
    <div className="problems">
      <header className="dash-topbar">
        <div className="topbar-brand">
          <button className="back-btn" onClick={() => navigate('/dashboard')} title="Back to projects" aria-label="Back to projects">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <span className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
            </svg>
          </span>
          <strong>ArchSim</strong>
          <span className="brand-subtitle">Practice</span>
        </div>
        <button className="ghost-btn icon-only" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>

      <div className="problems-body">
        {/* Hero */}
        <div className="pr-hero">
          <div>
            <h1 className="pr-title">System Design Problems</h1>
            <p className="pr-sub">{catalog.length} curated problems from real interviews — attempt each on the canvas, then unlock a visual solution.</p>
          </div>
          <div className="pr-progress" title={`${solved.size} solved, ${attempted.size} attempted`}>
            <div className="pr-ring" style={{ ['--pct' as string]: `${pct}` }}>
              <span>{pct}%</span>
            </div>
            <div className="pr-progress-meta">
              <span><strong>{solved.size}</strong> solved</span>
              <span><strong>{attempted.size}</strong> attempted</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="problems-controls">
          <div className="search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input className="search-input" placeholder="Search problems…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search problems" />
          </div>
          <div className="seg" role="tablist" aria-label="Difficulty filter">
            {DIFFS.map((d) => (
              <button key={d} className={`seg-btn ${difficulty === d ? 'active' : ''} ${d !== 'All' ? `d-${d.toLowerCase()}` : ''}`} onClick={() => setDifficulty(d)} aria-pressed={difficulty === d}>{d}</button>
            ))}
          </div>
          <select className="topic-select" value={topic} onChange={(e) => setTopic(e.target.value as TopicId | 'All')} aria-label="Topic filter">
            <option value="All">All topics ({catalog.length})</option>
            {TOPICS.filter((t) => topicCounts[t.id]).map((t) => (
              <option key={t.id} value={t.id}>{t.label} ({topicCounts[t.id]})</option>
            ))}
          </select>
          <select className="topic-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort order">
            <option value="difficulty">Sort: Difficulty</option>
            <option value="az">Sort: A–Z</option>
          </select>
        </div>

        {topic !== 'All' && <p className="topic-blurb">{TOPIC_META[topic].blurb}</p>}

        {/* Table */}
        <div className="pr-table" role="table" aria-label="Problems">
          <div className="pr-thead" role="row">
            <span className="pr-th col-status" role="columnheader">Status</span>
            <span className="pr-th col-title" role="columnheader">Problem</span>
            <span className="pr-th col-topic" role="columnheader">Topic</span>
            <span className="pr-th col-diff" role="columnheader">Difficulty</span>
          </div>
          {results.map((p, i) => {
            const meta = TOPIC_META[p.topic];
            const isSolved = solved.has(p.slug);
            const isAttempted = attempted.has(p.slug);
            return (
              <div
                key={p.slug}
                className="pr-tr"
                role="row"
                tabIndex={0}
                onClick={() => openProblem(p)}
                onKeyDown={(e) => e.key === 'Enter' && openProblem(p)}
              >
                <span className="pr-td col-status" role="cell">
                  {isSolved ? (
                    <span className="check solved" title="Solved">✓</span>
                  ) : isAttempted ? (
                    <span className="check attempted" title="Attempted">◑</span>
                  ) : (
                    <span className="check none" title="Not started" />
                  )}
                </span>
                <span className="pr-td col-title" role="cell">
                  <span className="pr-num">{i + 1}.</span>
                  <span className="pr-titletext">
                    <span className="pr-name">{p.name}</span>
                    <span className="pr-summary">{p.summary}</span>
                  </span>
                </span>
                <span className="pr-td col-topic" role="cell">
                  <span className="topic-chip" style={{ ['--chip' as string]: meta.accent }}>{meta.label}</span>
                </span>
                <span className={`pr-td col-diff role-diff d-${p.difficulty.toLowerCase()}`} role="cell">{p.difficulty}</span>
              </div>
            );
          })}
          {results.length === 0 && <div className="pr-empty">No problems match your filters.</div>}
        </div>
      </div>
    </div>
  );
}

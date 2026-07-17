import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProblem, getSolution } from '../data/problems';
import { TOPIC_META } from '../data/topics';
import { getRefArch } from '../data/refarch';
import { useProgress } from '../state/progress';
import { useCanvasStore } from '../state/canvasStore';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { Icon } from './icons';
import { CATEGORY_COLOR, CATEGORY_MAP, type ComponentType } from '../types/graph';

type Tab = 'description' | 'hints' | 'solution';

interface Props {
  slug: string;
  onCollapse: () => void;
  onToast?: (msg: string) => void;
}

/**
 * The left-hand practice panel: problem statement, hints and the gated solution
 * (including the reference architecture) sitting beside the live canvas — a
 * LeetCode-style split so the question is always in view while you design.
 */
export function ProblemPanel({ slug, onCollapse, onToast }: Props) {
  const navigate = useNavigate();
  const problem = getProblem(slug);

  const replaceGraph = useCanvasStore((s) => s.replaceGraph);
  const markAttempted = useProgress((s) => s.markAttempted);
  const toggleSolved = useProgress((s) => s.toggleSolved);
  const attemptedSet = useProgress((s) => s.attempted);
  const solvedSet = useProgress((s) => s.solved);

  const [tab, setTab] = useState<Tab>('description');
  const [hintsShown, setHintsShown] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loadConfirm, setLoadConfirm] = useState(false);
  const [openDive, setOpenDive] = useState<number | null>(0);

  const solution = useMemo(() => (problem ? getSolution(problem) : null), [problem]);
  const refArch = useMemo(() => (problem ? getRefArch(problem.topic, problem.slug) : null), [problem]);

  if (!problem || !solution || !refArch) {
    return (
      <aside className="problem-panel">
        <div className="pp-body"><p className="muted-note">Problem not found.</p></div>
      </aside>
    );
  }

  const meta = TOPIC_META[problem.topic];
  const isAttempted = attemptedSet.has(problem.slug);
  const isSolved = solvedSet.has(problem.slug);

  const loadReference = () => {
    replaceGraph(refArch.nodes, refArch.links);
    setLoadConfirm(false);
    onToast?.('Reference architecture loaded onto the canvas');
  };

  const goSolution = () => {
    setTab('solution');
    if (!revealed) setConfirmOpen(true);
  };

  return (
    <aside className="problem-panel">
      <div className="pp-top">
        <button className="pp-back" onClick={() => navigate('/problems')} title="All problems" aria-label="All problems">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div className="pp-badges">
          <span className={`diff-badge d-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
          {isSolved && <span className="status-pill solved">✓</span>}
          {!isSolved && isAttempted && <span className="status-pill attempted">Attempted</span>}
        </div>
        <button className="pp-collapse" onClick={onCollapse} title="Hide problem panel" aria-label="Hide problem panel">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18l-6-6 6-6M18 18l-6-6 6-6" /></svg>
        </button>
      </div>

      <div className="pp-titlerow">
        <h1 className="pp-title">{problem.name}</h1>
        <span className="topic-chip" style={{ ['--chip' as string]: meta.accent }}>{meta.label}</span>
      </div>

      <div className="pd-tabs pp-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'description'} className={`pd-tab ${tab === 'description' ? 'active' : ''}`} onClick={() => setTab('description')}>Description</button>
        <button role="tab" aria-selected={tab === 'hints'} className={`pd-tab ${tab === 'hints' ? 'active' : ''}`} onClick={() => setTab('hints')}>Hints <span className="tab-count">{solution.hints.length}</span></button>
        <button role="tab" aria-selected={tab === 'solution'} className={`pd-tab ${tab === 'solution' ? 'active' : ''}`} onClick={goSolution}>Solution {revealed ? <span className="tab-unlocked">✓</span> : <span className="tab-lock">🔒</span>}</button>
      </div>

      <div className="pp-body">
        {tab === 'description' && (
          <div className="pd-panel">
            <p className="pp-summary">{problem.summary}</p>
            {problem.note && <p className="detail-note">Note: {problem.note}</p>}
            <div className="pp-callout">
              <strong>✎ Try it yourself first</strong>
              <p>Sketch your architecture on the canvas to the right and simulate it before revealing the solution.</p>
            </div>
            {problem.sources.length > 0 && (
              <div className="pp-sources">
                {problem.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="source-link">
                    {s.site}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H8M17 7v9" /></svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'hints' && (
          <div className="pd-panel">
            <p className="muted-note">Reveal one nudge at a time.</p>
            <div className="hint-stack">
              {solution.hints.slice(0, hintsShown).map((h, i) => (
                <div className="hint" key={i}><span className="hint-n">{i + 1}</span><p>{h}</p></div>
              ))}
            </div>
            {hintsShown < solution.hints.length ? (
              <button className="primary-btn full" onClick={() => setHintsShown((n) => n + 1)}>
                {hintsShown === 0 ? 'Reveal first hint' : `Reveal hint ${hintsShown + 1} of ${solution.hints.length}`}
              </button>
            ) : <p className="muted-note">All hints revealed. Ready for the solution?</p>}
          </div>
        )}

        {tab === 'solution' && (
          <div className="pd-panel">
            {!revealed ? (
              <div className="solution-gate">
                <span className="gate-icon" aria-hidden="true">🔒</span>
                <h2>Attempt it first</h2>
                <p>Viewing the solution now may reduce how much you learn. Try designing on the canvas first — this is a way to check and deepen your thinking.</p>
                <button className="reveal-btn" onClick={() => setConfirmOpen(true)}>Reveal the solution</button>
              </div>
            ) : (
              <div className="solution-body">
                <div className="arch-card">
                  <div className="arch-card-head">
                    <h2>Reference architecture</h2>
                    <button className="primary-btn sm" onClick={() => setLoadConfirm(true)}>Load onto canvas →</button>
                  </div>
                  <div className="arch-stage"><ArchitectureDiagram nodes={refArch.nodes} links={refArch.links} /></div>
                  <p className="arch-caption">{refArch.caption}</p>
                </div>

                <p className="sol-approach">{solution.approach}</p>
                <SolList n="1" title="Functional requirements" items={solution.functional} />
                <SolList n="2" title="Non-functional requirements" items={solution.nonFunctional} />
                <SolList n="3" title="Estimate the scale" items={solution.estimation} />
                <SolList n="4" title="Core entities & API" items={solution.entities} mono />

                <div className="sol-block">
                  <h3 className="sol-h3"><span className="sol-n">5</span> Deep dives & edge cases</h3>
                  <div className="dive-accordion">
                    {solution.deepDives.map((d, i) => (
                      <div className={`dive ${openDive === i ? 'open' : ''}`} key={i}>
                        <button className="dive-head" onClick={() => setOpenDive(openDive === i ? null : i)} aria-expanded={openDive === i}>
                          <span>{d.title}</span><span className="dive-chevron">{openDive === i ? '−' : '+'}</span>
                        </button>
                        {openDive === i && <p className="dive-body">{d.body}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <SolList n="6" title="Bottlenecks & scaling" items={solution.bottlenecks} />

                <div className="sol-block">
                  <h3 className="sol-h3"><span className="sol-n">7</span> Components used</h3>
                  <div className="archsim-chips">
                    {solution.archsim.map((t) => (
                      <span className="archsim-chip" key={t} style={{ color: CATEGORY_COLOR[CATEGORY_MAP[t as ComponentType]] }}>
                        <Icon type={t as ComponentType} size={14} />{t.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <button className={`ghost-btn full ${isSolved ? 'is-solved' : ''}`} onClick={() => toggleSolved(problem.slug)}>
                  {isSolved ? '✓ Solved' : 'Mark as solved'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="modal-overlay" onClick={() => setConfirmOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Reveal the solution?</h2>
            <p className="modal-copy">You’ll learn more if you sketch your own design first. Reveal only when ready to compare.</p>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setConfirmOpen(false)}>Not yet</button>
              <button className="primary-btn" onClick={() => { setConfirmOpen(false); setRevealed(true); markAttempted(problem.slug); }}>Reveal it</button>
            </div>
          </div>
        </div>
      )}

      {loadConfirm && (
        <div className="modal-overlay" onClick={() => setLoadConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Load reference onto canvas?</h2>
            <p className="modal-copy">This replaces the current design on your canvas with the reference architecture. You can undo with Ctrl+Z.</p>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setLoadConfirm(false)}>Cancel</button>
              <button className="primary-btn" onClick={loadReference}>Load it</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function SolList({ n, title, items, mono }: { n: string; title: string; items: string[]; mono?: boolean }) {
  return (
    <div className="sol-block">
      <h3 className="sol-h3"><span className="sol-n">{n}</span> {title}</h3>
      <ul className={`sol-list ${mono ? 'mono' : ''}`}>{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
    </div>
  );
}

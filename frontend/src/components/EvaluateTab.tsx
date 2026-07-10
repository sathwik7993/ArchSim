import React, { useState } from 'react';
import { useCanvasStore } from '../state/canvasStore';
import { useAiSettings, GEMINI_MODELS } from '../ai/settings';
import { evaluateDesign, type EvalContext, type Evaluation } from '../ai/evaluate';
import { SettingsModal } from './SettingsModal';
import { Icon } from './icons';
import { CATEGORY_COLOR, CATEGORY_MAP, type ComponentType } from '../types/graph';
import type { Problem } from '../data/problems';
import type { Solution } from '../data/solution';
import type { ComponentMetric } from '../types/graph';

function simSummary(
  nodes: ReturnType<typeof useCanvasStore.getState>['nodes'],
  metrics: ComponentMetric[],
  peakSaturation: number,
  running: boolean,
): string | undefined {
  if (!running || metrics.length === 0) return undefined;
  const label = new Map(nodes.map((n) => [n.id, n.label]));
  const hot = metrics
    .filter((m) => m.cpuUsage > 0.8 || m.errorRate > 0.02)
    .map((m) => `${label.get(m.id) ?? m.id}: ${Math.round(m.cpuUsage * 100)}% CPU, ${(m.errorRate * 100).toFixed(1)}% errors, queue ${Math.round(m.queueDepth)}`);
  return `Peak saturation ${Math.round(peakSaturation * 100)}%. ${hot.length ? `Hotspots — ${hot.join('; ')}.` : 'No component is saturated.'}`;
}

function chipColor(t: string): string | undefined {
  return t in CATEGORY_MAP ? CATEGORY_COLOR[CATEGORY_MAP[t as ComponentType]] : undefined;
}
function CompChip({ t }: { t: string }) {
  const known = t in CATEGORY_MAP;
  return (
    <span className="archsim-chip" style={{ color: chipColor(t) }}>
      {known && <Icon type={t as ComponentType} size={13} />}
      {t.replace(/_/g, ' ')}
    </span>
  );
}

const scoreClass = (s: number) => (s >= 75 ? 'good' : s >= 50 ? 'ok' : 'bad');

export function EvaluateTab({ problem, solution }: { problem: Problem; solution: Solution }) {
  const nodes = useCanvasStore((s) => s.nodes);
  const links = useCanvasStore((s) => s.links);
  const metrics = useCanvasStore((s) => s.metrics);
  const peakSaturation = useCanvasStore((s) => s.peakSaturation);
  const simRunning = useCanvasStore((s) => s.simRunning);

  const apiKey = useAiSettings((s) => s.apiKey);
  const model = useAiSettings((s) => s.model);

  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Evaluation | null>(null);

  const modelLabel = GEMINI_MODELS.find((m) => m.id === model)?.label ?? model;

  const runEvaluation = async () => {
    setLoading(true);
    setError(null);
    try {
      const ctx: EvalContext = {
        problemName: problem.name,
        difficulty: problem.difficulty,
        summary: problem.summary,
        note: problem.note,
        functional: solution.functional,
        nonFunctional: solution.nonFunctional,
        referenceComponents: solution.archsim,
        nodes,
        links,
        simSummary: simSummary(nodes, metrics, peakSaturation, simRunning),
      };
      setResult(await evaluateDesign(ctx, model, apiKey));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evaluation failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="pd-panel">
        <div className="eval-setup">
          <span className="eval-spark" aria-hidden="true">✦</span>
          <h2>AI design review</h2>
          <p>
            Get a scored critique of the exact design on your canvas — requirements coverage, bottlenecks,
            single points of failure, and concrete improvements. It uses your own free <strong>Google Gemini</strong> key.
          </p>
          <button className="primary-btn" onClick={() => setShowSettings(true)}>Add your Gemini API key</button>
        </div>
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </div>
    );
  }

  return (
    <div className="pd-panel">
      <div className="eval-bar">
        <span className="eval-model">Model: <strong>{modelLabel}</strong></span>
        <button className="link-btn" onClick={() => setShowSettings(true)}>Settings</button>
      </div>

      <button className="primary-btn full" onClick={runEvaluation} disabled={loading || nodes.length === 0}>
        {loading ? 'Evaluating your design…' : result ? 'Re-evaluate current design' : 'Evaluate my design with AI'}
      </button>
      {nodes.length === 0 && <p className="muted-note" style={{ marginTop: 8 }}>Add components to the canvas first.</p>}
      {loading && <p className="muted-note" style={{ marginTop: 10 }}>The model is reviewing your components, configs and connections — this can take 10–40s.</p>}
      {error && <div className="eval-error">{error}</div>}

      {result && !loading && (
        <div className="eval-report">
          <div className="eval-head">
            <div className={`eval-score ${scoreClass(result.score)}`} style={{ ['--pct' as string]: `${result.score}` }}>
              <span>{result.score}</span>
            </div>
            <p className="eval-verdict">{result.verdict}</p>
          </div>

          {result.requirements.length > 0 && (
            <div className="eval-block">
              <h3 className="eval-h3">Requirements coverage</h3>
              <ul className="eval-reqs">
                {result.requirements.map((r, i) => (
                  <li key={i} className={`req-${r.status}`}>
                    <span className="req-mark">{r.status === 'met' ? '✓' : r.status === 'partial' ? '◑' : '✕'}</span>
                    <span><strong>{r.name}</strong>{r.note ? ` — ${r.note}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.strengths.length > 0 && (
            <div className="eval-block">
              <h3 className="eval-h3">Strengths</h3>
              <ul className="eval-list good">{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}

          {result.issues.length > 0 && (
            <div className="eval-block">
              <h3 className="eval-h3">Issues</h3>
              <div className="eval-issues">
                {result.issues.map((it, i) => (
                  <div className={`eval-issue sev-${it.severity}`} key={i}>
                    <span className="sev-tag">{it.severity}</span>
                    <div><strong>{it.title}</strong><p>{it.detail}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.improvements.length > 0 && (
            <div className="eval-block">
              <h3 className="eval-h3">Suggested improvements</h3>
              <div className="eval-improvements">
                {result.improvements.map((im, i) => (
                  <div className="eval-improve" key={i}>
                    <strong>↑ {im.title}</strong>
                    <p>{im.detail}</p>
                    {im.components && im.components.length > 0 && (
                      <div className="archsim-chips">{im.components.map((c) => <CompChip key={c} t={c} />)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.missingComponents.length > 0 && (
            <div className="eval-block">
              <h3 className="eval-h3">Missing components</h3>
              <div className="archsim-chips">{result.missingComponents.map((c) => <CompChip key={c} t={c} />)}</div>
            </div>
          )}

          {result.scalability && (
            <div className="eval-block">
              <h3 className="eval-h3">Scalability</h3>
              <p className="eval-scal">{result.scalability}</p>
            </div>
          )}

          <p className="eval-foot">AI-generated review — verify against the reference solution. It can be wrong.</p>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

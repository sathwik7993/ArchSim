import React, { useMemo } from 'react';
import { useCanvasStore } from '../state/canvasStore';
import { CATEGORY_COLOR } from '../types/graph';
import { costBreakdown, formatUsd } from '../sim/cost';
import { computeTrace, autoscales, baseUnits } from '../sim/engine';
import { Icon } from './icons';

// Phase 11 — design "Insights" drawer: what the architecture COSTS (always
// available) and how it PERFORMS against an SLO budget (from the live sim).

// Fixed, teaching-oriented SLO budgets.
const LATENCY_BUDGET_MS = 300; // p99-ish critical-path target
const ERROR_BUDGET = 0.01;     // 1% error budget

const latStatus = (ms: number) => (ms > LATENCY_BUDGET_MS ? 'crit' : ms > LATENCY_BUDGET_MS * 0.6 ? 'warn' : 'ok');
const satStatus = (s: number) => (s >= 0.9 ? 'crit' : s >= 0.6 ? 'warn' : 'ok');
const errStatus = (e: number) => (e > ERROR_BUDGET ? 'crit' : e > ERROR_BUDGET * 0.3 ? 'warn' : 'ok');

export function InsightsPanel() {
  const showInsights = useCanvasStore((s) => s.showInsights);
  const toggleInsights = useCanvasStore((s) => s.toggleInsights);
  const nodes = useCanvasStore((s) => s.nodes);
  const links = useCanvasStore((s) => s.links);
  const metrics = useCanvasStore((s) => s.metrics);
  const frames = useCanvasStore((s) => s.frames);
  const currentFrame = useCanvasStore((s) => s.currentFrame);
  const simRunning = useCanvasStore((s) => s.simRunning);
  const peakSaturation = useCanvasStore((s) => s.peakSaturation);

  const cost = useMemo(() => costBreakdown(nodes), [nodes]);

  // Live performance vs SLO budget (only meaningful while simulating).
  const perf = useMemo(() => {
    if (!simRunning) return null;
    const frame = frames[currentFrame];
    const latency = frame ? computeTrace(nodes, links, frame).total : 0;
    const maxErr = metrics.reduce((m, x) => Math.max(m, x.errorRate), 0);
    const meets = latency <= LATENCY_BUDGET_MS && maxErr <= ERROR_BUDGET && peakSaturation < 0.9;

    // Autoscaling nodes currently scaled above their base instance count.
    const metricById = new Map(metrics.map((m) => [m.id, m]));
    const scaled = nodes
      .filter((n) => autoscales(n))
      .map((n) => ({ node: n, base: baseUnits(n), instances: metricById.get(n.id)?.instances ?? baseUnits(n) }))
      .filter((s) => s.instances > s.base);

    return { latency, maxErr, meets, scaled };
  }, [simRunning, frames, currentFrame, nodes, links, metrics, peakSaturation]);

  if (!showInsights) return null;

  const maxCat = cost.byCategory[0]?.monthly ?? 1;

  return (
    <div className="insights-panel" onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
      <div className="insights-head">
        <h3>Design insights</h3>
        <button className="insights-close" onClick={toggleInsights} title="Close" aria-label="Close insights">✕</button>
      </div>

      <div className="insights-scroll">
        {/* ── Cost ── */}
        <section className="insights-section">
          <div className="insights-cost-head">
            <span className="insights-label">Estimated cost</span>
            <span className="insights-total">{formatUsd(cost.total)}<em>/mo</em></span>
          </div>
          <p className="insights-hint">Rough AWS on-demand estimate driven by each component's config. A teaching guide, not a bill.</p>

          {cost.byCategory.length > 0 ? (
            <div className="insights-cat-bars">
              {cost.byCategory.map((c) => (
                <div className="insights-cat" key={c.category}>
                  <span className="insights-cat-name" style={{ color: CATEGORY_COLOR[c.category] }}>{c.category.replace(/_/g, ' ').toLowerCase()}</span>
                  <div className="insights-cat-track">
                    <div className="insights-cat-fill" style={{ width: `${(c.monthly / maxCat) * 100}%`, background: CATEGORY_COLOR[c.category] }} />
                  </div>
                  <span className="insights-cat-val">{formatUsd(c.monthly)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="insights-empty">Add components to estimate cost.</p>
          )}

          {cost.perNode.length > 0 && (
            <div className="insights-nodes">
              {cost.perNode.map((n) => (
                <div className="insights-node" key={n.id}>
                  <span className="insights-node-icon" style={{ color: CATEGORY_COLOR[n.category] }}><Icon type={n.type} size={14} /></span>
                  <div className="insights-node-main">
                    <span className="insights-node-label">{n.label}</span>
                    <span className="insights-node-note">{n.note}</span>
                  </div>
                  <span className="insights-node-cost">{n.monthly === 0 ? '—' : formatUsd(n.monthly)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Performance / SLO ── */}
        <section className="insights-section">
          <span className="insights-label">Performance budget</span>
          {perf ? (
            <>
              <div className={`insights-verdict ${perf.meets ? 'ok' : 'crit'}`}>
                {perf.meets ? '✓ Meets SLO budget' : '✕ Over SLO budget'}
              </div>
              <div className="insights-slo">
                <div className={`insights-metric ${latStatus(perf.latency)}`}>
                  <span className="insights-metric-val">{Math.round(perf.latency)}<em>ms</em></span>
                  <span className="insights-metric-name">critical-path latency</span>
                  <span className="insights-metric-budget">budget ≤ {LATENCY_BUDGET_MS}ms</span>
                </div>
                <div className={`insights-metric ${errStatus(perf.maxErr)}`}>
                  <span className="insights-metric-val">{(perf.maxErr * 100).toFixed(1)}<em>%</em></span>
                  <span className="insights-metric-name">worst error rate</span>
                  <span className="insights-metric-budget">budget ≤ {ERROR_BUDGET * 100}%</span>
                </div>
                <div className={`insights-metric ${satStatus(peakSaturation)}`}>
                  <span className="insights-metric-val">{Math.round(peakSaturation * 100)}<em>%</em></span>
                  <span className="insights-metric-name">peak saturation</span>
                  <span className="insights-metric-budget">headroom &lt; 90%</span>
                </div>
              </div>

              {perf.scaled.length > 0 && (
                <div className="insights-autoscale">
                  <span className="insights-autoscale-title">⇧ Autoscaling active</span>
                  {perf.scaled.map((s) => (
                    <div className="insights-autoscale-row" key={s.node.id}>
                      <span>{s.node.label}</span>
                      <span className="insights-autoscale-count">{s.base} → {s.instances}×</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="insights-empty">Run the simulation to measure latency, errors and headroom against the SLO budget.</p>
          )}
        </section>
      </div>
    </div>
  );
}

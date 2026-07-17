import React, { useMemo } from 'react';
import { useCanvasStore } from '../state/canvasStore';
import { computeTrace, INCIDENT_LABEL } from '../sim/engine';
import { Icon } from './icons';
import { CATEGORY_COLOR, CATEGORY_MAP, type ComponentType } from '../types/graph';

// A detailed, per-second breakdown of the most recent run: a run summary plus a
// scrubbable second-by-second table and a per-node peak rollup. Turns the 60
// frames the engine already produces into something you can actually read.

const LATENCY_BUDGET_MS = 300;
const ERROR_BUDGET = 0.01;

const satClass = (s: number) => (s >= 0.9 ? 'crit' : s >= 0.6 ? 'warn' : 'ok');
const cpuClass = (c: number) => (c >= 90 ? 'crit' : c >= 60 ? 'warn' : 'ok');
const errClass = (e: number) => (e > ERROR_BUDGET ? 'crit' : e > ERROR_BUDGET * 0.3 ? 'warn' : 'ok');

export function SimulationReport() {
  const showReport = useCanvasStore((s) => s.showReport);
  const toggleReport = useCanvasStore((s) => s.toggleReport);
  const frames = useCanvasStore((s) => s.frames);
  const currentFrame = useCanvasStore((s) => s.currentFrame);
  const setFrame = useCanvasStore((s) => s.setFrame);
  const nodes = useCanvasStore((s) => s.nodes);
  const links = useCanvasStore((s) => s.links);
  const incidents = useCanvasStore((s) => s.incidents);

  const labelById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Per-second rows + whole-run rollups derived once from the frame series.
  const report = useMemo(() => {
    if (frames.length === 0) return null;
    const stepSec = frames.length > 1 ? (frames[1].t - frames[0].t) / 1000 : 1;

    const incidentsAt = (f: number) =>
      incidents.filter((i) => f >= i.startFrame && f < i.startFrame + i.durationFrames);

    const rows = frames.map((fr, i) => {
      const worst = fr.metrics.reduce(
        (acc, m) => (m.cpuUsage > acc.cpu ? { id: m.id, cpu: m.cpuUsage } : acc),
        { id: '', cpu: -1 },
      );
      const maxErr = fr.metrics.reduce((m, x) => Math.max(m, x.errorRate), 0);
      const latency = computeTrace(nodes, links, fr).total;
      return {
        i,
        sec: Math.round(fr.t / 1000),
        totalQps: fr.totalQps,
        peak: fr.peakSaturation,
        latency,
        maxErr,
        worst,
        incidents: incidentsAt(i),
      };
    });

    // Whole-run rollups.
    const peak = Math.max(...rows.map((r) => r.peak));
    const worstLatency = Math.max(...rows.map((r) => r.latency));
    const worstErr = Math.max(...rows.map((r) => r.maxErr));
    const totalRequests = Math.round(rows.reduce((s, r) => s + r.totalQps * stepSec, 0));

    // Per-node peak rollup (peak cpu / error / queue seen across the run).
    const perNode = nodes
      .map((n) => {
        let cpu = 0, err = 0, queue = 0, maxInst = 0;
        for (const fr of frames) {
          const m = fr.metrics.find((x) => x.id === n.id);
          if (!m) continue;
          cpu = Math.max(cpu, m.cpuUsage);
          err = Math.max(err, m.errorRate);
          queue = Math.max(queue, m.queueDepth);
          maxInst = Math.max(maxInst, m.instances ?? 0);
        }
        return { node: n, cpu, err, queue, maxInst };
      })
      .sort((a, b) => b.cpu - a.cpu);

    const meets = worstLatency <= LATENCY_BUDGET_MS && worstErr <= ERROR_BUDGET && peak < 0.9;
    return { rows, peak, worstLatency, worstErr, totalRequests, perNode, meets, stepSec };
  }, [frames, nodes, links, incidents]);

  if (!showReport) return null;

  const label = (id: string) => labelById.get(id)?.label ?? id;

  const exportCsv = () => {
    if (!report) return;
    const header = 'second,total_qps,peak_saturation_pct,critical_path_latency_ms,worst_error_pct,busiest_node,busiest_node_cpu_pct';
    const lines = report.rows.map((r) =>
      [r.sec, Math.round(r.totalQps), Math.round(r.peak * 100), Math.round(r.latency), (r.maxErr * 100).toFixed(2), `"${label(r.worst.id)}"`, Math.round(r.worst.cpu)].join(','),
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'archsim-simulation-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="report-overlay" onMouseDown={toggleReport}>
      <div className="report-modal" onMouseDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}>
        <div className="report-head">
          <h2>Simulation report</h2>
          <div className="report-head-actions">
            <button className="ghost-btn sm" onClick={exportCsv} disabled={!report}>↓ Export CSV</button>
            <button className="report-close" onClick={toggleReport} aria-label="Close report">✕</button>
          </div>
        </div>

        {!report ? (
          <p className="report-empty">Run the simulation to generate a per-second report.</p>
        ) : (
          <div className="report-body">
            {/* Run summary */}
            <div className="report-summary">
              <div className={`report-verdict ${report.meets ? 'ok' : 'crit'}`}>
                {report.meets ? '✓ Met the SLO budget for the whole run' : '✕ Breached the SLO budget during the run'}
              </div>
              <div className="report-stats">
                <Stat label="Duration" value={`${report.rows.length ? report.rows[report.rows.length - 1].sec : 0}s`} />
                <Stat label="Requests handled" value={report.totalRequests.toLocaleString('en-US')} />
                <Stat label="Peak saturation" value={`${Math.round(report.peak * 100)}%`} cls={satClass(report.peak)} />
                <Stat label="Worst latency" value={`${Math.round(report.worstLatency)}ms`} cls={report.worstLatency > LATENCY_BUDGET_MS ? 'crit' : 'ok'} />
                <Stat label="Worst error rate" value={`${(report.worstErr * 100).toFixed(1)}%`} cls={errClass(report.worstErr)} />
              </div>
            </div>

            {/* Per-node peak rollup */}
            <div className="report-section">
              <h3 className="report-h3">Per-component peaks</h3>
              <div className="report-nodes">
                {report.perNode.map(({ node, cpu, err, queue, maxInst }) => (
                  <div className="report-node" key={node.id}>
                    <span className="report-node-icon" style={{ color: CATEGORY_COLOR[CATEGORY_MAP[node.type as ComponentType]] }}><Icon type={node.type} size={14} /></span>
                    <span className="report-node-label">{node.label}</span>
                    <span className={`report-pill ${cpuClass(cpu)}`}>{Math.round(cpu)}% cpu</span>
                    <span className={`report-pill ${errClass(err)}`}>{(err * 100).toFixed(1)}% err</span>
                    <span className="report-pill muted">q {queue}</span>
                    {maxInst > 1 && <span className="report-pill scale">⇧ {maxInst}×</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Per-second table */}
            <div className="report-section">
              <h3 className="report-h3">Second by second <span className="report-hint">click a row to jump the timeline there</span></h3>
              <div className="report-table-wrap">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>t</th><th>total qps</th><th>peak sat</th><th>latency</th><th>worst err</th><th>busiest component</th><th>events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r) => (
                      <tr key={r.i} className={r.i === currentFrame ? 'active' : ''} onClick={() => setFrame(r.i)}>
                        <td className="mono">{r.sec}s</td>
                        <td className="mono">{Math.round(r.totalQps).toLocaleString('en-US')}</td>
                        <td><span className={`report-dot ${satClass(r.peak)}`} />{Math.round(r.peak * 100)}%</td>
                        <td className={r.latency > LATENCY_BUDGET_MS ? 'txt-crit' : ''}>{Math.round(r.latency)}ms</td>
                        <td className={errClass(r.maxErr) === 'crit' ? 'txt-crit' : ''}>{(r.maxErr * 100).toFixed(1)}%</td>
                        <td className="report-worst">{r.worst.id ? <>{label(r.worst.id)} <em>{Math.round(r.worst.cpu)}%</em></> : '—'}</td>
                        <td>{r.incidents.map((inc) => <span key={inc.id} className="report-event">{INCIDENT_LABEL[inc.type]}</span>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="report-stat">
      <span className={`report-stat-val ${cls ? `txt-${cls}` : ''}`}>{value}</span>
      <span className="report-stat-label">{label}</span>
    </div>
  );
}

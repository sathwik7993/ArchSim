import { describe, expect, it } from 'vitest';
import { runSimulation, runSimulationSeries, computeTrace, type Incident } from './engine';
import type { CanvasLink, CanvasNode } from '../types/graph';

const client = (id: string, qps: number): CanvasNode => ({
  id,
  type: 'CLIENT',
  label: id,
  position: { x: 0, y: 0 },
  properties: { qps, protocol: 'HTTPS', timeout_ms: 5000 },
});

const server = (id: string, cores: number): CanvasNode => ({
  id,
  type: 'SERVER',
  label: id,
  position: { x: 0, y: 0 },
  properties: { cpu_cores: cores, memory_gb: 16, os: 'Linux', auto_scaling: false },
});

const link = (id: string, source: string, target: string): CanvasLink => ({
  id,
  source,
  target,
  properties: { latencyMs: 1, bandwidthGbps: 10 },
});

describe('runSimulation', () => {
  it('produces one metric per node', () => {
    const nodes = [client('c', 100), server('s', 4)];
    const links = [link('l1', 'c', 's')];
    const { metrics } = runSimulation(nodes, links, 'STEADY');
    expect(metrics).toHaveLength(2);
    expect(metrics.map((m) => m.id).sort()).toEqual(['c', 's']);
  });

  it('is deterministic for the same graph', () => {
    const nodes = [client('c', 500), server('s', 2)];
    const links = [link('l1', 'c', 's')];
    const a = runSimulation(nodes, links, 'BURST');
    const b = runSimulation(nodes, links, 'BURST');
    expect(a).toEqual(b);
  });

  it('overloads an undersized server and reports errors', () => {
    // 1 CLIENT at 5000 qps into a tiny 1-core server (cap 250 qps) -> saturated.
    const nodes = [client('c', 5000), server('s', 1)];
    const links = [link('l1', 'c', 's')];
    const { metrics } = runSimulation(nodes, links, 'STEADY');
    const serverMetric = metrics.find((m) => m.id === 's')!;
    expect(serverMetric.cpuUsage).toBeGreaterThanOrEqual(99);
    expect(serverMetric.errorRate).toBeGreaterThan(0);
    expect(serverMetric.queueDepth).toBeGreaterThan(0);
  });

  it('splits load across replicas so scaling relieves pressure', () => {
    const oneServer = runSimulation(
      [client('c', 800), server('s1', 2)],
      [link('l1', 'c', 's1')],
      'STEADY',
    );
    const twoServers = runSimulation(
      [client('c', 800), server('s1', 2), server('s2', 2)],
      [link('l1', 'c', 's1'), link('l2', 'c', 's2')],
      'STEADY',
    );
    const cpuOne = oneServer.metrics.find((m) => m.id === 's1')!.cpuUsage;
    const cpuScaled = twoServers.metrics.find((m) => m.id === 's1')!.cpuUsage;
    expect(cpuScaled).toBeLessThan(cpuOne);
  });

  it('assigns link flow to fed links only', () => {
    const nodes = [client('c', 300), server('s', 4)];
    const links = [link('l1', 'c', 's')];
    const { linkFlows } = runSimulation(nodes, links, 'STEADY');
    expect(linkFlows['l1'].qps).toBeGreaterThan(0);
  });
});

describe('runSimulationSeries', () => {
  const nodes = [client('c', 300), server('s', 4)];
  const links = [link('l1', 'c', 's')];

  it('returns the requested number of frames deterministically', () => {
    const a = runSimulationSeries(nodes, links, 'BURST', [], { frames: 30 });
    const b = runSimulationSeries(nodes, links, 'BURST', [], { frames: 30 });
    expect(a).toHaveLength(30);
    expect(a).toEqual(b);
    expect(a[0].t).toBe(0);
    expect(a[1].t).toBe(1000);
  });

  it('scales generated load by the traffic multiplier', () => {
    const base = runSimulationSeries(nodes, links, 'STEADY', [], { frames: 4, trafficMultiplier: 1 });
    const doubled = runSimulationSeries(nodes, links, 'STEADY', [], { frames: 4, trafficMultiplier: 2 });
    const q1 = base[0].metrics.find((m) => m.id === 'c')!.qps;
    const q2 = doubled[0].metrics.find((m) => m.id === 'c')!.qps;
    expect(q2).toBeCloseTo(q1 * 2, 5);
  });

  it('applies a NODE_KILL incident only within its active window', () => {
    const incidents: Incident[] = [{ id: 'i1', type: 'NODE_KILL', targetId: 's', startFrame: 5, durationFrames: 5 }];
    const frames = runSimulationSeries(nodes, links, 'STEADY', incidents, { frames: 20 });
    const before = frames[2].metrics.find((m) => m.id === 's')!;
    const during = frames[6].metrics.find((m) => m.id === 's')!;
    const after = frames[15].metrics.find((m) => m.id === 's')!;
    expect(during.errorRate).toBe(1);       // fully down
    expect(during.qps).toBe(0);
    expect(before.errorRate).toBeLessThan(1);
    expect(after.errorRate).toBeLessThan(1); // recovered
  });
});

describe('cache offload', () => {
  const node = (id: string, type: any, properties: any): CanvasNode => ({ id, type, label: id, position: { x: 0, y: 0 }, properties });

  it('a cache in front of a database offloads most of its read load', () => {
    const withoutCache = runSimulation(
      [client('c', 1000), server('s', 8), node('db', 'POSTGRESQL', { max_connections: 100 })],
      [link('l1', 'c', 's'), link('l2', 's', 'db')],
      'STEADY',
    );
    const withCache = runSimulation(
      [client('c', 1000), server('s', 8), node('r', 'REDIS', { maxmemory_mb: 512, eviction_policy: 'allkeys-lru' }), node('db', 'POSTGRESQL', { max_connections: 100 })],
      [link('l1', 'c', 's'), link('l2', 's', 'r'), link('l3', 'r', 'db')],
      'STEADY',
    );
    const dbNoCache = withoutCache.metrics.find((m) => m.id === 'db')!.qps;
    const dbCached = withCache.metrics.find((m) => m.id === 'db')!.qps;
    expect(dbCached).toBeLessThan(dbNoCache * 0.3); // cache absorbs the bulk of reads
  });
});

describe('autoscaling', () => {
  const autoServer = (id: string, cores: number, maxInstances: number): CanvasNode => ({
    id, type: 'SERVER', label: id, position: { x: 0, y: 0 },
    properties: { cpu_cores: cores, memory_gb: 16, auto_scaling: true, max_instances: maxInstances },
  });
  const metricOf = (frame: ReturnType<typeof runSimulationSeries>[number], id: string) =>
    frame.metrics.find((m) => m.id === id)!;

  it('scales up gradually under sustained overload and reports instance count', () => {
    const nodes = [client('c', 1000), autoServer('s', 1, 6)]; // cap 250/instance, load ≫ cap
    const links = [link('l1', 'c', 's')];
    const frames = runSimulationSeries(nodes, links, 'STEADY', [], { frames: 15 });

    // Frame 0 has no prior load observed, so it is still at base (1 instance).
    expect(metricOf(frames[0], 's').instances).toBe(1);
    // It ramps up (never more than +1/frame) and saturates at the configured max.
    expect(metricOf(frames[2], 's').instances).toBe(3);
    expect(metricOf(frames[frames.length - 1], 's').instances).toBe(6);
  });

  it('relieves saturation compared with a fixed-size node', () => {
    const links = [link('l1', 'c', 's')];
    const auto = runSimulationSeries([client('c', 1000), autoServer('s', 1, 6)], links, 'STEADY', [], { frames: 15 });
    const fixed = runSimulationSeries([client('c', 1000), server('s', 1)], links, 'STEADY', [], { frames: 15 });
    const last = (fr: ReturnType<typeof runSimulationSeries>) => fr[fr.length - 1].metrics.find((m) => m.id === 's')!;
    expect(last(auto).cpuUsage).toBeLessThan(last(fixed).cpuUsage);
    expect(last(fixed).cpuUsage).toBeGreaterThan(95); // fixed node stays pinned
  });

  it('leaves opted-out nodes with no instance count', () => {
    const nodes = [client('c', 1000), server('s', 1)];
    const frames = runSimulationSeries(nodes, [link('l1', 'c', 's')], 'STEADY', [], { frames: 5 });
    expect(frames[4].metrics.find((m) => m.id === 's')!.instances).toBeUndefined();
  });
});

describe('computeTrace', () => {
  it('traces from the client through the busiest path with growing offsets', () => {
    const nodes = [client('c', 300), server('s', 4)];
    const links = [link('l1', 'c', 's')];
    const frames = runSimulationSeries(nodes, links, 'STEADY', [], { frames: 5 });
    const trace = computeTrace(nodes, links, frames[0]);
    expect(trace.spans[0].id).toBe('c');
    expect(trace.spans.length).toBeGreaterThanOrEqual(2);
    expect(trace.spans[1].start).toBeGreaterThan(0);
    expect(trace.total).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { estimateNodeCost, costBreakdown, formatUsd } from './cost';
import { DEFAULT_PROPERTIES, type CanvasNode, type ComponentType } from '../types/graph';

function node(type: ComponentType, props: Record<string, string | number | boolean> = {}): CanvasNode {
  return {
    id: `n-${type}`,
    type,
    label: type,
    position: { x: 0, y: 0 },
    properties: { ...DEFAULT_PROPERTIES[type], ...props },
  };
}

const ALL_TYPES = Object.keys(DEFAULT_PROPERTIES) as ComponentType[];

describe('cost model', () => {
  it('gives every component type a finite non-negative cost', () => {
    for (const t of ALL_TYPES) {
      const { monthly, note } = estimateNodeCost(node(t));
      expect(Number.isFinite(monthly), `${t} monthly is finite`).toBe(true);
      expect(monthly, `${t} monthly >= 0`).toBeGreaterThanOrEqual(0);
      expect(typeof note).toBe('string');
    }
  });

  it('does not bill the client (traffic source) or IAM', () => {
    expect(estimateNodeCost(node('CLIENT')).monthly).toBe(0);
    expect(estimateNodeCost(node('IAM')).monthly).toBe(0);
  });

  it('scales compute cost with cores and memory', () => {
    const small = estimateNodeCost(node('SERVER', { cpu_cores: 2, memory_gb: 4 })).monthly;
    const big = estimateNodeCost(node('SERVER', { cpu_cores: 16, memory_gb: 64 })).monthly;
    expect(big).toBeGreaterThan(small);
  });

  it('charges more for a Postgres read replica', () => {
    const single = estimateNodeCost(node('POSTGRESQL', { replication: false })).monthly;
    const replicated = estimateNodeCost(node('POSTGRESQL', { replication: true })).monthly;
    expect(replicated).toBeGreaterThan(single);
  });

  it('scales Mongo cost with replica-set members and Kafka with brokers', () => {
    expect(estimateNodeCost(node('MONGODB', { replica_set_members: 5 })).monthly)
      .toBeGreaterThan(estimateNodeCost(node('MONGODB', { replica_set_members: 3 })).monthly);
    expect(estimateNodeCost(node('KAFKA', { brokers: 6 })).monthly)
      .toBeGreaterThan(estimateNodeCost(node('KAFKA', { brokers: 3 })).monthly);
  });

  it('rolls up totals and categories, sorted by cost', () => {
    const b = costBreakdown([node('CLIENT'), node('SERVER'), node('POSTGRESQL'), node('REDIS')]);
    expect(b.total).toBe(b.perNode.reduce((s, n) => s + n.monthly, 0));
    // Category rollups never include zero-cost buckets and are sorted desc.
    for (const c of b.byCategory) expect(c.monthly).toBeGreaterThan(0);
    for (let i = 1; i < b.byCategory.length; i++) {
      expect(b.byCategory[i - 1].monthly).toBeGreaterThanOrEqual(b.byCategory[i].monthly);
    }
    // perNode sorted desc by cost.
    for (let i = 1; i < b.perNode.length; i++) {
      expect(b.perNode[i - 1].monthly).toBeGreaterThanOrEqual(b.perNode[i].monthly);
    }
  });

  it('empty design costs nothing', () => {
    const b = costBreakdown([]);
    expect(b.total).toBe(0);
    expect(b.byCategory).toHaveLength(0);
  });

  it('formats USD compactly', () => {
    expect(formatUsd(0)).toBe('$0');
    expect(formatUsd(340)).toBe('$340');
    expect(formatUsd(1500)).toBe('$1.50k');
    expect(formatUsd(12000)).toBe('$12.0k');
  });
});

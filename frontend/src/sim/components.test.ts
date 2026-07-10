import { describe, expect, it } from 'vitest';
import { componentStats, cacheHitRate, forwardFraction } from './components';
import type { CanvasNode, ComponentMetric, ComponentType } from '../types/graph';

const node = (type: ComponentType, properties: Record<string, any> = {}): CanvasNode => ({
  id: 'n', type, label: type, position: { x: 0, y: 0 }, properties,
});
const metric = (over: Partial<ComponentMetric> = {}): ComponentMetric => ({
  id: 'n', cpuUsage: 50, ramUsageMb: 200, qps: 500, queueDepth: 0, errorRate: 0, ...over,
});

describe('componentStats', () => {
  it('gives every component type at least one distinctive stat', () => {
    const types: ComponentType[] = [
      'CLIENT', 'SERVER', 'CONTAINER', 'LAMBDA', 'VM',
      'API_GATEWAY', 'LOAD_BALANCER', 'CDN', 'DNS', 'FIREWALL',
      'S3_BUCKET', 'EBS_VOLUME', 'BLOCK_STORAGE',
      'POSTGRESQL', 'MYSQL', 'MONGODB', 'DYNAMODB', 'CASSANDRA',
      'REDIS', 'MEMCACHED',
      'KAFKA', 'RABBITMQ', 'SQS', 'SNS',
      'PROMETHEUS', 'GRAFANA', 'CLOUDWATCH',
      'WAF', 'IAM', 'SECRETS_MANAGER',
      'K8S_CLUSTER', 'K8S_DEPLOYMENT', 'K8S_SERVICE', 'K8S_INGRESS',
    ];
    for (const t of types) {
      const stats = componentStats(node(t), metric());
      expect(stats.length, `${t} should have mechanics`).toBeGreaterThan(0);
      for (const s of stats) expect(typeof s.value).toBe('string');
    }
  });

  it('surfaces cache hit ratio for Redis and consumer lag for Kafka', () => {
    const redis = componentStats(node('REDIS', { maxmemory_mb: 256 }), metric());
    expect(redis.some((s) => /hit ratio/i.test(s.label))).toBe(true);
    const kafka = componentStats(node('KAFKA', { partitions: 12 }), metric({ cpuUsage: 90 }));
    const lag = kafka.find((s) => /consumer lag/i.test(s.label))!;
    expect(lag.status === 'warn' || lag.status === 'crit').toBe(true);
  });

  it('reports DB replication lag only when replication is enabled', () => {
    const withRepl = componentStats(node('POSTGRESQL', { max_connections: 100, replication: true }), metric({ cpuUsage: 90 }));
    const without = componentStats(node('POSTGRESQL', { max_connections: 100, replication: false }), metric());
    expect(withRepl.find((s) => /replication lag/i.test(s.label))!.value).toMatch(/ms/);
    expect(without.find((s) => /replication lag/i.test(s.label))!.value).toMatch(/no replica/);
  });
});

describe('cache mechanics', () => {
  it('hit rate degrades under saturation', () => {
    const redis = node('REDIS');
    expect(cacheHitRate(redis, 0)).toBeGreaterThan(cacheHitRate(redis, 1));
  });

  it('caches forward only misses, other components forward everything', () => {
    expect(forwardFraction(node('REDIS'), 0)).toBeLessThan(0.2);
    expect(forwardFraction(node('SERVER'), 0.5)).toBe(1);
  });
});

import type { CanvasNode, ComponentMetric, ComponentType } from '../types/graph';

/**
 * Component-specific "mechanics" (Milestone 3). Every component surfaces
 * distinctive, load-driven telemetry beyond the generic cpu/ram/qps/queue/error
 * — cache hit ratios and evictions, DB connection pools / replication lag /
 * lock waits, queue consumer lag, storage IOPS, and so on. Caches also offload
 * downstream load: only their misses are forwarded to the origin.
 */

export interface ComponentStat {
  label: string;
  value: string;
  /** Optional 0..100 bar fill. */
  pct?: number;
  status?: 'ok' | 'warn' | 'crit';
}

const prop = (node: CanvasNode, key: string, fallback: number): number => {
  const v = node.properties[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
};
const propS = (node: CanvasNode, key: string, fallback: string): string => {
  const v = node.properties[key];
  return typeof v === 'string' ? v : fallback;
};

// Force US grouping so large numbers read as 122,000 (not locale-specific 1,22,000).
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');
const n1 = (v: number) => v.toFixed(1);
const stByPct = (p: number): ComponentStat['status'] => (p >= 90 ? 'crit' : p >= 70 ? 'warn' : 'ok');

/**
 * Steady-state cache hit ratio (0..1). Falls as the node saturates because
 * evictions climb; `noeviction` policy degrades faster once full.
 */
export function cacheHitRate(node: CanvasNode, saturation: number): number {
  let base: number;
  switch (node.type) {
    case 'REDIS': base = 0.92; break;
    case 'MEMCACHED': base = 0.86; break;
    case 'CDN': base = 0.82; break;
    case 'DNS': base = 0.7; break;
    default: return 0;
  }
  const policy = propS(node, 'eviction_policy', 'allkeys-lru');
  const penalty = policy === 'noeviction' ? 0.6 : 0.4;
  return Math.max(0.15, base * (1 - Math.min(saturation, 1) * penalty));
}

/**
 * Fraction of processed load a node forwards downstream. Caches/CDNs forward
 * only their misses, so putting one in front of a database offloads it.
 */
export function forwardFraction(node: CanvasNode, saturation: number): number {
  switch (node.type) {
    case 'REDIS':
    case 'MEMCACHED':
    case 'CDN':
      return 1 - cacheHitRate(node, saturation);
    default:
      return 1;
  }
}

interface Ctx {
  load: number;        // requests/sec through the node
  sat: number;         // 0..1 saturation
  err: number;         // 0..1 error rate
  ram: number;         // MB
}

/** System-wide context so out-of-band components reflect the whole deployment. */
export interface SysContext {
  totalQps: number;    // total client-generated request rate
  nodeCount: number;   // number of components on the canvas
}

/** Per-component derived mechanics for the inspector. */
export function componentStats(node: CanvasNode, metric?: ComponentMetric, sys?: SysContext): ComponentStat[] {
  const c: Ctx = {
    load: metric?.qps ?? 0,
    sat: Math.min((metric?.cpuUsage ?? 0) / 100, 1),
    err: metric?.errorRate ?? 0,
    ram: metric?.ramUsageMb ?? 0,
  };
  const t: ComponentType = node.type;
  const hit = cacheHitRate(node, c.sat) * 100;

  switch (t) {
    // ── Compute ──
    case 'CLIENT':
      return [
        { label: 'Requests', value: `${n0(c.load)} /s` },
        { label: 'In-flight', value: n0(c.load * 0.05) },
        { label: 'Avg round-trip', value: `${n1(20 + c.sat * 60)} ms` },
      ];
    case 'SERVER': {
      const threads = Math.min(prop(node, 'cpu_cores', 4) * 50, c.load * 0.4 + 8);
      const maxThreads = prop(node, 'cpu_cores', 4) * 50;
      const heapMax = prop(node, 'memory_gb', 16) * 1024;
      return [
        { label: 'Worker threads', value: `${n0(threads)} / ${n0(maxThreads)}`, pct: (threads / maxThreads) * 100, status: stByPct((threads / maxThreads) * 100) },
        { label: 'Heap used', value: `${n0(c.ram)} / ${n0(heapMax)} MB`, pct: (c.ram / heapMax) * 100, status: stByPct((c.ram / heapMax) * 100) },
        { label: 'GC pause', value: `${n1(4 + c.sat * c.sat * 180)} ms`, status: c.sat > 0.85 ? 'warn' : 'ok' },
        { label: 'Context switches', value: `${n0(c.load * (1 + c.sat * 4))} /s` },
      ];
    }
    case 'CONTAINER':
      return [
        { label: 'Replicas', value: n0(prop(node, 'replicas', 1)) },
        { label: 'CPU throttling', value: `${n0(Math.max(0, c.sat - 0.7) * 300)}%`, status: c.sat > 0.85 ? 'crit' : 'ok' },
        { label: 'Memory', value: `${n0(c.ram)} / ${n0(prop(node, 'memory_limit', 512))} MB`, pct: (c.ram / prop(node, 'memory_limit', 512)) * 100 },
        { label: 'OOM restarts', value: n0(c.sat > 0.95 ? 1 : 0), status: c.sat > 0.95 ? 'crit' : 'ok' },
      ];
    case 'LAMBDA': {
      const concurrent = Math.min(prop(node, 'concurrency_limit', 100), c.load * 0.12);
      const limit = prop(node, 'concurrency_limit', 100);
      return [
        { label: 'Concurrent execs', value: `${n0(concurrent)} / ${n0(limit)}`, pct: (concurrent / limit) * 100, status: stByPct((concurrent / limit) * 100) },
        { label: 'Cold starts', value: `${n0(Math.max(2, 30 - c.load * 0.05))}%`, status: c.load < 50 ? 'warn' : 'ok' },
        { label: 'Init duration', value: `${n0(prop(node, 'memory_mb', 256) < 512 ? 800 : 300)} ms` },
        { label: 'Throttles', value: `${n0(Math.max(0, c.load * 0.12 - limit) * 8)} /s`, status: c.err > 0 ? 'crit' : 'ok' },
      ];
    }
    case 'VM':
      return [
        { label: 'Conn. backlog', value: n0(c.load * c.sat * 0.5) },
        { label: 'CPU steal', value: `${n1(c.sat * 6)}%` },
        { label: 'vMem used', value: `${n0(c.ram)} / ${n0(prop(node, 'memory_gb', 4) * 1024)} MB`, pct: (c.ram / (prop(node, 'memory_gb', 4) * 1024)) * 100 },
      ];

    // ── Networking ──
    case 'API_GATEWAY': {
      const limit = prop(node, 'rate_limit_rps', 1000);
      const usage = (c.load / limit) * 100;
      return [
        { label: 'Rate-limit usage', value: `${n0(usage)}%`, pct: usage, status: stByPct(usage) },
        { label: 'Throttled (429)', value: `${n0(Math.max(0, c.load - limit))} /s`, status: c.load > limit ? 'crit' : 'ok' },
        { label: `Auth (${propS(node, 'auth_type', 'JWT')})`, value: `${n0(c.load)} /s` },
      ];
    }
    case 'LOAD_BALANCER': {
      const maxc = prop(node, 'max_connections', 10000);
      const conns = Math.min(maxc, c.load * 1.5);
      return [
        { label: 'Active connections', value: `${n0(conns)} / ${n0(maxc)}`, pct: (conns / maxc) * 100, status: stByPct((conns / maxc) * 100) },
        { label: 'Algorithm', value: propS(node, 'algorithm', 'round_robin') },
        { label: 'Dropped conns', value: `${n0(c.err * c.load)} /s`, status: c.err > 0 ? 'warn' : 'ok' },
      ];
    }
    case 'CDN':
      return [
        { label: 'Cache hit ratio', value: `${n0(hit)}%`, pct: hit, status: hit < 60 ? 'warn' : 'ok' },
        { label: 'Origin fetches', value: `${n0(c.load * (1 - hit / 100))} /s` },
        { label: 'Edge offload', value: `${n0(hit)}%` },
        { label: 'Edge locations', value: n0(prop(node, 'edge_locations', 50)) },
      ];
    case 'DNS':
      return [
        { label: 'Queries', value: `${n0(c.load)} /s` },
        { label: 'Resolve latency', value: `${n1(15 + c.sat * 85)} ms` },
        { label: 'Cache hit ratio', value: `${n0(hit)}%`, pct: hit },
        { label: 'TTL', value: `${n0(prop(node, 'ttl', 300))} s` },
      ];
    case 'FIREWALL':
      return [
        { label: 'Packets inspected', value: `${n0(c.load)} /s` },
        { label: 'Blocked', value: `${n0(c.load * 0.03)} /s` },
        { label: 'Rules evaluated', value: n0(prop(node, 'max_rules', 100)) },
        { label: 'Added latency', value: `${n1(0.5 + c.sat * 4)} ms` },
      ];

    // ── Storage ──
    case 'S3_BUCKET':
      return [
        { label: 'Request rate', value: `${n0(c.load)} /s` },
        { label: 'Throughput', value: `${n1(c.load * 0.25)} MB/s` },
        { label: 'Slowdowns (503)', value: `${n0(c.err * c.load)} /s`, status: c.err > 0 ? 'warn' : 'ok' },
        { label: 'Storage class', value: propS(node, 'storage_class', 'STANDARD') },
      ];
    case 'EBS_VOLUME': {
      const iops = prop(node, 'iops', 3000);
      const used = (c.load / iops) * 100;
      return [
        { label: 'IOPS', value: `${n0(c.load)} / ${n0(iops)}`, pct: used, status: stByPct(used) },
        { label: 'Queue depth', value: n0(Math.max(0, c.load - iops) / 20) },
        { label: 'Latency', value: `${n1(1 + c.sat * c.sat * 40)} ms`, status: c.sat > 0.85 ? 'warn' : 'ok' },
      ];
    }
    case 'BLOCK_STORAGE': {
      const iops = prop(node, 'iops', 1000);
      const used = (c.load / iops) * 100;
      return [
        { label: 'IOPS', value: `${n0(c.load)} / ${n0(iops)}`, pct: used, status: stByPct(used) },
        { label: 'Throughput', value: `${n1(c.load * 0.06)} MB/s` },
      ];
    }

    // ── Database ──
    case 'POSTGRESQL':
    case 'MYSQL': {
      const maxc = prop(node, 'max_connections', 100);
      const conns = Math.min(maxc, 4 + c.load / 22);
      const replication = node.properties.replication === true;
      return [
        { label: 'Connections', value: `${n0(conns)} / ${n0(maxc)}`, pct: (conns / maxc) * 100, status: stByPct((conns / maxc) * 100) },
        { label: 'Transactions', value: `${n0(c.load)} TPS` },
        { label: 'Buffer/index hit', value: `${n1(Math.max(80, 99 - c.sat * 25))}%`, status: c.sat > 0.8 ? 'warn' : 'ok' },
        { label: 'Lock waits', value: `${n0(c.sat * c.sat * c.load * 0.15)} /s`, status: c.sat > 0.85 ? 'crit' : 'ok' },
        { label: 'WAL write', value: `${n1(c.load * 0.02)} MB/s` },
        { label: 'Replication lag', value: replication ? `${n1(20 + c.sat * 900)} ms` : 'no replica', status: replication && c.sat > 0.8 ? 'warn' : 'ok' },
      ];
    }
    case 'MONGODB': {
      const members = prop(node, 'replica_set_members', 3);
      return [
        { label: 'Replica members', value: `${n0(members)} (1 primary)` },
        { label: 'Ops', value: `${n0(c.load)} /s` },
        { label: 'Replication lag', value: `${n1(10 + c.sat * 600)} ms`, status: c.sat > 0.8 ? 'warn' : 'ok' },
        { label: 'Docs scanned/returned', value: `${n1(1 + c.sat * 40)}×`, status: c.sat > 0.85 ? 'warn' : 'ok' },
        { label: 'Oplog window', value: `${n0(Math.max(1, 24 - c.sat * 20))} h` },
      ];
    }
    case 'DYNAMODB': {
      const rcu = prop(node, 'read_capacity', 5);
      const wcu = prop(node, 'write_capacity', 5);
      const cap = (rcu + wcu) * 30;
      const used = (c.load / cap) * 100;
      const onDemand = propS(node, 'billing_mode', 'PROVISIONED') === 'ON_DEMAND';
      return [
        { label: 'Capacity used', value: onDemand ? 'on-demand' : `${n0(used)}%`, pct: onDemand ? undefined : used, status: onDemand ? 'ok' : stByPct(used) },
        { label: 'Consumed RCU', value: n0(c.load * 0.6) },
        { label: 'Consumed WCU', value: n0(c.load * 0.4) },
        { label: 'Throttled', value: `${n0(onDemand ? 0 : Math.max(0, c.load - cap))} /s`, status: !onDemand && c.load > cap ? 'crit' : 'ok' },
      ];
    }
    case 'CASSANDRA': {
      const nodes = prop(node, 'num_nodes', 3);
      return [
        { label: 'Cluster nodes', value: n0(nodes) },
        { label: 'Consistency', value: propS(node, 'consistency_level', 'QUORUM') },
        { label: 'Coordinator latency', value: `${n1(3 + c.sat * 60)} ms` },
        { label: 'Hinted handoffs', value: `${n0(c.sat > 0.8 ? c.load * 0.05 : 0)} /s`, status: c.sat > 0.8 ? 'warn' : 'ok' },
        { label: 'Tombstones', value: `${n0(c.load * 0.01)} /read` },
      ];
    }

    // ── Cache ──
    case 'REDIS':
    case 'MEMCACHED': {
      const mem = t === 'REDIS' ? prop(node, 'maxmemory_mb', 256) : prop(node, 'memory_mb', 256);
      const memPct = (c.ram / mem) * 100;
      return [
        { label: 'Hit ratio', value: `${n0(hit)}%`, pct: hit, status: hit < 70 ? 'warn' : 'ok' },
        { label: 'Miss → origin', value: `${n0(c.load * (1 - hit / 100))} /s` },
        { label: 'Evictions', value: `${n0(c.sat > 0.6 ? c.load * (c.sat - 0.5) * 0.4 : 0)} /s`, status: c.sat > 0.75 ? 'warn' : 'ok' },
        { label: 'Memory used', value: `${n0(c.ram)} / ${n0(mem)} MB`, pct: memPct, status: stByPct(memPct) },
        { label: 'Ops', value: `${n0(c.load)} /s` },
      ];
    }

    // ── Messaging ──
    case 'KAFKA': {
      const partitions = prop(node, 'partitions', 12);
      const lag = c.sat > 0.6 ? c.load * (c.sat - 0.5) * 30 : 0;
      return [
        { label: 'Partitions', value: n0(partitions) },
        { label: 'Consumer lag', value: `${n0(lag)} msgs`, status: c.sat > 0.8 ? 'crit' : c.sat > 0.6 ? 'warn' : 'ok' },
        { label: 'Throughput', value: `${n1(c.load * 0.08)} MB/s` },
        { label: 'In-sync replicas', value: `${n0(prop(node, 'replication_factor', 3))}/${n0(prop(node, 'replication_factor', 3))}` },
        { label: 'Retention', value: `${n0(prop(node, 'retention_hours', 168))} h` },
      ];
    }
    case 'RABBITMQ':
      return [
        { label: 'Ready messages', value: n0(c.sat > 0.5 ? c.load * (c.sat - 0.4) * 5 : 0), status: c.sat > 0.8 ? 'crit' : 'ok' },
        { label: 'Unacked', value: n0(c.load * 0.1) },
        { label: 'Publish rate', value: `${n0(c.load)} /s` },
        { label: 'Deliver rate', value: `${n0(c.load * (1 - c.err))} /s` },
        { label: 'Prefetch', value: n0(prop(node, 'prefetch_count', 10)) },
      ];
    case 'SQS':
      return [
        { label: 'In flight', value: n0(c.load * 0.3) },
        { label: 'Approx. backlog', value: n0(c.sat > 0.5 ? c.load * (c.sat - 0.4) * 6 : 0), status: c.sat > 0.8 ? 'warn' : 'ok' },
        { label: 'Oldest message', value: `${n1(c.sat * 45)} s` },
        { label: 'Type', value: propS(node, 'queue_type', 'standard') },
      ];
    case 'SNS':
      return [
        { label: 'Publishes', value: `${n0(c.load)} /s` },
        { label: 'Fanout deliveries', value: `${n0(c.load * 2.5)} /s` },
        { label: 'Filtered out', value: node.properties.message_filtering === true ? `${n0(c.load * 0.2)} /s` : 'no filtering' },
      ];

    // ── Monitoring (out-of-band: scale with the system, not their own inflow) ──
    case 'PROMETHEUS': {
      const targets = sys?.nodeCount ?? Math.max(1, Math.round(c.load / 50));
      const series = targets * 850; // ~850 active series per scraped target
      const scrape = prop(node, 'scrape_interval', 15);
      return [
        { label: 'Scrape targets', value: n0(targets) },
        { label: 'Active series', value: n0(series) },
        { label: 'Samples ingested', value: `${n0(series / scrape)} /s` },
        { label: 'Retention', value: `${n0(prop(node, 'retention_days', 15))} d` },
      ];
    }
    case 'GRAFANA': {
      const ds = prop(node, 'data_sources', 1);
      return [
        { label: 'Data sources', value: n0(ds) },
        { label: 'Dashboards', value: n0(prop(node, 'dashboards', 0)) },
        { label: 'Panel queries', value: `${n0(ds * 6)} /s` },
        { label: 'Query latency', value: `${n1(20 + (sys ? Math.min(sys.nodeCount, 20) * 4 : 0))} ms` },
      ];
    }
    case 'CLOUDWATCH': {
      const sysQps = sys?.totalQps ?? c.load;
      const nodeCount = sys?.nodeCount ?? 1;
      return [
        { label: 'Log ingest', value: `${n1(sysQps * 0.04)} MB/s` },
        { label: 'Custom metrics', value: `${n0(nodeCount * 12)} /min` },
        { label: 'Alarms', value: n0(Math.round(nodeCount / 3)) },
        { label: 'Retention', value: `${n0(prop(node, 'log_retention_days', 30))} d` },
      ];
    }

    // ── Security ──
    case 'WAF': {
      const limit = prop(node, 'rate_limit', 2000);
      return [
        { label: 'Requests inspected', value: `${n0(c.load)} /s` },
        { label: 'Blocked', value: `${n0(c.load * 0.04 + Math.max(0, c.load - limit))} /s`, status: c.load > limit ? 'warn' : 'ok' },
        { label: 'Added latency', value: `${n1(1 + c.sat * 6)} ms` },
      ];
    }
    case 'IAM':
      return [
        { label: 'Auth checks', value: `${n0(c.load)} /s` },
        { label: 'Policy evaluations', value: `${n0(c.load * 1.4)} /s` },
        { label: 'Denies', value: `${n0(c.load * 0.02)} /s` },
        { label: 'MFA', value: node.properties.mfa_enabled === true ? 'enabled' : 'disabled', status: node.properties.mfa_enabled === true ? 'ok' : 'warn' },
      ];
    case 'SECRETS_MANAGER':
      return [
        { label: 'Secret fetches', value: `${n0(c.load)} /s` },
        { label: 'Cache hit', value: `${n0(Math.max(60, 95 - c.sat * 20))}%` },
        { label: 'Rotation', value: node.properties.rotation_enabled === true ? `every ${n0(prop(node, 'rotation_days', 30))} d` : 'disabled' },
      ];

    // ── Kubernetes ──
    case 'K8S_CLUSTER': {
      const nodes = prop(node, 'node_count', 3);
      const podCap = nodes * 30;
      const pods = Math.min(podCap, 6 + c.load / 100);
      return [
        { label: 'Nodes ready', value: `${n0(nodes)}/${n0(nodes)}` },
        { label: 'Pods running', value: `${n0(pods)} / ${n0(podCap)}`, pct: (pods / podCap) * 100, status: stByPct((pods / podCap) * 100) },
        { label: 'Scheduler queue', value: n0(c.sat > 0.85 ? c.load * 0.02 : 0), status: c.sat > 0.9 ? 'warn' : 'ok' },
        { label: 'CNI', value: propS(node, 'cni_plugin', 'calico') },
      ];
    }
    case 'K8S_DEPLOYMENT': {
      const desired = prop(node, 'replicas', 3);
      const ready = c.sat > 0.95 ? Math.max(1, desired - 1) : desired;
      return [
        { label: 'Replicas ready', value: `${n0(ready)} / ${n0(desired)}`, pct: (ready / desired) * 100, status: ready < desired ? 'warn' : 'ok' },
        { label: 'Strategy', value: propS(node, 'strategy', 'RollingUpdate') },
        { label: 'Restarts', value: n0(c.sat > 0.95 ? 1 : 0), status: c.sat > 0.95 ? 'crit' : 'ok' },
      ];
    }
    case 'K8S_SERVICE':
      return [
        { label: 'Endpoints', value: n0(Math.max(1, prop(node, 'target_port', 8080) > 0 ? 3 : 1)) },
        { label: 'Connections', value: `${n0(c.load)} /s` },
        { label: 'Type', value: propS(node, 'type', 'ClusterIP') },
      ];
    case 'K8S_INGRESS':
      return [
        { label: 'Routes', value: `${n0(c.load)} req/s` },
        { label: 'TLS handshakes', value: node.properties.tls_enabled === true ? `${n0(c.load * 0.2)} /s` : 'TLS off', status: node.properties.tls_enabled === true ? 'ok' : 'warn' },
        { label: '5xx rate', value: `${n1(c.err * 100)}%`, status: c.err > 0.05 ? 'crit' : 'ok' },
      ];

    default:
      return [];
  }
}

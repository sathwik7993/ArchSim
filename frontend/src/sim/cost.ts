import type { CanvasNode, ComponentCategory, ComponentType } from '../types/graph';
import { CATEGORY_MAP } from '../types/graph';

// ---------------------------------------------------------------------------
// Phase 11 — cost estimation.
//
// A rough, opinionated monthly cloud-cost estimate for a design, driven by each
// component's TYPE and its configured properties (cores, memory, replicas,
// storage, capacity units…). Numbers are order-of-magnitude teaching estimates
// modelled on typical AWS on-demand list prices (730 hrs/month) — not a billing
// tool. The point is to make tradeoffs visible: a Postgres read replica or a
// 3-member Mongo replica set or an MSK broker fleet should visibly cost more.
// ---------------------------------------------------------------------------

const num = (node: CanvasNode, key: string, fallback: number): number => {
  const v = node.properties[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
};
const str = (node: CanvasNode, key: string, fallback: string): string => {
  const v = node.properties[key];
  return typeof v === 'string' ? v : fallback;
};
const bool = (node: CanvasNode, key: string): boolean => node.properties[key] === true;

// Blended compute rates (per unit-month) — deliberately conservative.
const PER_VCPU = 18;   // $/vCPU-month
const PER_GB_RAM = 3;  // $/GB-month

export interface NodeCost {
  id: string;
  label: string;
  type: ComponentType;
  category: ComponentCategory;
  monthly: number;
  /** Short human explanation of what drives this cost. */
  note: string;
}

export interface CostBreakdown {
  total: number;
  perNode: NodeCost[];
  byCategory: Array<{ category: ComponentCategory; monthly: number }>;
}

/** Estimated monthly USD cost + driver note for a single component. */
export function estimateNodeCost(node: CanvasNode): { monthly: number; note: string } {
  const t = node.type;
  switch (t) {
    // ── Compute ──
    case 'CLIENT':
      return { monthly: 0, note: 'traffic source — not billed' };
    case 'SERVER': {
      const cores = num(node, 'cpu_cores', 4);
      const mem = num(node, 'memory_gb', 16);
      const base = cores * PER_VCPU + mem * PER_GB_RAM;
      const scaled = bool(node, 'auto_scaling') ? base * 1.6 : base;
      return { monthly: scaled, note: `${cores} vCPU · ${mem} GB${bool(node, 'auto_scaling') ? ' · autoscaling headroom' : ''}` };
    }
    case 'CONTAINER': {
      const cpu = num(node, 'cpu_limit', 2);
      const memMb = num(node, 'memory_limit', 512);
      const replicas = Math.max(1, num(node, 'replicas', 1));
      const each = cpu * PER_VCPU + (memMb / 1024) * PER_GB_RAM;
      return { monthly: each * replicas, note: `${replicas}× (${cpu} vCPU · ${memMb} MB)` };
    }
    case 'LAMBDA': {
      const memMb = num(node, 'memory_mb', 256);
      return { monthly: 5 + (memMb / 128) * 2, note: `serverless · ${memMb} MB (scales with invocations)` };
    }
    case 'VM': {
      const cores = num(node, 'cpu_cores', 2);
      const mem = num(node, 'memory_gb', 4);
      return { monthly: cores * PER_VCPU + mem * PER_GB_RAM, note: `${str(node, 'instance_type', 't3.medium')} · ${cores} vCPU · ${mem} GB` };
    }

    // ── Networking ──
    case 'API_GATEWAY': {
      const rps = num(node, 'rate_limit_rps', 1000);
      return { monthly: 15 + (rps / 1000) * 3.5, note: `managed gateway · ~${rps} rps tier` };
    }
    case 'LOAD_BALANCER': {
      const maxc = num(node, 'max_connections', 10000);
      return { monthly: 18 + (maxc / 10000) * 8, note: `LB + capacity units (${maxc} conns)` };
    }
    case 'CDN': {
      const edges = num(node, 'edge_locations', 50);
      return { monthly: 20 + edges * 0.5, note: `${edges} edge PoPs + egress` };
    }
    case 'DNS':
      return { monthly: 5, note: 'hosted zone + queries' };
    case 'FIREWALL':
      return { monthly: 10, note: 'managed firewall' };

    // ── Storage ──
    case 'S3_BUCKET':
      return { monthly: 5 + (bool(node, 'versioning') ? 3 : 0), note: `object storage${bool(node, 'versioning') ? ' · versioned' : ''} (scales with data)` };
    case 'EBS_VOLUME': {
      const gb = num(node, 'size_gb', 100);
      const iops = num(node, 'iops', 3000);
      return { monthly: gb * 0.08 + Math.max(0, iops - 3000) * 0.005, note: `${gb} GB ${str(node, 'volume_type', 'gp3')} · ${iops} IOPS` };
    }
    case 'BLOCK_STORAGE': {
      const gb = num(node, 'size_gb', 50);
      return { monthly: gb * 0.1, note: `${gb} GB block volume` };
    }

    // ── Database (managed, expensive) ──
    case 'POSTGRESQL':
    case 'MYSQL': {
      const gb = num(node, 'storage_gb', 50);
      const replica = bool(node, 'replication');
      const compute = 120 * (replica ? 2 : 1);
      return { monthly: compute + gb * 0.115, note: `managed instance${replica ? ' + read replica' : ''} · ${gb} GB` };
    }
    case 'MONGODB': {
      const members = Math.max(1, num(node, 'replica_set_members', 3));
      return { monthly: members * 110, note: `${members}-member replica set` };
    }
    case 'DYNAMODB': {
      if (str(node, 'billing_mode', 'PROVISIONED') === 'ON_DEMAND') {
        return { monthly: 5, note: 'on-demand (scales with traffic)' };
      }
      const rcu = num(node, 'read_capacity', 5);
      const wcu = num(node, 'write_capacity', 5);
      return { monthly: rcu * 0.095 + wcu * 0.47, note: `provisioned · ${rcu} RCU / ${wcu} WCU` };
    }
    case 'CASSANDRA': {
      const nodes = Math.max(1, num(node, 'num_nodes', 3));
      return { monthly: nodes * 140, note: `${nodes}-node cluster (self-managed)` };
    }

    // ── Cache ──
    case 'REDIS': {
      const gb = num(node, 'maxmemory_mb', 256) / 1024;
      const base = 15 + gb * 25;
      return { monthly: bool(node, 'cluster_mode') ? base * 3 : base, note: `${gb.toFixed(2)} GB${bool(node, 'cluster_mode') ? ' · clustered (3 shards)' : ''}` };
    }
    case 'MEMCACHED': {
      const gb = num(node, 'memory_mb', 256) / 1024;
      return { monthly: 12 + gb * 22, note: `${gb.toFixed(2)} GB cache` };
    }

    // ── Messaging ──
    case 'KAFKA': {
      const brokers = Math.max(1, num(node, 'brokers', 3));
      return { monthly: brokers * 130, note: `${brokers} brokers + storage` };
    }
    case 'RABBITMQ':
      return { monthly: 60, note: 'broker instance' };
    case 'SQS':
      return { monthly: 2, note: 'per-request (scales with volume)' };
    case 'SNS':
      return { monthly: 1, note: 'per-publish (scales with volume)' };

    // ── Monitoring ──
    case 'PROMETHEUS':
      return { monthly: 30, note: 'self-managed instance + storage' };
    case 'GRAFANA':
      return { monthly: 25, note: 'dashboards instance' };
    case 'CLOUDWATCH': {
      const days = num(node, 'log_retention_days', 30);
      return { monthly: 15 + (days / 30) * 5, note: `logs + metrics · ${days} d retention` };
    }

    // ── Security ──
    case 'WAF':
      return { monthly: 10 + num(node, 'rate_limit', 2000) / 2000 * 2, note: 'web ACL + rules' };
    case 'IAM':
      return { monthly: 0, note: 'no charge' };
    case 'SECRETS_MANAGER':
      return { monthly: 5, note: 'secrets + API calls' };

    // ── Kubernetes ──
    case 'K8S_CLUSTER': {
      const nodes = Math.max(1, num(node, 'node_count', 3));
      return { monthly: 73 + nodes * 60, note: `control plane + ${nodes} worker nodes` };
    }
    case 'K8S_DEPLOYMENT': {
      const replicas = Math.max(1, num(node, 'replicas', 3));
      const cpu = num(node, 'cpu_request', 0.5);
      const memMb = num(node, 'memory_request', 256);
      const each = cpu * PER_VCPU + (memMb / 1024) * PER_GB_RAM;
      return { monthly: each * replicas, note: `${replicas}× requested (${cpu} vCPU · ${memMb} MB)` };
    }
    case 'K8S_SERVICE': {
      const lb = str(node, 'type', 'ClusterIP') === 'LoadBalancer';
      return { monthly: lb ? 18 : 0, note: lb ? 'LoadBalancer service' : 'in-cluster (no charge)' };
    }
    case 'K8S_INGRESS':
      return { monthly: 18, note: 'ingress load balancer' };

    default:
      return { monthly: 0, note: '' };
  }
}

/** Full breakdown across a design: per-node, per-category, and total. */
export function costBreakdown(nodes: CanvasNode[]): CostBreakdown {
  const perNode: NodeCost[] = nodes.map((node) => {
    const { monthly, note } = estimateNodeCost(node);
    return {
      id: node.id,
      label: node.label,
      type: node.type,
      category: CATEGORY_MAP[node.type],
      monthly: Math.round(monthly),
      note,
    };
  });

  const catMap = new Map<ComponentCategory, number>();
  for (const n of perNode) catMap.set(n.category, (catMap.get(n.category) ?? 0) + n.monthly);

  const byCategory = [...catMap.entries()]
    .map(([category, monthly]) => ({ category, monthly }))
    .filter((c) => c.monthly > 0)
    .sort((a, b) => b.monthly - a.monthly);

  const total = perNode.reduce((sum, n) => sum + n.monthly, 0);
  return { total, perNode: perNode.sort((a, b) => b.monthly - a.monthly), byCategory };
}

/** Compact USD formatter: $1.2k, $340, $0. */
export function formatUsd(v: number): string {
  if (v >= 10000) return `$${(v / 1000).toFixed(1)}k`;
  if (v >= 1000) return `$${(v / 1000).toFixed(2)}k`;
  return `$${Math.round(v)}`;
}

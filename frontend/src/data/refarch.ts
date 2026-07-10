import { DEFAULT_PROPERTIES } from '../types/graph';
import type { CanvasLink, CanvasNode, ComponentType } from '../types/graph';
import type { TopicId } from './topics';

// ---------------------------------------------------------------------------
// Phase 8 (revision) — reference architectures.
//
// Each topic gets a representative reference architecture: real components laid
// out left-to-right so it renders as a clean diagram AND can be loaded straight
// into the simulator. This is the "visual solution" — a picture beats prose.
// ---------------------------------------------------------------------------

export interface RefArch {
  nodes: CanvasNode[];
  links: CanvasLink[];
  caption: string;
}

type N = [id: string, type: ComponentType, label: string, x: number, y: number, props?: Record<string, string | number | boolean>];
type L = [source: string, target: string];

function build(caption: string, ns: N[], ls: L[]): RefArch {
  return {
    caption,
    nodes: ns.map(([id, type, label, x, y, props]) => ({
      id,
      type,
      label,
      position: { x, y },
      properties: { ...DEFAULT_PROPERTIES[type], ...(props ?? {}) },
    })),
    links: ls.map(([source, target]) => ({
      id: `l-${source}-${target}`,
      source,
      target,
      properties: { latencyMs: 4, bandwidthGbps: 10 },
    })),
  };
}

export const REF_ARCH: Record<TopicId, RefArch> = {
  files: build(
    'Metadata path (top) is small and DB-backed; the bytes path (bottom) goes to object storage fronted by a CDN — app servers never touch file data.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 300 }],
      ['api', 'API_GATEWAY', 'API Gateway', 190, 90],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 330, 90],
      ['app', 'SERVER', 'Metadata Svc', 470, 90],
      ['pg', 'POSTGRESQL', 'Metadata DB', 610, 90, { replication: true }],
      ['cdn', 'CDN', 'CDN', 250, 300],
      ['s3', 'S3_BUCKET', 'Blob Storage', 430, 300],
    ],
    [['client', 'api'], ['api', 'lb'], ['lb', 'app'], ['app', 'pg'], ['client', 'cdn'], ['cdn', 's3'], ['app', 's3']],
  ),
  streaming: build(
    'Segments are served from the CDN off object storage (bottom); a small metadata/API path (top) handles catalog and playback state.',
    [
      ['client', 'CLIENT', 'Player', 40, 190, { qps: 600 }],
      ['api', 'API_GATEWAY', 'Metadata API', 200, 80],
      ['app', 'SERVER', 'Catalog Svc', 360, 80],
      ['redis', 'REDIS', 'Cache', 520, 80],
      ['cdn', 'CDN', 'Edge CDN', 200, 300, { edge_locations: 120 }],
      ['s3', 'S3_BUCKET', 'Segment Origin', 380, 300],
      ['kafka', 'KAFKA', 'Transcode Queue', 560, 300],
    ],
    [['client', 'api'], ['api', 'app'], ['app', 'redis'], ['client', 'cdn'], ['cdn', 's3'], ['s3', 'kafka']],
  ),
  messaging: build(
    'Clients hold WebSockets to a stateless gateway fleet; a registry (Redis) routes to the right connection, a bus fans out to groups, and history is durable.',
    [
      ['client', 'CLIENT', 'Client', 40, 180, { qps: 500, protocol: 'WSS' }],
      ['gw', 'API_GATEWAY', 'WS Gateway', 190, 180],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 320, 180],
      ['chat', 'SERVER', 'Chat Servers', 460, 180],
      ['redis', 'REDIS', 'Presence/Registry', 610, 70],
      ['kafka', 'KAFKA', 'Fan-out Bus', 610, 190],
      ['mongo', 'MONGODB', 'History', 610, 310],
    ],
    [['client', 'gw'], ['gw', 'lb'], ['lb', 'chat'], ['chat', 'redis'], ['chat', 'kafka'], ['chat', 'mongo']],
  ),
  collab: build(
    'A per-document coordinator serializes edits and broadcasts them; snapshots persist to a DB and ops flow over a pub/sub layer.',
    [
      ['client', 'CLIENT', 'Editors', 40, 180, { qps: 400, protocol: 'WSS' }],
      ['gw', 'API_GATEWAY', 'WS Gateway', 190, 180],
      ['coord', 'SERVER', 'Doc Coordinator', 350, 180],
      ['redis', 'REDIS', 'Pub/Sub', 520, 80],
      ['pg', 'POSTGRESQL', 'Snapshots', 520, 200],
      ['kafka', 'KAFKA', 'Op Log', 520, 320],
    ],
    [['client', 'gw'], ['gw', 'coord'], ['coord', 'redis'], ['coord', 'pg'], ['coord', 'kafka']],
  ),
  social: build(
    'Writes fan out into follower feed caches; reads serve a precomputed feed and hydrate content from a store/CDN. Celebrities are merged in on read.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 800 }],
      ['api', 'API_GATEWAY', 'API Gateway', 180, 190],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 315, 190],
      ['app', 'SERVER', 'Feed Svc', 450, 190],
      ['redis', 'REDIS', 'Feed Cache', 600, 70],
      ['cass', 'CASSANDRA', 'Posts', 600, 190],
      ['kafka', 'KAFKA', 'Fan-out', 600, 310],
    ],
    [['client', 'api'], ['api', 'lb'], ['lb', 'app'], ['app', 'redis'], ['app', 'cass'], ['app', 'kafka']],
  ),
  geo: build(
    'Location pings update an in-memory geo index; nearby queries hit that index, and a matching service manages the trip state machine.',
    [
      ['client', 'CLIENT', 'App', 40, 190, { qps: 700 }],
      ['api', 'API_GATEWAY', 'API Gateway', 180, 190],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 315, 190],
      ['app', 'SERVER', 'Match/Geo Svc', 455, 190],
      ['redis', 'REDIS', 'Geo Index', 600, 80],
      ['cass', 'CASSANDRA', 'Trips/History', 600, 200],
      ['kafka', 'KAFKA', 'Events', 600, 320],
    ],
    [['client', 'api'], ['api', 'lb'], ['lb', 'app'], ['app', 'redis'], ['app', 'cass'], ['app', 'kafka']],
  ),
  booking: build(
    'A waiting room admits users at a safe rate; the hold step atomically flips inventory with a TTL in Redis/DB, and confirmation is idempotent.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 1000 }],
      ['api', 'API_GATEWAY', 'Waiting Room', 190, 190],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 330, 190],
      ['app', 'SERVER', 'Booking Svc', 470, 190],
      ['redis', 'REDIS', 'Holds (TTL)', 610, 90],
      ['pg', 'POSTGRESQL', 'Inventory/Orders', 610, 210],
      ['sqs', 'SQS', 'Confirm Queue', 610, 320],
    ],
    [['client', 'api'], ['api', 'lb'], ['lb', 'app'], ['app', 'redis'], ['app', 'pg'], ['app', 'sqs']],
  ),
  commerce: build(
    'Money movements write an append-only ledger in an ACID DB; idempotency keys dedupe retries and an event stream feeds settlement/fraud.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 400 }],
      ['api', 'API_GATEWAY', 'API Gateway', 180, 190],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 315, 190],
      ['app', 'SERVER', 'Payment Svc', 455, 190],
      ['pg', 'POSTGRESQL', 'Ledger (ACID)', 600, 90, { replication: true }],
      ['redis', 'REDIS', 'Idempotency', 600, 200],
      ['kafka', 'KAFKA', 'Settle/Fraud', 600, 310],
    ],
    [['client', 'api'], ['api', 'lb'], ['lb', 'app'], ['app', 'pg'], ['app', 'redis'], ['app', 'kafka']],
  ),
  search: build(
    'An offline pipeline ingests + indexes into sharded stores; the serving tier scatter-gathers a query, re-ranks the top-k, and caches hot queries.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 900 }],
      ['api', 'API_GATEWAY', 'Query API', 180, 190],
      ['app', 'SERVER', 'Search Svc', 330, 190],
      ['redis', 'REDIS', 'Query Cache', 480, 80],
      ['cass', 'CASSANDRA', 'Index Shards', 480, 200],
      ['kafka', 'KAFKA', 'Ingest', 480, 320],
      ['s3', 'S3_BUCKET', 'Doc Store', 620, 320],
    ],
    [['client', 'api'], ['api', 'app'], ['app', 'redis'], ['app', 'cass'], ['kafka', 'cass'], ['kafka', 's3']],
  ),
  'infra-net': build(
    'DNS + CDN + load balancer form the edge; a WAF filters, and a stateless data-plane fleet forwards while the control plane pushes config.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 1500 }],
      ['dns', 'DNS', 'DNS', 180, 90],
      ['cdn', 'CDN', 'CDN', 180, 290],
      ['waf', 'WAF', 'WAF', 330, 190],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 470, 190],
      ['app', 'SERVER', 'Backends', 610, 110],
      ['redis', 'REDIS', 'Shared State', 610, 280],
    ],
    [['client', 'dns'], ['client', 'cdn'], ['client', 'waf'], ['waf', 'lb'], ['lb', 'app'], ['app', 'redis']],
  ),
  notifications: build(
    'Requests land on a durable queue; fan-out workers resolve the audience and deliver per-channel with retries and per-provider rate limits.',
    [
      ['client', 'CLIENT', 'Producers', 40, 190, { qps: 500 }],
      ['api', 'API_GATEWAY', 'Ingest API', 190, 190],
      ['sqs', 'SQS', 'Durable Queue', 340, 190],
      ['worker', 'SERVER', 'Fan-out Workers', 490, 190],
      ['redis', 'REDIS', 'Dedup/Prefs', 630, 90],
      ['pg', 'POSTGRESQL', 'Devices', 630, 210],
      ['kafka', 'KAFKA', 'Receipts', 630, 320],
    ],
    [['client', 'api'], ['api', 'sqs'], ['sqs', 'worker'], ['worker', 'redis'], ['worker', 'pg'], ['worker', 'kafka']],
  ),
  analytics: build(
    'Producers write to a durable log that absorbs bursts; stream processors aggregate into a query store, with rollups to cheap storage.',
    [
      ['client', 'CLIENT', 'Producers', 40, 190, { qps: 2000 }],
      ['api', 'API_GATEWAY', 'Ingest', 180, 190],
      ['kafka', 'KAFKA', 'Event Log', 320, 190],
      ['app', 'SERVER', 'Stream Procs', 460, 190],
      ['cass', 'CASSANDRA', 'TSDB / OLAP', 610, 90],
      ['s3', 'S3_BUCKET', 'Cold Rollups', 610, 210],
      ['prom', 'PROMETHEUS', 'Alerting', 610, 320],
    ],
    [['client', 'api'], ['api', 'kafka'], ['kafka', 'app'], ['app', 'cass'], ['app', 's3'], ['app', 'prom']],
  ),
  jobs: build(
    'Submissions persist and a scheduler leases jobs to isolated workers (containers/microVMs); a DAG engine unblocks downstream tasks.',
    [
      ['client', 'CLIENT', 'Submit', 40, 190, { qps: 200 }],
      ['api', 'API_GATEWAY', 'API', 180, 190],
      ['sched', 'SERVER', 'Scheduler', 320, 190],
      ['queue', 'KAFKA', 'Job Queue', 460, 190],
      ['k8s', 'K8S_CLUSTER', 'Worker Fleet', 610, 90],
      ['pg', 'POSTGRESQL', 'Job State', 610, 210],
      ['redis', 'REDIS', 'Leases', 610, 320],
    ],
    [['client', 'api'], ['api', 'sched'], ['sched', 'queue'], ['queue', 'k8s'], ['sched', 'pg'], ['sched', 'redis']],
  ),
  datastores: build(
    'A coordinator routes to the owning partition; each partition is a WAL-backed engine replicated N ways with consensus for strong consistency.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 600 }],
      ['lb', 'LOAD_BALANCER', 'Coordinator', 200, 190],
      ['n1', 'CASSANDRA', 'Partition A (RF3)', 380, 90],
      ['n2', 'CASSANDRA', 'Partition B (RF3)', 380, 290],
      ['ebs1', 'EBS_VOLUME', 'WAL + SSTables', 560, 90],
      ['ebs2', 'EBS_VOLUME', 'WAL + SSTables', 560, 290],
    ],
    [['client', 'lb'], ['lb', 'n1'], ['lb', 'n2'], ['n1', 'ebs1'], ['n2', 'ebs2']],
  ),
  security: build(
    'An identity provider issues short-lived signed tokens; services verify locally, secrets come from a KMS-backed vault, and everything is audited.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 400 }],
      ['waf', 'WAF', 'WAF', 180, 190],
      ['api', 'API_GATEWAY', 'API Gateway', 320, 190],
      ['iam', 'IAM', 'Identity Provider', 470, 80],
      ['app', 'SERVER', 'Services', 470, 300],
      ['secrets', 'SECRETS_MANAGER', 'Vault (KMS)', 620, 190],
      ['pg', 'POSTGRESQL', 'Audit Log', 620, 320],
    ],
    [['client', 'waf'], ['waf', 'api'], ['api', 'iam'], ['api', 'app'], ['app', 'secrets'], ['app', 'pg']],
  ),
  lowlevel: build(
    'A single-machine staged pipeline over an intermediate representation, with generational memory management and durable backing store.',
    [
      ['client', 'CLIENT', 'Input', 40, 170, { qps: 100 }],
      ['front', 'SERVER', 'Parse / Frontend', 200, 170],
      ['core', 'SERVER', 'Execute / Optimize', 380, 170],
      ['disk', 'BLOCK_STORAGE', 'Heap / Store', 560, 170],
    ],
    [['client', 'front'], ['front', 'core'], ['core', 'disk']],
  ),
  primitives: build(
    'Shard the primitive by key so no single node is a hotspot; hot state lives in memory with optional durable backing.',
    [
      ['client', 'CLIENT', 'Client', 40, 180, { qps: 1000 }],
      ['api', 'API_GATEWAY', 'API', 190, 180],
      ['app', 'SERVER', 'Service', 340, 180],
      ['redis', 'REDIS', 'In-memory State', 500, 90],
      ['pg', 'POSTGRESQL', 'Durable Backing', 500, 280],
    ],
    [['client', 'api'], ['api', 'app'], ['app', 'redis'], ['app', 'pg']],
  ),
  generic: build(
    'The canonical shape: edge → stateless services → data tier, a cache on the hot read path, and a queue to offload heavy async work.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 500 }],
      ['api', 'API_GATEWAY', 'API Gateway', 180, 190],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 315, 190],
      ['app', 'SERVER', 'Services', 455, 190],
      ['redis', 'REDIS', 'Cache', 600, 80],
      ['pg', 'POSTGRESQL', 'Database', 600, 200],
      ['kafka', 'KAFKA', 'Async Work', 600, 320],
    ],
    [['client', 'api'], ['api', 'lb'], ['lb', 'app'], ['app', 'redis'], ['app', 'pg'], ['app', 'kafka']],
  ),
};

// Bespoke, problem-specific reference architectures for flagship problems.
// Falls through to the topic architecture for everything else.
export const PROBLEM_REF_ARCH: Record<string, RefArch> = {
  'message-queue-kafka': build(
    'Producers append to partitioned topics; each partition has a leader + follower replicas (ISR). Consumer groups read at their own offset, one partition per consumer.',
    [
      ['prod', 'CLIENT', 'Producers', 40, 190, { qps: 5000 }],
      ['broker', 'LOAD_BALANCER', 'Broker Cluster', 210, 190],
      ['p1', 'KAFKA', 'Partition 0 (leader)', 400, 80],
      ['p2', 'KAFKA', 'Partition 1 (leader)', 400, 300],
      ['r1', 'EBS_VOLUME', 'Replica log', 580, 80],
      ['r2', 'EBS_VOLUME', 'Replica log', 580, 300],
      ['cons', 'SERVER', 'Consumer Group', 400, 190],
    ],
    [['prod', 'broker'], ['broker', 'p1'], ['broker', 'p2'], ['p1', 'r1'], ['p2', 'r2'], ['p1', 'cons'], ['p2', 'cons']],
  ),
  'uber-ride-hailing': build(
    'Driver pings update an in-memory geo index (Redis); rider requests hit a matching service that queries nearby drivers and runs a hold-based trip state machine, partitioned by region.',
    [
      ['rider', 'CLIENT', 'Rider App', 40, 110, { qps: 800 }],
      ['driver', 'CLIENT', 'Driver App', 40, 300, { qps: 4000 }],
      ['api', 'API_GATEWAY', 'API Gateway', 210, 200],
      ['match', 'SERVER', 'Matching Svc', 380, 200],
      ['geo', 'REDIS', 'Geo Index', 560, 90],
      ['trips', 'CASSANDRA', 'Trips', 560, 210],
      ['events', 'KAFKA', 'Events', 560, 330],
    ],
    [['rider', 'api'], ['driver', 'api'], ['api', 'match'], ['match', 'geo'], ['match', 'trips'], ['match', 'events']],
  ),
};

export function getRefArch(topic: TopicId, slug?: string): RefArch {
  if (slug && PROBLEM_REF_ARCH[slug]) return PROBLEM_REF_ARCH[slug];
  return REF_ARCH[topic] ?? REF_ARCH.generic;
}

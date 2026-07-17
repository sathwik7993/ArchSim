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

  'url-shortener': build(
    'Writes generate a short key (counter/base62) and store the mapping; reads hit a cache first and fall through to a key-value store. Click events stream off for analytics.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 1200 }],
      ['api', 'API_GATEWAY', 'API Gateway', 180, 190],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 315, 190],
      ['app', 'SERVER', 'Shortener Svc', 450, 190],
      ['redis', 'REDIS', 'Hot Cache', 600, 80],
      ['ddb', 'DYNAMODB', 'URL Store', 600, 200],
      ['kafka', 'KAFKA', 'Click Events', 600, 320],
    ],
    [['client', 'api'], ['api', 'lb'], ['lb', 'app'], ['app', 'redis'], ['app', 'ddb'], ['app', 'kafka']],
  ),
  'web-crawler': build(
    'A URL frontier feeds fetcher workers; a seen-set (Bloom filter) dedupes, the parser extracts links back into the frontier, and pages + the link graph are stored.',
    [
      ['seed', 'CLIENT', 'Seed URLs', 40, 190, { qps: 300 }],
      ['frontier', 'KAFKA', 'URL Frontier', 200, 190],
      ['fetch', 'SERVER', 'Fetchers', 360, 190],
      ['dedup', 'REDIS', 'Seen (Bloom)', 520, 80],
      ['parse', 'SERVER', 'Parser', 520, 200],
      ['store', 'S3_BUCKET', 'Page Store', 680, 120],
      ['graph', 'CASSANDRA', 'Link Graph', 680, 300],
    ],
    [['seed', 'frontier'], ['frontier', 'fetch'], ['fetch', 'dedup'], ['fetch', 'parse'], ['parse', 'store'], ['parse', 'graph'], ['parse', 'frontier']],
  ),
  'distributed-rate-limiter': build(
    'The gateway checks a token bucket in Redis before forwarding; buckets are keyed by client/route with atomic decrements, and rules come from a config store.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 3000 }],
      ['gw', 'API_GATEWAY', 'Gateway + Limiter', 210, 190],
      ['redis', 'REDIS', 'Token Buckets', 400, 80],
      ['cfg', 'POSTGRESQL', 'Limit Rules', 400, 300],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 560, 190],
      ['app', 'SERVER', 'Services', 700, 190],
    ],
    [['client', 'gw'], ['gw', 'redis'], ['gw', 'cfg'], ['gw', 'lb'], ['lb', 'app']],
  ),
  'dropbox-cloud-file-storage': build(
    'Metadata (top) is small and DB-backed; file blocks (bottom) go straight to object storage fronted by a CDN. A sync event stream notifies other devices.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 400 }],
      ['api', 'API_GATEWAY', 'API Gateway', 190, 90],
      ['meta', 'SERVER', 'Metadata Svc', 350, 90],
      ['pg', 'POSTGRESQL', 'File Metadata', 510, 90, { replication: true }],
      ['cdn', 'CDN', 'CDN', 230, 300],
      ['s3', 'S3_BUCKET', 'Block Store', 410, 300],
      ['notif', 'KAFKA', 'Sync Events', 590, 300],
    ],
    [['client', 'api'], ['api', 'meta'], ['meta', 'pg'], ['client', 'cdn'], ['cdn', 's3'], ['meta', 's3'], ['meta', 'notif']],
  ),
  'whatsapp-real-time-chat': build(
    'Clients hold WebSockets to a stateless chat fleet; a session registry routes to the right connection, a bus fans messages out, and history is durable.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 2000, protocol: 'WSS' }],
      ['gw', 'API_GATEWAY', 'WS Gateway', 190, 190],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 320, 190],
      ['chat', 'SERVER', 'Chat Svc', 460, 190],
      ['sess', 'REDIS', 'Session Registry', 610, 70],
      ['bus', 'KAFKA', 'Message Bus', 610, 190],
      ['store', 'CASSANDRA', 'Message Store', 610, 310],
    ],
    [['client', 'gw'], ['gw', 'lb'], ['lb', 'chat'], ['chat', 'sess'], ['chat', 'bus'], ['chat', 'store']],
  ),
  'youtube-video-streaming': build(
    'Uploads are transcoded asynchronously (a queue feeds a worker fleet) into renditions in object storage served by a CDN; a small metadata path handles catalog and playback.',
    [
      ['viewer', 'CLIENT', 'Viewer', 40, 190, { qps: 900 }],
      ['api', 'API_GATEWAY', 'API', 180, 90],
      ['meta', 'SERVER', 'Catalog Svc', 320, 90],
      ['pg', 'POSTGRESQL', 'Metadata', 460, 90],
      ['tq', 'KAFKA', 'Transcode Queue', 320, 300],
      ['tw', 'K8S_CLUSTER', 'Transcoders', 480, 300],
      ['s3', 'S3_BUCKET', 'Renditions', 640, 300],
      ['cdn', 'CDN', 'Edge CDN', 180, 300, { edge_locations: 140 }],
    ],
    [['viewer', 'api'], ['api', 'meta'], ['meta', 'pg'], ['meta', 'tq'], ['tq', 'tw'], ['tw', 's3'], ['viewer', 'cdn'], ['cdn', 's3']],
  ),
  'ticketmaster-event-ticket-booking': build(
    'A waiting room admits users at a safe rate; a hold step atomically reserves seats with a TTL, inventory lives in an ACID DB, and confirmation is queued/idempotent.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 2500 }],
      ['wr', 'API_GATEWAY', 'Waiting Room', 200, 190],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 340, 190],
      ['book', 'SERVER', 'Booking Svc', 480, 190],
      ['holds', 'REDIS', 'Seat Holds (TTL)', 620, 80],
      ['inv', 'POSTGRESQL', 'Inventory (ACID)', 620, 200, { replication: true }],
      ['q', 'SQS', 'Confirm/Email', 620, 320],
    ],
    [['client', 'wr'], ['wr', 'lb'], ['lb', 'book'], ['book', 'holds'], ['book', 'inv'], ['book', 'q']],
  ),
  'facebook-news-feed': build(
    'Writes fan out into per-follower feed caches; reads serve the precomputed feed and hydrate posts from the store and media from a CDN. Celebrities merge in on read.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 1500 }],
      ['api', 'API_GATEWAY', 'API Gateway', 180, 190],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 315, 190],
      ['feed', 'SERVER', 'Feed Svc', 450, 190],
      ['cache', 'REDIS', 'Feed Cache', 600, 70],
      ['posts', 'CASSANDRA', 'Posts', 600, 190],
      ['fan', 'KAFKA', 'Fan-out on Write', 600, 310],
    ],
    [['client', 'api'], ['api', 'lb'], ['lb', 'feed'], ['feed', 'cache'], ['feed', 'posts'], ['feed', 'fan']],
  ),
  'payment-processing-system': build(
    'Every money movement writes an append-only ledger in an ACID DB; idempotency keys dedupe retries, a PSP adapter talks to the network, and events feed settlement/fraud.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 500 }],
      ['api', 'API_GATEWAY', 'API Gateway', 170, 190],
      ['pay', 'SERVER', 'Payment Svc', 320, 190],
      ['idem', 'REDIS', 'Idempotency Keys', 480, 70],
      ['ledger', 'POSTGRESQL', 'Ledger (ACID)', 480, 190, { replication: true }],
      ['events', 'KAFKA', 'Settle/Fraud', 480, 310],
      ['psp', 'SERVER', 'PSP Adapter', 650, 190],
    ],
    [['client', 'api'], ['api', 'pay'], ['pay', 'idem'], ['pay', 'ledger'], ['pay', 'events'], ['pay', 'psp']],
  ),
  'top-k-trending-elements': build(
    'A stream of events feeds windowed aggregators using count-min sketch/heaps; the running top-K sits in Redis, rollups persist, and a query API serves the board.',
    [
      ['client', 'CLIENT', 'Producers', 40, 190, { qps: 5000 }],
      ['api', 'API_GATEWAY', 'Ingest', 180, 190],
      ['stream', 'KAFKA', 'Event Stream', 320, 190],
      ['agg', 'SERVER', 'Aggregators (CMS)', 470, 190],
      ['redis', 'REDIS', 'Top-K Heap', 620, 90],
      ['store', 'CASSANDRA', 'Rollups', 620, 290],
      ['query', 'SERVER', 'Query API', 470, 320],
    ],
    [['client', 'api'], ['api', 'stream'], ['stream', 'agg'], ['agg', 'redis'], ['agg', 'store'], ['query', 'redis']],
  ),
  'google-docs-collaborative-editing': build(
    'A per-document coordinator serializes edits (OT/CRDT) and broadcasts them over pub/sub; snapshots persist to a DB, the op log is durable, and attachments go to blob storage.',
    [
      ['client', 'CLIENT', 'Editors', 40, 190, { qps: 800, protocol: 'WSS' }],
      ['gw', 'API_GATEWAY', 'WS Gateway', 190, 190],
      ['coord', 'SERVER', 'Doc Coordinator (OT)', 350, 190],
      ['pubsub', 'REDIS', 'Pub/Sub', 540, 70],
      ['snap', 'POSTGRESQL', 'Snapshots', 540, 190],
      ['oplog', 'KAFKA', 'Op Log', 540, 310],
      ['s3', 'S3_BUCKET', 'Attachments', 700, 190],
    ],
    [['client', 'gw'], ['gw', 'coord'], ['coord', 'pubsub'], ['coord', 'snap'], ['coord', 'oplog'], ['coord', 's3']],
  ),

  'instagram-photo-sharing': build(
    'Metadata and feeds are cache-first over a wide-column store; photos are written once to object storage and always served through a media CDN.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 1400 }],
      ['api', 'API_GATEWAY', 'API Gateway', 180, 90],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 320, 90],
      ['app', 'SERVER', 'Post/Feed Svc', 460, 90],
      ['cache', 'REDIS', 'Feed Cache', 620, 90],
      ['db', 'CASSANDRA', 'Posts', 620, 210],
      ['cdn', 'CDN', 'Media CDN', 230, 300],
      ['s3', 'S3_BUCKET', 'Photo Store', 430, 300],
    ],
    [['client', 'api'], ['api', 'lb'], ['lb', 'app'], ['app', 'cache'], ['app', 'db'], ['app', 's3'], ['client', 'cdn'], ['cdn', 's3']],
  ),
  'typeahead-suggestion': build(
    'A prefix trie in memory answers suggestions in single-digit ms; query logs stream to an offline builder that rebuilds the trie from an n-gram store on a cadence.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 4000 }],
      ['api', 'API_GATEWAY', 'Query API', 190, 190],
      ['svc', 'SERVER', 'Suggest Svc', 340, 190],
      ['trie', 'REDIS', 'Prefix Trie', 500, 80],
      ['db', 'CASSANDRA', 'N-gram Store', 500, 300],
      ['log', 'KAFKA', 'Query Logs', 340, 320],
      ['build', 'SERVER', 'Trie Builder', 660, 300],
    ],
    [['client', 'api'], ['api', 'svc'], ['svc', 'trie'], ['svc', 'db'], ['svc', 'log'], ['log', 'build'], ['build', 'db']],
  ),
  'distributed-cache-redis-like': build(
    'Clients hash keys through a router (consistent hashing) to the owning shard; shards hold hot state in memory and fall through to a durable backing store on a miss.',
    [
      ['client', 'CLIENT', 'Client', 40, 200, { qps: 6000 }],
      ['router', 'LOAD_BALANCER', 'Cache Router', 210, 200],
      ['n1', 'REDIS', 'Shard A', 400, 70],
      ['n2', 'REDIS', 'Shard B', 400, 200],
      ['n3', 'REDIS', 'Shard C', 400, 330],
      ['db', 'POSTGRESQL', 'Backing Store', 600, 200],
    ],
    [['client', 'router'], ['router', 'n1'], ['router', 'n2'], ['router', 'n3'], ['n1', 'db'], ['n2', 'db'], ['n3', 'db']],
  ),
  'web-search-engine-google-search': build(
    'An offline pipeline builds a sharded inverted index; online, a query fans out (scatter-gather) across index shards, re-ranks the top results, and caches hot queries.',
    [
      ['crawler', 'CLIENT', 'Crawler Feed', 40, 300, { qps: 400 }],
      ['ingest', 'KAFKA', 'Doc Pipeline', 200, 300],
      ['index', 'SERVER', 'Indexer', 360, 300],
      ['shards', 'CASSANDRA', 'Inverted Index', 560, 200],
      ['query', 'API_GATEWAY', 'Query API', 40, 100, { qps: 3000 }],
      ['rank', 'SERVER', 'Ranking / Scatter-Gather', 300, 100],
      ['cache', 'REDIS', 'Query Cache', 560, 60],
    ],
    [['crawler', 'ingest'], ['ingest', 'index'], ['index', 'shards'], ['query', 'rank'], ['rank', 'shards'], ['rank', 'cache']],
  ),
  'pastebin-text-storage': build(
    'Small pastes are metadata + blob: hot pastes are cached, metadata sits in a relational DB, the body goes to object storage, and reads are served through a CDN.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 600 }],
      ['api', 'API_GATEWAY', 'API Gateway', 190, 90],
      ['app', 'SERVER', 'Paste Svc', 340, 90],
      ['cache', 'REDIS', 'Hot Pastes', 500, 70],
      ['db', 'POSTGRESQL', 'Paste Metadata', 500, 190],
      ['s3', 'S3_BUCKET', 'Blob Store', 430, 300],
      ['cdn', 'CDN', 'CDN', 230, 300],
    ],
    [['client', 'api'], ['api', 'app'], ['app', 'cache'], ['app', 'db'], ['app', 's3'], ['client', 'cdn'], ['cdn', 's3']],
  ),
  'ad-click-aggregator': build(
    'Click events land on a durable stream absorbing bursts; windowed aggregators roll them into an OLAP store for dashboards while raw events archive to cheap cold storage.',
    [
      ['client', 'CLIENT', 'Ad Events', 40, 190, { qps: 8000 }],
      ['api', 'API_GATEWAY', 'Ingest', 190, 190],
      ['stream', 'KAFKA', 'Click Stream', 330, 190],
      ['agg', 'SERVER', 'Aggregators', 480, 190],
      ['olap', 'CASSANDRA', 'OLAP Store', 630, 90],
      ['cold', 'S3_BUCKET', 'Raw Cold', 630, 290],
      ['dash', 'SERVER', 'Dashboard API', 480, 320],
    ],
    [['client', 'api'], ['api', 'stream'], ['stream', 'agg'], ['agg', 'olap'], ['agg', 'cold'], ['dash', 'olap']],
  ),
  'game-contest-leaderboard': build(
    'Scores update a Redis sorted set for O(log n) ranked reads; a durable DB is the source of truth and an event stream feeds anti-cheat and history.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 2000 }],
      ['api', 'API_GATEWAY', 'API Gateway', 200, 190],
      ['svc', 'SERVER', 'Score Svc', 360, 190],
      ['zset', 'REDIS', 'Sorted Set (ZSET)', 540, 80],
      ['db', 'POSTGRESQL', 'Durable Scores', 540, 200],
      ['events', 'KAFKA', 'Score Events', 540, 320],
    ],
    [['client', 'api'], ['api', 'svc'], ['svc', 'zset'], ['svc', 'db'], ['svc', 'events']],
  ),
  'google-maps-location-service': build(
    'Map tiles are static and served from a CDN over object storage; routing and nearby queries hit an in-memory geo index over a road graph.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 3000 }],
      ['api', 'API_GATEWAY', 'API Gateway', 190, 90],
      ['geo', 'SERVER', 'Geo/Routing Svc', 350, 90],
      ['idx', 'REDIS', 'Geo Index (geohash)', 520, 70],
      ['graph', 'CASSANDRA', 'Road Graph', 520, 190],
      ['tiles', 'CDN', 'Map Tiles', 230, 300],
      ['s3', 'S3_BUCKET', 'Tile Store', 430, 300],
    ],
    [['client', 'api'], ['api', 'geo'], ['geo', 'idx'], ['geo', 'graph'], ['client', 'tiles'], ['tiles', 's3']],
  ),
  'push-notification-system': build(
    'Requests land on a durable queue; fan-out workers resolve the audience, apply prefs/dedup, and deliver per-channel through provider adapters (APNs/FCM) with retries.',
    [
      ['client', 'CLIENT', 'Producers', 40, 190, { qps: 4000 }],
      ['api', 'API_GATEWAY', 'Ingest API', 190, 190],
      ['q', 'KAFKA', 'Notification Queue', 340, 190],
      ['worker', 'SERVER', 'Fan-out Workers', 490, 190],
      ['prefs', 'REDIS', 'Prefs / Dedup', 640, 80],
      ['db', 'POSTGRESQL', 'Device Tokens', 640, 200],
      ['gw', 'SERVER', 'APNs/FCM Adapter', 640, 320],
    ],
    [['client', 'api'], ['api', 'q'], ['q', 'worker'], ['worker', 'prefs'], ['worker', 'db'], ['worker', 'gw']],
  ),
  'distributed-job-scheduler': build(
    'Submissions persist and a scheduler leases jobs to an isolated worker fleet; leases/locks prevent double-execution and job state is durable and queryable.',
    [
      ['client', 'CLIENT', 'Submit', 40, 190, { qps: 300 }],
      ['api', 'API_GATEWAY', 'API', 190, 190],
      ['sched', 'SERVER', 'Scheduler', 330, 190],
      ['q', 'KAFKA', 'Job Queue', 480, 190],
      ['workers', 'K8S_CLUSTER', 'Worker Fleet', 640, 80],
      ['state', 'POSTGRESQL', 'Job State', 640, 210],
      ['leases', 'REDIS', 'Leases / Locks', 640, 330],
    ],
    [['client', 'api'], ['api', 'sched'], ['sched', 'q'], ['q', 'workers'], ['sched', 'state'], ['sched', 'leases']],
  ),
  'unique-id-generator-snowflake': build(
    'Stateless ID nodes mint sortable 64-bit IDs from timestamp + worker-id + sequence; a registry hands out unique worker-ids and clocks are kept in sync.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 5000 }],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 210, 190],
      ['n1', 'SERVER', 'ID Node 1', 390, 90],
      ['n2', 'SERVER', 'ID Node 2', 390, 290],
      ['reg', 'POSTGRESQL', 'Worker-ID Registry', 580, 90],
      ['ntp', 'SERVER', 'Time Sync', 580, 290],
    ],
    [['client', 'lb'], ['lb', 'n1'], ['lb', 'n2'], ['n1', 'reg'], ['n2', 'reg'], ['n2', 'ntp']],
  ),
  'object-storage-service-amazon-s3': build(
    'An API tier authenticates and routes; a placement/metadata service maps object keys to storage nodes where bytes are stored redundantly across block volumes.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 2000 }],
      ['api', 'API_GATEWAY', 'S3 API', 190, 190],
      ['lb', 'LOAD_BALANCER', 'Load Balancer', 330, 190],
      ['ctrl', 'SERVER', 'Metadata / Placement', 480, 190],
      ['meta', 'CASSANDRA', 'Object Index', 650, 80],
      ['d1', 'BLOCK_STORAGE', 'Storage Node A', 650, 200],
      ['d2', 'BLOCK_STORAGE', 'Storage Node B', 650, 320],
    ],
    [['client', 'api'], ['api', 'lb'], ['lb', 'ctrl'], ['ctrl', 'meta'], ['ctrl', 'd1'], ['ctrl', 'd2']],
  ),
  'yelp-local-business-search': build(
    'Search hits an in-memory geo index for nearby candidates, joins business data and reviews from durable stores, and serves photos from a CDN.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 1500 }],
      ['api', 'API_GATEWAY', 'API Gateway', 190, 190],
      ['svc', 'SERVER', 'Search Svc', 340, 190],
      ['idx', 'REDIS', 'Geo Index', 510, 70],
      ['db', 'POSTGRESQL', 'Business DB', 510, 190],
      ['rev', 'CASSANDRA', 'Reviews', 510, 310],
      ['cdn', 'CDN', 'Photos', 230, 320],
    ],
    [['client', 'api'], ['api', 'svc'], ['svc', 'idx'], ['svc', 'db'], ['svc', 'rev'], ['client', 'cdn']],
  ),
  'spotify-audio-streaming': build(
    'Catalog/metadata is cache-first over a library DB; audio files are served from a CDN backed by object storage so the origin is rarely touched.',
    [
      ['client', 'CLIENT', 'Player', 40, 190, { qps: 1200 }],
      ['api', 'API_GATEWAY', 'API', 190, 90],
      ['meta', 'SERVER', 'Catalog Svc', 340, 90],
      ['cache', 'REDIS', 'Metadata Cache', 500, 70],
      ['db', 'POSTGRESQL', 'Library DB', 500, 190],
      ['cdn', 'CDN', 'Audio CDN', 230, 300],
      ['s3', 'S3_BUCKET', 'Audio Store', 430, 300],
    ],
    [['client', 'api'], ['api', 'meta'], ['meta', 'cache'], ['meta', 'db'], ['client', 'cdn'], ['cdn', 's3']],
  ),
  'distributed-key-value-store': build(
    'A coordinator routes each key to its owning partition; every partition is replicated N ways (RF3) with a WAL + SSTables on durable volumes for recovery.',
    [
      ['client', 'CLIENT', 'Client', 40, 200, { qps: 4000 }],
      ['coord', 'LOAD_BALANCER', 'Coordinator', 210, 200],
      ['n1', 'CASSANDRA', 'Node A (RF3)', 400, 70],
      ['n2', 'CASSANDRA', 'Node B (RF3)', 400, 200],
      ['n3', 'CASSANDRA', 'Node C (RF3)', 400, 330],
      ['wal', 'EBS_VOLUME', 'WAL / SSTables', 600, 200],
    ],
    [['client', 'coord'], ['coord', 'n1'], ['coord', 'n2'], ['coord', 'n3'], ['n1', 'wal'], ['n2', 'wal'], ['n3', 'wal']],
  ),
  'nearby-friends': build(
    'Clients stream location over WebSockets; a proximity service updates an in-memory geo index, publishes updates to subscribers, and archives history.',
    [
      ['client', 'CLIENT', 'Client', 40, 190, { qps: 3000, protocol: 'WSS' }],
      ['gw', 'API_GATEWAY', 'WS Gateway', 200, 190],
      ['svc', 'SERVER', 'Proximity Svc', 360, 190],
      ['geo', 'REDIS', 'Geo Index', 540, 70],
      ['pub', 'KAFKA', 'Location Pub/Sub', 540, 190],
      ['db', 'CASSANDRA', 'Location History', 540, 310],
    ],
    [['client', 'gw'], ['gw', 'svc'], ['svc', 'geo'], ['svc', 'pub'], ['svc', 'db']],
  ),
  'metrics-monitoring-alerting': build(
    'Agents push metrics into an ingest tier feeding a time-series DB and a stream; an evaluator fires alerts on rules, dashboards read the TSDB, and long-term data rolls off.',
    [
      ['agents', 'CLIENT', 'Agents / Exporters', 40, 190, { qps: 6000 }],
      ['gw', 'API_GATEWAY', 'Ingest', 200, 190],
      ['tsdb', 'PROMETHEUS', 'TSDB', 360, 90],
      ['stream', 'KAFKA', 'Metrics Stream', 360, 300],
      ['rules', 'SERVER', 'Alert Evaluator', 540, 70],
      ['graf', 'GRAFANA', 'Dashboards', 540, 190],
      ['store', 'CASSANDRA', 'Long-term Store', 540, 320],
    ],
    [['agents', 'gw'], ['gw', 'tsdb'], ['gw', 'stream'], ['tsdb', 'rules'], ['tsdb', 'graf'], ['stream', 'store']],
  ),
};

export function getRefArch(topic: TopicId, slug?: string): RefArch {
  if (slug && PROBLEM_REF_ARCH[slug]) return PROBLEM_REF_ARCH[slug];
  return REF_ARCH[topic] ?? REF_ARCH.generic;
}

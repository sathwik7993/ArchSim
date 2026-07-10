import { DEFAULT_PROPERTIES } from '../types/graph';
import type { CanvasLink, CanvasNode, ComponentType } from '../types/graph';

// ---------------------------------------------------------------------------
// Phase 7 — curated starter blueprints.
//
// Each template is a ready-to-simulate architecture built from real component
// types with sensible property overrides. Students can load one, run traffic
// immediately, and learn by tweaking a working design rather than a blank page.
// ---------------------------------------------------------------------------

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Template {
  id: string;
  name: string;
  tagline: string;
  difficulty: Difficulty;
  tags: string[];
  nodes: CanvasNode[];
  links: CanvasLink[];
}

type Props = Record<string, string | number | boolean>;

function n(id: string, type: ComponentType, label: string, x: number, y: number, props: Props = {}): CanvasNode {
  return { id, type, label, position: { x, y }, properties: { ...DEFAULT_PROPERTIES[type], ...props } };
}

function e(source: string, target: string, props: Partial<CanvasLink['properties']> = {}): CanvasLink {
  return { id: `l-${source}-${target}`, source, target, properties: { latencyMs: 4, bandwidthGbps: 10, ...props } };
}

// --- URL Shortener --------------------------------------------------------
const urlShortener: Template = {
  id: 'url-shortener',
  name: 'URL Shortener',
  tagline: 'Read-heavy key/value service with a cache-aside redirect path.',
  difficulty: 'Beginner',
  tags: ['Cache-aside', 'Key/Value', 'Read-heavy'],
  nodes: [
    n('client', 'CLIENT', 'Client', 80, 280, { qps: 400 }),
    n('api', 'API_GATEWAY', 'API Gateway', 260, 280, { rate_limit_rps: 5000 }),
    n('lb', 'LOAD_BALANCER', 'Load Balancer', 440, 280),
    n('app1', 'SERVER', 'App Server 1', 620, 180, { cpu_cores: 4 }),
    n('app2', 'SERVER', 'App Server 2', 620, 380, { cpu_cores: 4 }),
    n('redis', 'REDIS', 'Redis (hot links)', 820, 160, { maxmemory_mb: 1024 }),
    n('pg', 'POSTGRESQL', 'PostgreSQL (mappings)', 820, 400, { storage_gb: 100, replication: true }),
  ],
  links: [
    e('client', 'api', { latencyMs: 20, protocol: 'HTTPS', encrypted: true }),
    e('api', 'lb'), e('lb', 'app1'), e('lb', 'app2'),
    e('app1', 'redis'), e('app2', 'redis'),
    e('app1', 'pg'), e('app2', 'pg'),
  ],
};

// --- Chat / Messaging -----------------------------------------------------
const chatApp: Template = {
  id: 'chat-app',
  name: 'Real-time Chat',
  tagline: 'WebSocket fan-out with Redis pub/sub and durable message history.',
  difficulty: 'Intermediate',
  tags: ['WebSockets', 'Pub/Sub', 'Fan-out'],
  nodes: [
    n('client', 'CLIENT', 'Client', 80, 280, { qps: 600, protocol: 'WSS' }),
    n('api', 'API_GATEWAY', 'WS Gateway', 260, 280, { rate_limit_rps: 8000 }),
    n('lb', 'LOAD_BALANCER', 'Load Balancer', 440, 280, { algorithm: 'least_conn' }),
    n('ws1', 'SERVER', 'Chat Server 1', 640, 140),
    n('ws2', 'SERVER', 'Chat Server 2', 640, 420),
    n('redis', 'REDIS', 'Redis (presence/pubsub)', 860, 120),
    n('kafka', 'KAFKA', 'Kafka (fan-out)', 860, 280),
    n('mongo', 'MONGODB', 'MongoDB (history)', 860, 440),
  ],
  links: [
    e('client', 'api', { latencyMs: 15, protocol: 'WSS', encrypted: true }),
    e('api', 'lb'), e('lb', 'ws1'), e('lb', 'ws2'),
    e('ws1', 'redis'), e('ws2', 'redis'),
    e('ws1', 'kafka'), e('ws2', 'kafka'),
    e('ws1', 'mongo'), e('ws2', 'mongo'),
  ],
};

// --- E-Commerce -----------------------------------------------------------
const ecommerce: Template = {
  id: 'ecommerce',
  name: 'E-Commerce Platform',
  tagline: 'Storefront with CDN assets, session cache, orders DB and an event bus.',
  difficulty: 'Intermediate',
  tags: ['CDN', 'Sessions', 'Event-driven'],
  nodes: [
    n('client', 'CLIENT', 'Client', 60, 300, { qps: 500 }),
    n('cdn', 'CDN', 'CDN', 240, 140),
    n('s3', 'S3_BUCKET', 'Product Images', 440, 120),
    n('api', 'API_GATEWAY', 'API Gateway', 260, 320),
    n('lb', 'LOAD_BALANCER', 'Load Balancer', 460, 320),
    n('web1', 'SERVER', 'Web Server 1', 660, 220),
    n('web2', 'SERVER', 'Web Server 2', 660, 440),
    n('redis', 'REDIS', 'Redis (cart/session)', 880, 180),
    n('pg', 'POSTGRESQL', 'PostgreSQL (orders)', 880, 340, { storage_gb: 200, replication: true }),
    n('kafka', 'KAFKA', 'Kafka (order events)', 880, 500),
  ],
  links: [
    e('client', 'cdn', { latencyMs: 12 }),
    e('client', 'api', { latencyMs: 20, protocol: 'HTTPS', encrypted: true }),
    e('cdn', 's3'),
    e('api', 'lb'), e('lb', 'web1'), e('lb', 'web2'),
    e('web1', 'redis'), e('web2', 'redis'),
    e('web1', 'pg'), e('web2', 'pg'),
    e('web1', 'kafka'), e('web2', 'kafka'),
  ],
};

// --- Video Streaming ------------------------------------------------------
const videoStreaming: Template = {
  id: 'video-streaming',
  name: 'Video Streaming',
  tagline: 'CDN-fronted delivery from object storage with a cached metadata API.',
  difficulty: 'Advanced',
  tags: ['CDN', 'Object storage', 'High-bandwidth'],
  nodes: [
    n('client', 'CLIENT', 'Client', 60, 280, { qps: 900 }),
    n('dns', 'DNS', 'DNS', 240, 120),
    n('cdn', 'CDN', 'CDN (edge)', 440, 140, { edge_locations: 120 }),
    n('s3', 'S3_BUCKET', 'Video Origin', 660, 120, { storage_class: 'STANDARD' }),
    n('api', 'API_GATEWAY', 'Metadata API', 260, 340),
    n('lb', 'LOAD_BALANCER', 'Load Balancer', 460, 360),
    n('app1', 'SERVER', 'Metadata Svc 1', 660, 300),
    n('app2', 'SERVER', 'Metadata Svc 2', 660, 480),
    n('redis', 'REDIS', 'Redis (metadata)', 880, 300),
    n('pg', 'POSTGRESQL', 'PostgreSQL', 880, 480, { replication: true }),
  ],
  links: [
    e('client', 'dns', { latencyMs: 8 }),
    e('client', 'cdn', { latencyMs: 10, bandwidthGbps: 40 }),
    e('cdn', 's3', { bandwidthGbps: 40 }),
    e('client', 'api', { latencyMs: 22, protocol: 'HTTPS', encrypted: true }),
    e('api', 'lb'), e('lb', 'app1'), e('lb', 'app2'),
    e('app1', 'redis'), e('app2', 'redis'),
    e('app1', 'pg'), e('app2', 'pg'),
  ],
};

// --- Rate-limited API platform -------------------------------------------
const apiPlatform: Template = {
  id: 'api-platform',
  name: 'Rate-Limited API',
  tagline: 'WAF + gateway with Redis-backed token buckets in front of services.',
  difficulty: 'Intermediate',
  tags: ['Rate limiting', 'WAF', 'Token bucket'],
  nodes: [
    n('client', 'CLIENT', 'Client', 60, 300, { qps: 1200 }),
    n('waf', 'WAF', 'WAF', 240, 160, { rate_limit: 5000 }),
    n('api', 'API_GATEWAY', 'API Gateway', 280, 320, { rate_limit_rps: 3000 }),
    n('redis', 'REDIS', 'Redis (counters)', 480, 160),
    n('lb', 'LOAD_BALANCER', 'Load Balancer', 480, 340),
    n('svc1', 'SERVER', 'Service 1', 680, 240),
    n('svc2', 'SERVER', 'Service 2', 680, 460),
    n('pg', 'POSTGRESQL', 'PostgreSQL', 880, 350, { replication: true }),
  ],
  links: [
    e('client', 'waf', { latencyMs: 10, encrypted: true }),
    e('waf', 'api'),
    e('api', 'redis'),
    e('api', 'lb'), e('lb', 'svc1'), e('lb', 'svc2'),
    e('svc1', 'pg'), e('svc2', 'pg'),
  ],
};

// --- Social news feed -----------------------------------------------------
const newsFeed: Template = {
  id: 'news-feed',
  name: 'Social News Feed',
  tagline: 'Fan-out-on-write timeline with a feed cache and wide-column store.',
  difficulty: 'Advanced',
  tags: ['Fan-out-on-write', 'Timeline', 'Wide-column'],
  nodes: [
    n('client', 'CLIENT', 'Client', 60, 300, { qps: 700 }),
    n('api', 'API_GATEWAY', 'API Gateway', 240, 300),
    n('lb', 'LOAD_BALANCER', 'Load Balancer', 420, 300),
    n('feed1', 'SERVER', 'Feed Service 1', 620, 180),
    n('feed2', 'SERVER', 'Feed Service 2', 620, 420),
    n('redis', 'REDIS', 'Redis (feed cache)', 840, 140, { maxmemory_mb: 4096 }),
    n('cass', 'CASSANDRA', 'Cassandra (posts)', 840, 300, { num_nodes: 6 }),
    n('kafka', 'KAFKA', 'Kafka (fan-out)', 840, 460),
  ],
  links: [
    e('client', 'api', { latencyMs: 18, protocol: 'HTTPS', encrypted: true }),
    e('api', 'lb'), e('lb', 'feed1'), e('lb', 'feed2'),
    e('feed1', 'redis'), e('feed2', 'redis'),
    e('feed1', 'cass'), e('feed2', 'cass'),
    e('feed1', 'kafka'), e('feed2', 'kafka'),
  ],
};

export const TEMPLATES: Template[] = [
  urlShortener,
  chatApp,
  ecommerce,
  apiPlatform,
  videoStreaming,
  newsFeed,
];

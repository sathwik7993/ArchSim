// ---------------------------------------------------------------------------
// Phase 8 — topic taxonomy.
//
// The source JSON has no topic/company tags, so we derive a topic for every
// problem with a deterministic, ordered keyword classifier. The topic drives
// both the library filters and which solution playbook a problem uses.
// ---------------------------------------------------------------------------

export type TopicId =
  | 'files'
  | 'streaming'
  | 'messaging'
  | 'collab'
  | 'social'
  | 'geo'
  | 'booking'
  | 'commerce'
  | 'search'
  | 'infra-net'
  | 'notifications'
  | 'analytics'
  | 'jobs'
  | 'datastores'
  | 'security'
  | 'lowlevel'
  | 'primitives'
  | 'generic';

export interface TopicMeta {
  id: TopicId;
  label: string;
  blurb: string;
  accent: string; // hex, used for the chip
}

export const TOPICS: TopicMeta[] = [
  { id: 'files', label: 'Files & Blob Storage', accent: '#c4820e', blurb: 'Uploading, storing and syncing large files and media blobs.' },
  { id: 'streaming', label: 'Media Streaming', accent: '#e0556e', blurb: 'Delivering audio/video at scale with CDNs and transcoding.' },
  { id: 'messaging', label: 'Chat & Messaging', accent: '#2a9d8f', blurb: 'Real-time delivery, presence and fan-out for conversations.' },
  { id: 'collab', label: 'Real-time Collaboration', accent: '#4c8dff', blurb: 'Concurrent editing with conflict resolution (OT / CRDT).' },
  { id: 'social', label: 'Social & Content', accent: '#8a6bff', blurb: 'Feeds, timelines and user-generated content platforms.' },
  { id: 'geo', label: 'Geospatial & Location', accent: '#35c988', blurb: 'Proximity search, matching and real-time location tracking.' },
  { id: 'booking', label: 'Booking & Reservations', accent: '#f6b23c', blurb: 'Inventory, concurrency and fairness under high contention.' },
  { id: 'commerce', label: 'Commerce & Payments', accent: '#e8a13c', blurb: 'Money movement, ledgers, correctness and fraud.' },
  { id: 'search', label: 'Search & Recommendation', accent: '#5b8cff', blurb: 'Indexing, ranking, crawling and relevance.' },
  { id: 'infra-net', label: 'Networking & Edge', accent: '#60a5fa', blurb: 'Traffic routing, CDNs, DNS and protection at the edge.' },
  { id: 'notifications', label: 'Notifications & Email', accent: '#c084fc', blurb: 'Reliable, deduplicated delivery to millions of endpoints.' },
  { id: 'analytics', label: 'Analytics & Observability', accent: '#f59e0b', blurb: 'Streaming aggregation, metrics, logs and traces.' },
  { id: 'jobs', label: 'Jobs & Orchestration', accent: '#2dd4bf', blurb: 'Scheduling, pipelines and running untrusted workloads.' },
  { id: 'datastores', label: 'Databases & Storage Engines', accent: '#7b4a8e', blurb: 'Storage engines, consensus and distributed data.' },
  { id: 'security', label: 'Security & Identity', accent: '#f87171', blurb: 'Auth, secrets, signatures and trust.' },
  { id: 'lowlevel', label: 'Language & Runtime Internals', accent: '#9aa4b8', blurb: 'GC, VMs, browsers and runtimes — single-machine systems.' },
  { id: 'primitives', label: 'Distributed Primitives', accent: '#6f9cf5', blurb: 'Building blocks: IDs, counters, caches, locks, rate limits.' },
  { id: 'generic', label: 'General System Design', accent: '#9aa4b8', blurb: 'Applies the core system-design framework end to end.' },
];

export const TOPIC_META: Record<TopicId, TopicMeta> = Object.fromEntries(
  TOPICS.map((t) => [t.id, t])
) as Record<TopicId, TopicMeta>;

// Ordered rules — first match wins. More specific / lower-level topics are
// listed first so a term like "search" only falls through to the search topic
// when a geospatial or social rule hasn't already claimed the problem.
const RULES: Array<{ topic: TopicId; kw: string[] }> = [
  { topic: 'lowlevel', kw: ['garbage collector', 'jvm', 'virtual machine (jvm', 'browser engine', 'javascript runtime', 'node.js', 'b-tree storage', 'lsm tree'] },
  { topic: 'datastores', kw: ['distributed key-value', 'key-value store', 'distributed sql', 'cockroachdb', 'graph database', 'neo4j', 'transaction manager', 'message queue', 'kafka', 'time-series database', 'influxdb', 'vector database', 'pinecone', 'data lakehouse', 'delta lake', 'namenode', 'dfs metadata', 'distributed file system', 'storage engine', 'change data capture', 'cdc'] },
  { topic: 'analytics', kw: ['ad click', 'top-k', 'trending', 'leaderboard', 'metrics monitoring', 'monitoring & alerting', 'distributed logging', 'distributed tracing', 'jaeger', 'crash reporting', 'sentry', 'privacy-preserving analytics', 'analytics system', 'iot fleet', 'smart home', 'mapreduce', 'weather forecast'] },
  { topic: 'collab', kw: ['collaborative', 'google docs', 'whiteboard', 'miro', 'spreadsheet', 'canva', 'codesandbox', 'online ide'] },
  { topic: 'jobs', kw: ['job scheduler', 'workflow orchestration', 'airflow', 'ci/cd', 'build system', 'bazel', 'serverless', 'aws lambda', 'platform as a service', 'heroku', 'distributed job', 'llm serving', 'chatgpt'] },
  { topic: 'infra-net', kw: ['rate limiter', 'load balancer', 'nginx', 'cdn', 'content delivery', 'domain name system', '(dns)', 'web application firewall', '(waf)', 'ddos', 'service mesh', 'istio', 'virtual private network', 'wireguard', 'onion routing', '(tor)', 'traffic control'] },
  { topic: 'security', kw: ['identity provider', 'auth0', 'password manager', 'lastpass', 'secrets management', 'vault', 'digital signature', 'docusign', 'two-factor', 'authy', 'malware', 'captcha', 'blockchain', 'bitcoin', 'ledger'] },
  { topic: 'notifications', kw: ['push notification', 'email service', 'gmail', 'newsletter', 'substack', 'notification'] },
  { topic: 'streaming', kw: ['youtube', 'video streaming', 'spotify', 'audio streaming', 'live streaming', 'twitch', 'transcoding', 'zoom', 'video conferencing', 'podcast'] },
  { topic: 'messaging', kw: ['whatsapp', 'real-time chat', 'discord', 'live comments', 'messenger', 'slack', 'caller identification', 'truecaller'] },
  { topic: 'geo', kw: ['uber', 'ride hailing', 'lyft', 'bike/scooter', 'scooter', 'gopuff', 'doordash', 'zepto', 'quick commerce', 'food delivery', 'delivery service', 'google maps', 'location service', 'location history', 'nearby', 'tinder', 'location-based', 'strava', 'fitness', 'yelp', 'restaurant review', 'business search', 'urbancompany', 'home services'] },
  { topic: 'booking', kw: ['airbnb', 'hotel booking', 'ticketmaster', 'ticket booking', 'irctc', 'railway', 'auction', 'flash sale', 'waiting room', 'calendar', 'chess', 'reservation'] },
  { topic: 'commerce', kw: ['e-commerce', 'amazon (', 'payment', 'digital wallet', 'robinhood', 'stock trading', 'stock exchange', 'splitwise', 'expense', 'nft', 'opensea', 'crowdfunding', 'donation', 'ad bidding', 'fraud detection', 'supply chain', 'price tracking', 'price comparison'] },
  { topic: 'search', kw: ['web search', 'google search', 'typeahead', 'autocomplete', 'suggestion', 'web crawler', 'crawler', 'recommendation', 'plagiarism', 'translation', 'news aggregator', 'post search', 'digital library'] },
  { topic: 'files', kw: ['dropbox', 'file storage', 'cloud file', 'image hosting', 'imgur', 'google photos', 'photo storage', 'object storage', 'amazon s3', 's3', 'pastebin', 'peer-to-peer file', 'bittorrent', 'file sharing'] },
  { topic: 'social', kw: ['news feed', 'instagram', 'photo sharing', 'reddit', 'forum', 'pinterest', 'linkedin', 'professional network', 'blogging', 'medium', 'wikipedia', 'knowledge base', 'stackoverflow', 'q&a', 'fantasy sports', 'cricinfo', 'sports scoring', 'coursera', 'learning platform', 'online judge', 'leetcode', 'telemedicine', 'github', 'version control'] },
  { topic: 'primitives', kw: ['url shortener', 'unique id', 'snowflake', 'distributed cache', 'redis-like', 'distributed counter', 'distributed configuration', 'etcd', 'distributed lock', 'qr code', 'to-do', 'parking lot', 'poll', 'voting', 'survey', 'feature flag'] },
];

// We classify on the problem NAME only. Names here are highly descriptive
// (e.g. "YouTube / Video Streaming", "CDN (Content Delivery Network)"), whereas
// summaries mention supporting tech ("served via a CDN", "cached in Redis") that
// would otherwise pull media/social problems into the wrong infra bucket.
export function classifyTopic(name: string): TopicId {
  const hay = name.toLowerCase();
  for (const rule of RULES) {
    if (rule.kw.some((k) => hay.includes(k))) return rule.topic;
  }
  return 'generic';
}

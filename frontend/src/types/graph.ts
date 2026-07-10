/* ──────────────────────── Component types ──────────────────────── */

export type ComponentCategory =
  | 'COMPUTE'
  | 'NETWORKING'
  | 'STORAGE'
  | 'DATABASE'
  | 'CACHE'
  | 'MESSAGING'
  | 'MONITORING'
  | 'SECURITY'
  | 'KUBERNETES'
  | 'AWS';

export type ComponentType =
  // Compute
  | 'CLIENT'
  | 'SERVER'
  | 'CONTAINER'
  | 'LAMBDA'
  | 'VM'
  // Networking
  | 'API_GATEWAY'
  | 'LOAD_BALANCER'
  | 'CDN'
  | 'DNS'
  | 'FIREWALL'
  // Storage
  | 'S3_BUCKET'
  | 'EBS_VOLUME'
  | 'BLOCK_STORAGE'
  // Database
  | 'POSTGRESQL'
  | 'MYSQL'
  | 'MONGODB'
  | 'DYNAMODB'
  | 'CASSANDRA'
  // Cache
  | 'REDIS'
  | 'MEMCACHED'
  // Messaging
  | 'KAFKA'
  | 'RABBITMQ'
  | 'SQS'
  | 'SNS'
  // Monitoring
  | 'PROMETHEUS'
  | 'GRAFANA'
  | 'CLOUDWATCH'
  // Security
  | 'WAF'
  | 'IAM'
  | 'SECRETS_MANAGER'
  // Kubernetes
  | 'K8S_CLUSTER'
  | 'K8S_DEPLOYMENT'
  | 'K8S_SERVICE'
  | 'K8S_INGRESS';

export const CATEGORY_MAP: Record<ComponentType, ComponentCategory> = {
  CLIENT: 'COMPUTE',
  SERVER: 'COMPUTE',
  CONTAINER: 'COMPUTE',
  LAMBDA: 'COMPUTE',
  VM: 'COMPUTE',
  API_GATEWAY: 'NETWORKING',
  LOAD_BALANCER: 'NETWORKING',
  CDN: 'NETWORKING',
  DNS: 'NETWORKING',
  FIREWALL: 'NETWORKING',
  S3_BUCKET: 'STORAGE',
  EBS_VOLUME: 'STORAGE',
  BLOCK_STORAGE: 'STORAGE',
  POSTGRESQL: 'DATABASE',
  MYSQL: 'DATABASE',
  MONGODB: 'DATABASE',
  DYNAMODB: 'DATABASE',
  CASSANDRA: 'DATABASE',
  REDIS: 'CACHE',
  MEMCACHED: 'CACHE',
  KAFKA: 'MESSAGING',
  RABBITMQ: 'MESSAGING',
  SQS: 'MESSAGING',
  SNS: 'MESSAGING',
  PROMETHEUS: 'MONITORING',
  GRAFANA: 'MONITORING',
  CLOUDWATCH: 'MONITORING',
  WAF: 'SECURITY',
  IAM: 'SECURITY',
  SECRETS_MANAGER: 'SECURITY',
  K8S_CLUSTER: 'KUBERNETES',
  K8S_DEPLOYMENT: 'KUBERNETES',
  K8S_SERVICE: 'KUBERNETES',
  K8S_INGRESS: 'KUBERNETES',
};

export const CATEGORY_COLOR: Record<ComponentCategory, string> = {
  COMPUTE: '#4a7c59',      // Forest green
  NETWORKING: '#2e5090',   // Navy blue
  STORAGE: '#c4820e',      // Aged gold
  DATABASE: '#7b4a8e',     // Plum
  CACHE: '#c45b4a',        // Terracotta
  MESSAGING: '#2a7b6f',    // Teal
  MONITORING: '#c47e2a',   // Amber
  SECURITY: '#8b3a3a',     // Dark red
  KUBERNETES: '#326ce5',   // K8s blue
  AWS: '#c4760e',          // AWS orange
};

export const CATEGORY_ICON: Record<ComponentCategory, string> = {
  COMPUTE: '⚙',
  NETWORKING: '🔗',
  STORAGE: '📦',
  DATABASE: '🗄',
  CACHE: '⚡',
  MESSAGING: '✉',
  MONITORING: '📊',
  SECURITY: '🛡',
  KUBERNETES: '☸',
  AWS: '☁',
};

export const COMPONENT_ICON: Record<ComponentType, string> = {
  CLIENT: '💻',
  SERVER: '🖥',
  CONTAINER: '📦',
  LAMBDA: 'λ',
  VM: '🖥',
  API_GATEWAY: '🚪',
  LOAD_BALANCER: '⚖',
  CDN: '🌐',
  DNS: '🔤',
  FIREWALL: '🧱',
  S3_BUCKET: '🪣',
  EBS_VOLUME: '💾',
  BLOCK_STORAGE: '💿',
  POSTGRESQL: '🐘',
  MYSQL: '🐬',
  MONGODB: '🍃',
  DYNAMODB: '⚡',
  CASSANDRA: '👁',
  REDIS: '🔴',
  MEMCACHED: '🧊',
  KAFKA: '📡',
  RABBITMQ: '🐰',
  SQS: '📬',
  SNS: '📢',
  PROMETHEUS: '🔥',
  GRAFANA: '📈',
  CLOUDWATCH: '👀',
  WAF: '🛡',
  IAM: '🔑',
  SECRETS_MANAGER: '🔒',
  K8S_CLUSTER: '☸',
  K8S_DEPLOYMENT: '🚀',
  K8S_SERVICE: '🔌',
  K8S_INGRESS: '🚏',
};

/* ──────────────────────── Default Properties ──────────────────────── */

export const DEFAULT_PROPERTIES: Record<ComponentType, Record<string, string | number | boolean>> = {
  CLIENT: { qps: 100, protocol: 'HTTPS', timeout_ms: 5000 },
  SERVER: { cpu_cores: 4, memory_gb: 16, os: 'Linux', auto_scaling: false },
  CONTAINER: { image: 'nginx:latest', cpu_limit: 2, memory_limit: 512, replicas: 1 },
  LAMBDA: { runtime: 'nodejs18.x', memory_mb: 256, timeout_seconds: 30, concurrency_limit: 100 },
  VM: { instance_type: 't3.medium', cpu_cores: 2, memory_gb: 4 },
  API_GATEWAY: { rate_limit_rps: 1000, auth_type: 'JWT', cors_enabled: true },
  LOAD_BALANCER: { algorithm: 'round_robin', health_check_interval: 30, max_connections: 10000 },
  CDN: { cache_ttl_seconds: 3600, edge_locations: 50 },
  DNS: { ttl: 300, routing_policy: 'simple' },
  FIREWALL: { default_action: 'deny', max_rules: 100 },
  S3_BUCKET: { versioning: true, encryption: 'AES-256', storage_class: 'STANDARD' },
  EBS_VOLUME: { volume_type: 'gp3', size_gb: 100, iops: 3000 },
  BLOCK_STORAGE: { size_gb: 50, iops: 1000 },
  POSTGRESQL: { version: '16', max_connections: 100, storage_gb: 50, replication: false },
  MYSQL: { version: '8.0', max_connections: 100, storage_gb: 50 },
  MONGODB: { version: '7.0', storage_engine: 'WiredTiger', replica_set_members: 3 },
  DYNAMODB: { read_capacity: 5, write_capacity: 5, billing_mode: 'PROVISIONED' },
  CASSANDRA: { replication_factor: 3, consistency_level: 'QUORUM', num_nodes: 3 },
  REDIS: { maxmemory_mb: 256, eviction_policy: 'allkeys-lru', cluster_mode: false },
  MEMCACHED: { memory_mb: 256, max_connections: 1024, threads: 4 },
  KAFKA: { brokers: 3, partitions: 12, replication_factor: 3, retention_hours: 168 },
  RABBITMQ: { max_message_size_kb: 128, vhost: '/', prefetch_count: 10 },
  SQS: { queue_type: 'standard', visibility_timeout: 30, max_receive_count: 3 },
  SNS: { message_filtering: false },
  PROMETHEUS: { scrape_interval: 15, retention_days: 15 },
  GRAFANA: { dashboards: 0, data_sources: 1 },
  CLOUDWATCH: { log_retention_days: 30 },
  WAF: { rate_limit: 2000 },
  IAM: { mfa_enabled: true },
  SECRETS_MANAGER: { rotation_enabled: true, rotation_days: 30 },
  K8S_CLUSTER: { version: '1.28', node_count: 3, cni_plugin: 'calico' },
  K8S_DEPLOYMENT: { replicas: 3, strategy: 'RollingUpdate', cpu_request: 0.5, memory_request: 256 },
  K8S_SERVICE: { type: 'ClusterIP', port: 80, target_port: 8080 },
  K8S_INGRESS: { tls_enabled: true, path_type: 'Prefix' },
};

/* ──────────────────────── Palette definition ──────────────────────── */

export interface PaletteCategory {
  category: ComponentCategory;
  label: string;
  types: ComponentType[];
}

export const PALETTE: PaletteCategory[] = [
  { category: 'COMPUTE', label: 'Compute', types: ['CLIENT', 'SERVER', 'CONTAINER', 'LAMBDA', 'VM'] },
  { category: 'NETWORKING', label: 'Networking', types: ['API_GATEWAY', 'LOAD_BALANCER', 'CDN', 'DNS', 'FIREWALL'] },
  { category: 'STORAGE', label: 'Storage', types: ['S3_BUCKET', 'EBS_VOLUME', 'BLOCK_STORAGE'] },
  { category: 'DATABASE', label: 'Database', types: ['POSTGRESQL', 'MYSQL', 'MONGODB', 'DYNAMODB', 'CASSANDRA'] },
  { category: 'CACHE', label: 'Cache', types: ['REDIS', 'MEMCACHED'] },
  { category: 'MESSAGING', label: 'Messaging', types: ['KAFKA', 'RABBITMQ', 'SQS', 'SNS'] },
  { category: 'MONITORING', label: 'Monitoring', types: ['PROMETHEUS', 'GRAFANA', 'CLOUDWATCH'] },
  { category: 'SECURITY', label: 'Security', types: ['WAF', 'IAM', 'SECRETS_MANAGER'] },
  { category: 'KUBERNETES', label: 'Kubernetes', types: ['K8S_CLUSTER', 'K8S_DEPLOYMENT', 'K8S_SERVICE', 'K8S_INGRESS'] },
];

/* ──────────────────────── Canvas data types ──────────────────────── */

export interface CanvasNode {
  id: string;
  type: ComponentType;
  label: string;
  position: { x: number; y: number };
  properties: Record<string, string | number | boolean>;
}

export interface CanvasLink {
  id: string;
  source: string;
  target: string;
  properties: {
    latencyMs: number;
    bandwidthGbps: number;
    protocol?: string;
    encrypted?: boolean;
  };
}

export interface CanvasPayload {
  nodes: CanvasNode[];
  links: CanvasLink[];
  metadata: Record<string, unknown>;
}

export interface ComponentMetric {
  id: string;
  cpuUsage: number;
  ramUsageMb: number;
  qps: number;
  queueDepth: number;
  errorRate: number;
}

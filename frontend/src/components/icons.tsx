import React from 'react';
import type { ComponentCategory, ComponentType } from '../types/graph';

/**
 * Inline SVG icon set for ArchSim components. Icons are stroke-based line art
 * drawn on a 24x24 grid and inherit `currentColor`, so a parent can tint them
 * with the component's category colour. This replaces the previous emoji icons.
 */

interface IconProps {
  type: ComponentType;
  size?: number;
  className?: string;
}

const P = (d: string, key?: number) => (
  <path key={key} d={d} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
);

// Reusable primitives ------------------------------------------------------
const cylinder = [
  P('M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3'),
  P('M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6'),
  P('M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'),
];

const chip = [
  P('M6 6h12v12H6z'),
  P('M9 3v3M12 3v3M15 3v3M9 21v-3M12 21v-3M15 21v-3'),
  P('M3 9h3M3 12h3M3 15h3M21 9h-3M21 12h-3M21 15h-3'),
  P('M9.5 9.5h5v5h-5z'),
];

const ICONS: Record<ComponentType, React.ReactNode> = {
  // ---- Compute ----
  CLIENT: [P('M3 5h18v11H3z'), P('M8 20h8M12 16v4')],
  SERVER: [P('M3 4h18v6H3z'), P('M3 14h18v6H3z'), P('M7 7h.01M7 17h.01'), P('M17 7h1M17 17h1')],
  CONTAINER: [P('M12 3l8 4.5v9L12 21l-8-4.5v-9z'), P('M12 3v9M4 7.5l8 4.5 8-4.5')],
  LAMBDA: [P('M6 20l6-14 2.5 10c.4 1.7 1.3 4 3.5 4'), P('M6 6h4')],
  VM: [P('M3 5h18v14H3z'), P('M3 9h18'), P('M6 7h.01M8.5 7h.01'), P('M7 13h6M7 16h4')],

  // ---- Networking ----
  API_GATEWAY: [P('M4 21V11a8 8 0 0116 0v10'), P('M4 21h16'), P('M9 21v-6a3 3 0 016 0v6')],
  LOAD_BALANCER: [P('M12 3v4M12 11v0M12 11H5v5M12 11h7v5'), P('M12 3.5a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2z'), P('M5 16.5a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2z'), P('M12 16.5a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2z'), P('M19 16.5a1.6 1.6 0 100 3.2 1.6 1.6 0 000-3.2z')],
  CDN: [P('M12 3a9 9 0 100 18 9 9 0 000-18z'), P('M3 12h18'), P('M12 3c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.4-3.8-9s1.3-6.6 3.8-9z')],
  DNS: [P('M4 6h12l4 3-4 3H4z'), P('M4 6v14'), P('M7 9h6')],
  FIREWALL: [P('M3 5h18v14H3z'), P('M3 9.7h18M3 14.3h18'), P('M9 5v4.7M15 9.7v4.6M9 14.3V19M12 5v0M6 9.7v4.6M12 14.3V19')],

  // ---- Storage ----
  S3_BUCKET: [P('M5 6h14l-1.4 13a1.5 1.5 0 01-1.5 1.4H7.9a1.5 1.5 0 01-1.5-1.4z'), P('M4 6h16'), P('M9 10l.5 7M15 10l-.5 7')],
  EBS_VOLUME: [P('M3 7h18v10H3z'), P('M6 11v2M9 11v2'), P('M16 12a1.6 1.6 0 100 .01z'), P('M16 12h.01')],
  BLOCK_STORAGE: [P('M12 3a9 9 0 100 18 9 9 0 000-18z'), P('M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z'), P('M18 8l-3.5 2M6 16l3.5-2')],

  // ---- Database ----
  POSTGRESQL: cylinder,
  MYSQL: cylinder,
  MONGODB: [P('M12 3c3 3.5 4.5 6.8 4.5 10.5A4.5 4.5 0 0112 18a4.5 4.5 0 01-4.5-4.5C7.5 9.8 9 6.5 12 3z'), P('M12 18v3')],
  DYNAMODB: [P('M5 6c0-1.6 3.1-3 7-3s7 1.4 7 3v12c0 1.6-3.1 3-7 3s-7-1.4-7-3z'), P('M5 6c0 1.6 3.1 3 7 3s7-1.4 7-3'), P('M13 9l-3 4h3l-1 4')],
  CASSANDRA: [P('M4 6c0-1.5 3.6-2.6 8-2.6s8 1.1 8 2.6v12c0 1.5-3.6 2.6-8 2.6s-8-1.1-8-2.6z'), P('M4 6c0 1.5 3.6 2.6 8 2.6s8-1.1 8-2.6'), P('M4 12c0 1.5 3.6 2.6 8 2.6s8-1.1 8-2.6')],

  // ---- Cache ----
  REDIS: [P('M3 7.5l9-4 9 4-9 4z'), P('M3 12l9 4 9-4'), P('M3 16.5l9 4 9-4')],
  MEMCACHED: chip,

  // ---- Messaging ----
  KAFKA: [P('M6.2 12a2.4 2.4 0 100 .01z'), P('M6 12h.2'), P('M17.8 6a2.4 2.4 0 100 .01z'), P('M17.7 6h.1'), P('M17.8 18a2.4 2.4 0 100 .01z'), P('M17.7 18h.1'), P('M8.4 11l7.2-4M8.4 13l7.2 4')],
  RABBITMQ: [P('M4 10h5V5a1 1 0 011-1h2a1 1 0 011 1v5h3V7a1 1 0 011-1h2a1 1 0 011 1v11a1 1 0 01-1 1H5a1 1 0 01-1-1z'), P('M7 14h.01')],
  SQS: [P('M4 6h13v4H4z'), P('M4 14h13v4H4z'), P('M20 8h.01M20 16h.01'), P('M19 8h2M19 16h2')],
  SNS: [P('M6 12a2 2 0 100 .01z'), P('M6 12h.1'), P('M17 5.5a2 2 0 100 .01z'), P('M16.9 5.5h.1'), P('M17 18.5a2 2 0 100 .01z'), P('M16.9 18.5h.1'), P('M8 11l7-4M8 13l7 4')],

  // ---- Monitoring ----
  PROMETHEUS: [P('M12 3c1.8 2.4 1.3 4.2.3 5.4C11 10 11 11.4 12 12c1.3-.4 2-1.7 2-3.3 1.8 1.6 3 3.9 3 6.3a5 5 0 01-10 0c0-2 .8-3.6 1.7-5'), P('M8.5 20h7')],
  GRAFANA: [P('M4 4v16h16'), P('M8 15l3-4 3 2.5 4-6')],
  CLOUDWATCH: [P('M3.5 13a8.5 8.5 0 0117 0'), P('M12 13l3.5-2.5'), P('M12 13.2a1.2 1.2 0 100-.01z'), P('M12 13h.01')],

  // ---- Security ----
  WAF: [P('M12 3l7 3v6c0 4.4-3 7.4-7 8.8C8 19.4 5 16.4 5 12V6z'), P('M9 12l2 2 4-4')],
  IAM: [P('M8 9a4 4 0 108 0 4 4 0 00-8 0z'), P('M11 12l7 7'), P('M15.5 15.5l2 2M17.5 17.5l1.5-1.5')],
  SECRETS_MANAGER: [P('M5 11h14v9H5z'), P('M8 11V8a4 4 0 018 0v3'), P('M12 15v2')],

  // ---- Kubernetes ----
  K8S_CLUSTER: [P('M12 3l8 3.6v7.4L12 21l-8-6.9V6.6z'), P('M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z'), P('M12 3v5.5M12 15.5V21M4 7l6 3M20 7l-6 3M6 17l4.5-3M18 17l-4.5-3')],
  K8S_DEPLOYMENT: [P('M12 3c3 2.2 4.5 5.4 4.5 9l-4.5 3-4.5-3c0-3.6 1.5-6.8 4.5-9z'), P('M8 14l-2.5 3.5L9 17M16 14l2.5 3.5L15 17'), P('M12 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z')],
  K8S_SERVICE: [P('M12 9a3 3 0 100 6 3 3 0 000-6z'), P('M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2')],
  K8S_INGRESS: [P('M11 4h9v16h-9'), P('M3 12h11'), P('M9 8l4 4-4 4')],
};

const CATEGORY_ICONS: Record<ComponentCategory, React.ReactNode> = {
  COMPUTE: ICONS.SERVER,
  NETWORKING: ICONS.CDN,
  STORAGE: ICONS.S3_BUCKET,
  DATABASE: cylinder,
  CACHE: ICONS.REDIS,
  MESSAGING: [P('M4 6h16v12H4z'), P('M4 7l8 6 8-6')],
  MONITORING: ICONS.GRAFANA,
  SECURITY: ICONS.WAF,
  KUBERNETES: ICONS.K8S_CLUSTER,
  AWS: [P('M4 15c4 3 12 3 16 0'), P('M18 13l1 2-2 .5')],
};

export function Icon({ type, size = 22, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={type}
    >
      {ICONS[type]}
    </svg>
  );
}

export function CategoryIcon({ category, size = 18, className }: { category: ComponentCategory; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={category}>
      {CATEGORY_ICONS[category]}
    </svg>
  );
}

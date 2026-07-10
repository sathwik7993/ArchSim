import type { TopicId } from './topics';

// ---------------------------------------------------------------------------
// Phase 8 — solution playbooks.
//
// The source index deliberately omits the paywalled article text, so every
// solution here is written independently. Rather than 148 disconnected essays,
// we teach the *method*: a per-topic playbook applies the standard system-design
// framework (requirements → estimation → API/data → high-level design → deep
// dives & edge cases → bottlenecks) to a class of problems. A composer tailors
// it to each specific problem, and flagship problems get bespoke overrides.
//
// The goal is understanding, not copy-paste: hints unlock progressively and the
// full walkthrough is revealed only on a deliberate action in the UI.
// ---------------------------------------------------------------------------

export interface DeepDive {
  title: string;
  body: string;
}

export interface Solution {
  approach: string;
  functional: string[];
  nonFunctional: string[];
  estimation: string[];
  entities: string[];
  architecture: string[];
  deepDives: DeepDive[];
  bottlenecks: string[];
  archsim: string[];
  hints: string[];
}

type Playbook = Solution;

// Shared, method-level guidance every solution inherits at the top.
export const FRAMEWORK: string[] = [
  'Clarify scope first — restate the problem, agree on 3–5 functional requirements, and call out what is explicitly out of scope. Interviewers reward narrowing.',
  'State non-functional targets (scale, latency, availability, consistency) before drawing anything — they justify every later decision.',
  'Do a back-of-envelope estimate (QPS, storage/day, bandwidth) to find where the pressure is: read-heavy, write-heavy, storage-heavy, or fan-out-heavy.',
  'Design the happy path end to end (API → services → data), then go deep on the 2–3 hardest parts. Finish with bottlenecks and how you would scale past them.',
];

const P = (s: Playbook): Playbook => s;

export const PLAYBOOKS: Record<TopicId, Playbook> = {
  // ───────────────────────────── Files & blob storage ─────────────────────
  files: P({
    approach:
      'This is a blob-storage problem: metadata is small and lives in a database, but the bytes are large and belong in object storage fronted by a CDN. The interesting parts are moving big files efficiently, keeping copies in sync, and controlling access without proxying the bytes through your app tier.',
    functional: [
      'Upload and download files (often large, often resumable).',
      'Share files/folders with per-user or link-based access.',
      'Sync changes across a user’s devices (if applicable).',
      'List/browse metadata: names, sizes, versions, folders.',
    ],
    nonFunctional: [
      'Durability is paramount (≥ 11 nines) — never lose a byte; replicate across AZs.',
      'High read throughput and low first-byte latency via edge caching.',
      'Uploads must survive flaky networks (resume, not restart).',
      'Storage cost efficiency (tiering, dedup) at scale.',
    ],
    estimation: [
      'Separate metadata QPS (tiny rows) from blob bandwidth (GB/s) — they scale independently.',
      'Estimate avg file size × uploads/day → storage/day, then × replication factor.',
      'Egress bandwidth usually dominates cost; CDN hit-rate is the key lever.',
    ],
    entities: [
      'File{id, ownerId, name, size, contentHash, storageKey, version, createdAt}',
      'Chunk{fileId, index, hash, size} for large/resumable files',
      'Share{fileId, granteeId|linkToken, permission}',
      'API: initiateUpload → presigned PUT(s) → completeUpload; GET via presigned/CDN URL',
    ],
    architecture: [
      'Clients talk to a metadata service for CRUD; bytes go directly to object storage via pre-signed URLs so app servers never touch file data.',
      'Large files are split into content-addressed chunks uploaded in parallel; completeUpload stitches the manifest.',
      'A CDN fronts downloads; the origin is object storage (e.g., S3-like).',
      'Sync (if needed) uses a per-user change journal that devices poll or subscribe to.',
    ],
    deepDives: [
      { title: 'Resumable & parallel uploads', body: 'Chunk the file client-side (e.g., 4–8 MB), hash each chunk, and upload chunks independently with retries. The server tracks which chunk hashes it already has, so a resumed upload skips completed chunks. Content-addressing also gives you dedup for free.' },
      { title: 'Consistency of sync', body: 'Model sync as an ordered per-user event log (monotonic version/cursor). Devices apply events idempotently. Concurrent edits to the same file need conflict handling — last-writer-wins with version vectors, or keep both copies (“conflicted copy”) rather than silently dropping data.' },
      { title: 'Access control without proxying bytes', body: 'Authorize at the metadata service, then hand back a short-lived pre-signed URL (or signed CDN cookie) scoped to one object and verb. Revocation is bounded by the URL’s TTL — keep it short and re-issue.' },
      { title: 'Cost & durability', body: 'Erasure-code cold data instead of full replication to cut storage cost; tier infrequently-accessed blobs to cheaper storage. Verify durability with background checksums and re-replication when a replica is lost.' },
    ],
    bottlenecks: [
      'Metadata DB hot rows for popular shared files → cache + read replicas.',
      'CDN misses on large cold files → tune TTLs and pre-warm popular content.',
      'Thundering-herd on a viral file → collapse origin fetches (request coalescing).',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'LOAD_BALANCER', 'SERVER', 'S3_BUCKET', 'CDN', 'POSTGRESQL', 'REDIS'],
    hints: [
      'Where do the actual bytes live, and should they ever pass through your application servers?',
      'Split the problem into a small-metadata path and a large-bytes path — they have completely different scaling profiles.',
      'For big files think chunking + content hashing: it unlocks resumable uploads, parallelism, and deduplication all at once.',
    ],
  }),

  // ───────────────────────────── Media streaming ──────────────────────────
  streaming: P({
    approach:
      'Streaming is bandwidth- and CDN-dominated. The upload/ingest path transcodes source media into multiple bitrates/segments; the playback path serves those segments from edge caches using adaptive bitrate. Metadata (catalog, watch state) is a comparatively small database problem.',
    functional: [
      'Ingest/upload media and process it (transcode to multiple renditions).',
      'Stream playback with adaptive bitrate (HLS/DASH segments).',
      'Browse catalog + track playback position / history.',
      'For live: low-latency ingest → package → distribute.',
    ],
    nonFunctional: [
      'Very high egress bandwidth; buffering/rebuffer ratio is the core UX metric.',
      'Global low-latency delivery (edge presence near users).',
      'Elastic, cheap batch transcoding for VOD; low glass-to-glass latency for live.',
      'High availability of playback even if the control plane hiccups.',
    ],
    estimation: [
      'Concurrent streams × bitrate = peak egress; this dwarfs metadata QPS.',
      'CDN offload ratio is the dominant cost lever — origin should serve a tiny fraction.',
      'Transcoding is CPU/GPU-heavy: estimate encode-minutes vs upload hours.',
    ],
    entities: [
      'Asset{id, title, durations, renditions[]}',
      'Segment{assetId, rendition, index, url} (a few seconds each)',
      'PlaybackState{userId, assetId, positionMs}',
      'API: getManifest(assetId) → per-rendition segment lists; segments fetched from CDN',
    ],
    architecture: [
      'Upload → object storage → a transcoding pipeline (queue + worker fleet) produces multiple bitrate renditions chopped into segments + a manifest.',
      'Segments live in object storage and are served through a multi-tier CDN; players fetch a manifest then pull segments, switching bitrate based on measured throughput.',
      'A metadata/catalog service (DB + cache) handles search, recommendations, and watch state.',
      'Live adds a real-time ingest → packager → edge path with short segments/LL-HLS.',
    ],
    deepDives: [
      { title: 'Adaptive bitrate (ABR)', body: 'Encode each title into a ladder of resolutions/bitrates. The player measures bandwidth and buffer health and requests the highest sustainable rendition per segment, stepping down on congestion to avoid rebuffering. Segments are short (2–6 s) so switches are quick.' },
      { title: 'Transcoding pipeline', body: 'Split the source into GOP-aligned chunks and transcode them in parallel across a worker fleet fed by a queue; this turns a long serial encode into a fast fan-out job. Retry failed chunks idempotently and reassemble.' },
      { title: 'CDN strategy', body: 'Popular content should be an edge cache hit almost always; use tiered caches (edge → regional → origin) and request coalescing so a cold-but-popular title doesn’t stampede the origin. Pre-position launches/premieres.' },
      { title: 'Live latency', body: 'For live, tension is latency vs. resilience. Shorter segments and chunked-transfer/LL-HLS cut latency but stress the CDN; a small buffer absorbs jitter. Keep the ingest redundant so a single encoder failure doesn’t drop the stream.' },
    ],
    bottlenecks: [
      'Origin egress during a viral/live spike → CDN offload + coalescing.',
      'Transcoding backlog → autoscale workers off queue depth.',
      'Hot catalog rows → cache aggressively; watch state is write-heavy, batch it.',
    ],
    archsim: ['CLIENT', 'CDN', 'S3_BUCKET', 'API_GATEWAY', 'LOAD_BALANCER', 'SERVER', 'KAFKA', 'POSTGRESQL', 'REDIS'],
    hints: [
      'What fraction of requests should ever reach your origin? Design the CDN tier first.',
      'Playback is a segment-fetching problem — how are segments produced, and how does the player choose quality?',
      'Transcoding is embarrassingly parallel if you chunk the source; use a queue + worker fleet.',
    ],
  }),

  // ───────────────────────────── Chat & messaging ─────────────────────────
  messaging: P({
    approach:
      'Chat is a real-time fan-out problem over persistent connections. The hard parts are routing a message to the recipient’s connection wherever it is, guaranteeing delivery/ordering, handling offline users, and scaling group fan-out — not the storage of messages, which is a simple append.',
    functional: [
      'Send/receive 1:1 and group messages in real time.',
      'Delivery + read receipts and presence (online/typing).',
      'Offline delivery: queue messages until the user reconnects.',
      'Message history and sync across devices.',
    ],
    nonFunctional: [
      'Low end-to-end latency (sub-second) for online users.',
      'At-least-once delivery with ordering per conversation.',
      'Massive numbers of idle persistent connections.',
      'Optional end-to-end encryption.',
    ],
    estimation: [
      'Connections = concurrent users; each gateway box holds tens/hundreds of thousands.',
      'Messages/day and average group size drive fan-out amplification.',
      'Storage is cheap (append-only); the cost is fan-out + connection management.',
    ],
    entities: [
      'Message{id (time-sortable), conversationId, senderId, body, sentAt}',
      'Conversation{id, memberIds[]}, Membership{userId, lastReadMessageId}',
      'ConnectionRegistry: userId → {gatewayNode, connId}',
      'API: WebSocket send/subscribe; REST for history pagination',
    ],
    architecture: [
      'Clients hold a WebSocket to a stateless gateway fleet; a registry (Redis) maps userId → gateway so the system can route a message to the right box.',
      'On send, persist the message, then look up recipients’ gateways and push; if offline, enqueue to a per-user inbox for delivery on reconnect.',
      'Group messages fan out to each member’s connection; large groups fan out asynchronously via a message bus.',
      'A sequence per conversation (or Snowflake-style IDs) gives total ordering for consistent history.',
    ],
    deepDives: [
      { title: 'Routing to the right connection', body: 'Keep a presence/registry keyed by userId with the gateway node holding their socket. Gateways subscribe to a pub/sub channel per node (or per user); the sender publishes and the owning gateway delivers. On disconnect, clear the entry and fall back to the offline inbox.' },
      { title: 'Delivery guarantees & ordering', body: 'Persist before acking the sender (so a crash can’t lose it), deliver at-least-once, and dedupe on the client by message id. Order within a conversation using monotonic ids; do not rely on wall-clock time across senders.' },
      { title: 'Offline & multi-device', body: 'Each device tracks a per-conversation cursor (lastReadMessageId). On reconnect it pulls everything after its cursor. An offline inbox (durable queue per user) buffers messages; prune once all devices have acked.' },
      { title: 'Group fan-out at scale', body: 'Small groups: fan out on write. Very large groups/broadcast: fan out on read or via a durable topic so a single message doesn’t create millions of synchronous pushes. Watch the “celebrity/large-group” amplification just like feed systems.' },
    ],
    bottlenecks: [
      'Connection storms on reconnect (after a deploy/outage) → jittered backoff, connection draining.',
      'Hot registry keys for huge groups → shard membership, async fan-out.',
      'Presence chatter → coalesce and rate-limit typing/last-seen updates.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'LOAD_BALANCER', 'SERVER', 'REDIS', 'KAFKA', 'MONGODB'],
    hints: [
      'Messages are cheap to store — the hard question is: how do you find the recipient’s live connection?',
      'What happens when the recipient is offline, or online on three devices at once?',
      'Contrast fan-out-on-write vs fan-out-on-read for a 100,000-member group.',
    ],
  }),

  // ───────────────────────── Real-time collaboration ──────────────────────
  collab: P({
    approach:
      'Collaborative editing is a concurrency-and-merge problem. Many users mutate shared state simultaneously and must converge to the same result without losing intent. The core decision is the conflict-resolution model: Operational Transformation (OT) or CRDTs, delivered over a low-latency channel.',
    functional: [
      'Multiple users edit shared state concurrently and see each other’s changes live.',
      'Cursors/presence and selection awareness.',
      'Persistence, history/versioning, and offline edits that merge on reconnect.',
      'Access control and sharing.',
    ],
    nonFunctional: [
      'Low latency for local echo; changes converge quickly.',
      'Strong convergence — everyone ends in the same state (no lost updates).',
      'Availability during transient disconnects (offline editing).',
      'Scale to many concurrent editors per document.',
    ],
    estimation: [
      'Ops/sec per active document and concurrent editors per doc matter more than total users.',
      'Op payloads are tiny but frequent — batching and compaction reduce chatter.',
      'History storage grows with edits; snapshot + op-log compaction bounds it.',
    ],
    entities: [
      'Document{id, snapshot, version}',
      'Operation{docId, baseVersion, delta, authorId, seq}',
      'Presence{docId, userId, cursor, selection}',
      'API: subscribe(docId) over WebSocket; submitOp; getSnapshot',
    ],
    architecture: [
      'A per-document coordinator (single writer/owner shard) serializes incoming ops, assigns a sequence, transforms/merges them, and broadcasts the result to all subscribers.',
      'Clients apply changes locally (optimistic) and reconcile against the server sequence, transforming their pending ops.',
      'Periodic snapshots + a trimmed op log give fast load and bounded history.',
      'A pub/sub layer pushes ops and presence to all connected editors.',
    ],
    deepDives: [
      { title: 'OT vs CRDT', body: 'OT transforms an incoming op against concurrent ops so intent is preserved; it usually needs a central server to order ops (simpler on the client, trickier to prove correct). CRDTs make operations commutative/associative so they merge in any order without a central authority — great for offline/P2P but with metadata overhead (tombstones). Pick based on whether you can have a single ordering point.' },
      { title: 'Single-writer coordinator', body: 'Route all ops for a document to one owner shard so ordering is trivial and transforms are local. This is the common OT approach (Google Docs-style). Scale by sharding per document; hand off ownership on failure with a short lease.' },
      { title: 'Offline & reconnect', body: 'Buffer local ops with their base version while offline; on reconnect, transform them forward against everything that happened since the base version, then submit. CRDTs simplify this at the cost of larger state.' },
      { title: 'Presence & compaction', body: 'Presence (cursors) is ephemeral, high-frequency, and lossy — send it out-of-band and don’t persist it. Compact the op log into periodic snapshots so document load and recovery stay fast.' },
    ],
    bottlenecks: [
      'A single hyper-active document → the owner shard is the limit; consider sub-document partitioning.',
      'Op broadcast fan-out to many viewers → pub/sub, and batch ops per tick.',
      'Unbounded history → snapshot + log trimming.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'SERVER', 'REDIS', 'POSTGRESQL', 'KAFKA'],
    hints: [
      'Two people type at the same position at the same instant — what guarantees they end up seeing the same document?',
      'Do you have a single point that can order operations, or must merges work in any order? That choice is OT vs CRDT.',
      'Treat cursors/presence completely differently from durable edits.',
    ],
  }),

  // ─────────────────────────── Social & content ───────────────────────────
  social: P({
    approach:
      'Social/content platforms are read-heavy with a fan-out core: producing content is rare, reading feeds/pages is constant. The central trade-off is fan-out-on-write (precompute each user’s feed) vs fan-out-on-read (assemble at query time), usually a hybrid to handle “celebrity” accounts.',
    functional: [
      'Create content (posts/articles/answers) and interactions (likes/comments/votes).',
      'Render a personalized or ranked feed/timeline.',
      'Follow/subscribe relationships (social graph).',
      'Search and view individual content pages.',
    ],
    nonFunctional: [
      'Very read-heavy; feed latency must be low.',
      'Eventual consistency is fine for feeds; counts can be approximate.',
      'High availability over strict consistency.',
      'Handle skew: a few accounts have millions of followers.',
    ],
    estimation: [
      'Read:write ratio is often 100:1+ — optimize the read path.',
      'Fan-out amplification = avg followers; celebrities blow up write cost.',
      'Feed cache size = active users × feed length; keep it in memory.',
    ],
    entities: [
      'Post{id, authorId, body, createdAt, counters}',
      'Follow{followerId, followeeId}',
      'Feed{userId → ordered postIds} (materialized)',
      'API: createPost, getFeed(userId, cursor), follow/unfollow',
    ],
    architecture: [
      'Writes append a post and enqueue a fan-out job that pushes the post id into followers’ feed caches (fan-out-on-write).',
      'Reads serve a precomputed feed from cache, hydrating post bodies from a store/CDN.',
      'Celebrity authors are handled fan-out-on-read: their posts are merged in at query time instead of pushed to millions.',
      'Counters (likes/views) use approximate/asynchronous aggregation.',
    ],
    deepDives: [
      { title: 'Fan-out-on-write vs read', body: 'On-write gives fast reads but expensive writes and wasted work for inactive users; on-read gives cheap writes but slow, complex reads. Hybrid: push for normal accounts, pull for celebrities and inactive users. This is the defining decision of feed design.' },
      { title: 'Ranking', body: 'Start chronological, then layer a scoring model (recency, affinity, engagement). Precompute candidate sets and rank at read time; keep ranking features in a fast store. Be explicit that “the feed” is a cache that can be rebuilt.' },
      { title: 'Counters at scale', body: 'Exact like/view counts under high write rates are a hotspot. Use sharded counters aggregated asynchronously, or approximate counts; readers tolerate slight staleness.' },
      { title: 'The celebrity problem', body: 'A 50M-follower post would create 50M feed writes. Cap fan-out, mark such authors “pull”, and merge their recent posts into feeds on read. Same amplification issue appears in chat groups and notifications.' },
    ],
    bottlenecks: [
      'Fan-out write storms for popular authors → hybrid push/pull.',
      'Hot post rows → cache + CDN for content bodies.',
      'Feed cache memory pressure → cap length, evict inactive users.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'LOAD_BALANCER', 'SERVER', 'REDIS', 'CASSANDRA', 'KAFKA', 'CDN'],
    hints: [
      'Is this system read-heavy or write-heavy? Optimize the common path.',
      'Should a user’s feed be built when content is posted, or when they open the app?',
      'What breaks when one account has 50 million followers — and how do you special-case it?',
    ],
  }),

  // ───────────────────────── Geospatial & location ────────────────────────
  geo: P({
    approach:
      'These systems answer “what/who is near me” and often track moving entities in real time. The core is a spatial index (geohash / quadtree / S2) for proximity queries, plus a high-write path for location updates and a matching/dispatch layer for two-sided marketplaces.',
    functional: [
      'Proximity search: find nearby drivers/venues/users within a radius.',
      'Ingest frequent location updates from moving entities.',
      'Match/dispatch (rider↔driver, order↔courier) where applicable.',
      'ETA/routing and trip/session lifecycle.',
    ],
    nonFunctional: [
      'Low-latency nearby queries at high read rate.',
      'Very high write rate of location pings (throttle/batch).',
      'Freshness of positions (seconds) over strict consistency.',
      'Availability of matching even under regional spikes.',
    ],
    estimation: [
      'Location writes = active moving entities × ping frequency — often the biggest write load.',
      'Nearby-query QPS scales with active consumers; cache per cell.',
      'Partition load by geography; dense cities are hotspots.',
    ],
    entities: [
      'Entity{id, lastLat, lastLng, updatedAt, status}',
      'GeoIndex: cell(geohash) → set of entityIds',
      'Trip/Match{id, consumerId, providerId, state}',
      'API: updateLocation, searchNearby(lat,lng,radius), requestMatch',
    ],
    architecture: [
      'Location pings hit a write-optimized path that updates the entity’s position and its cell in a spatial index (Redis geo / geohash buckets).',
      'Nearby queries map the point to a cell + neighbors and return candidates, filtered by exact distance.',
      'A matching service picks a provider (nearest/eta/optimization) and manages the trip state machine.',
      'Partition by geographic region so load and data stay local.',
    ],
    deepDives: [
      { title: 'Spatial indexing', body: 'Geohash/S2 map 2D space to sortable cell ids so “nearby” becomes a prefix/range scan plus neighbor cells (to cover borders). Quadtrees adapt cell size to density — better for very uneven distributions (cities vs. countryside). Always re-filter candidates by true distance.' },
      { title: 'High-frequency location writes', body: 'Millions of pings/sec: throttle client update frequency, batch, and keep hot positions in memory (Redis) rather than a disk DB per write. Only periodically persist. Moving an entity between cells is an index update — keep it O(1).' },
      { title: 'Matching & dispatch', body: 'Matching is a real-time optimization under contention: two riders may want the same driver. Use short locks/holds on a provider, a state machine (requested→accepted→enroute→complete), and timeouts to release stale holds. Optimize for ETA, not just raw distance.' },
      { title: 'Hotspots & fairness', body: 'Dense regions overload a single cell/partition — sub-shard hot cells and rebalance. Surge/queueing handles demand spikes; ensure a provider isn’t offered to many consumers at once.' },
    ],
    bottlenecks: [
      'Write amplification from pings → in-memory geo store + throttling.',
      'Hot city cells → adaptive/finer partitioning.',
      'Matching contention → provider holds with timeouts.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'LOAD_BALANCER', 'SERVER', 'REDIS', 'CASSANDRA', 'KAFKA'],
    hints: [
      'How do you turn “within 2 km of me” into an efficient lookup instead of scanning everyone?',
      'Location updates can be your heaviest write load — where should the latest position live?',
      'For matching, what stops two consumers from grabbing the same provider at once?',
    ],
  }),

  // ─────────────────────── Booking & reservations ─────────────────────────
  booking: P({
    approach:
      'Booking systems allocate limited inventory under high contention — the same seat/room/slot must never be sold twice, yet you want high throughput and fairness during spikes. Correctness (no double-booking) beats availability here, so this is fundamentally a concurrency-control problem.',
    functional: [
      'Browse availability and hold/reserve an item.',
      'Confirm a booking with payment; release on timeout.',
      'Prevent double-booking of the same unit.',
      'Handle spikes (on-sale/flash) fairly.',
    ],
    nonFunctional: [
      'Strong consistency on inventory — no oversell.',
      'Bounded holds so inventory isn’t locked forever.',
      'Fairness and graceful degradation under massive spikes.',
      'Idempotent confirmation (double-clicks, retries).',
    ],
    estimation: [
      'Peak is bursty: an on-sale can be 100× baseline for minutes — design for the spike.',
      'Contention concentrates on a few hot items (front-row seats).',
      'Reads (browse) vastly outnumber writes (holds/confirms).',
    ],
    entities: [
      'Inventory{unitId, state: available|held|sold, holdExpiry}',
      'Reservation{id, unitId, userId, state, expiresAt}',
      'Order{id, reservationId, paymentState}',
      'API: hold(unitId) → reservation w/ TTL; confirm(reservationId); release',
    ],
    architecture: [
      'A hold step atomically flips a unit available→held with a TTL (DB row lock or atomic compare-and-set / Redis), returning a reservation token.',
      'Confirmation charges payment and flips held→sold idempotently; expiry releases held→available.',
      'A virtual waiting room / queue admits users at a controlled rate during spikes.',
      'Browse traffic is served from caches; only holds/confirms touch the consistent store.',
    ],
    deepDives: [
      { title: 'Preventing double-booking', body: 'The hold must be atomic: a conditional update (state=available → held) that only one request can win, using a DB transaction/row lock or an atomic op in Redis. Never “check then set” in two steps. The winner gets a reservation with a TTL.' },
      { title: 'Hold expiry & idempotency', body: 'Reservations expire so abandoned carts free inventory — implement via TTL + a sweeper, or lazy expiry on read. Confirmation must be idempotent (dedupe key) so a retried payment doesn’t double-charge or double-sell.' },
      { title: 'Spikes & fairness (waiting room)', body: 'For on-sales, put users in a queue and admit them at the rate the inventory system can safely handle; this converts a stampede into a manageable stream and gives fair, predictable ordering. Show queue position to reduce refresh storms.' },
      { title: 'Hot-item contention', body: 'Everyone wants the same seats. Serialize per-unit (or per small partition) so contention is localized, and fail fast when an item is gone rather than making users wait on a lock.' },
    ],
    bottlenecks: [
      'Lock contention on hot units → per-unit serialization, fail-fast.',
      'Spike stampede → waiting room + admission control.',
      'Payment latency holding inventory → short TTLs + async confirm.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'LOAD_BALANCER', 'SERVER', 'REDIS', 'POSTGRESQL', 'SQS'],
    hints: [
      'What is the exact atomic step that guarantees a unit is sold at most once?',
      'A user holds a seat then vanishes — how and when is it released?',
      'A million people hit “buy” at 10:00:00 — how do you make that fair instead of a stampede?',
    ],
  }),

  // ─────────────────────────── Commerce & payments ────────────────────────
  commerce: P({
    approach:
      'Money systems put correctness first: no lost or double-spent funds, a complete audit trail, and idempotency everywhere. Model balances as an append-only ledger of immutable entries, make external effects idempotent, and reconcile continuously. Availability matters, but never at the cost of correctness.',
    functional: [
      'Move funds / place orders with a durable record.',
      'Maintain balances and transaction history.',
      'Integrate external processors/rails; handle async settlement.',
      'Fraud/risk checks and refunds/reversals.',
    ],
    nonFunctional: [
      'Strong consistency & durability of financial state.',
      'Exactly-once effects via idempotency (no double charge).',
      'Full auditability (immutable ledger).',
      'High availability without violating correctness.',
    ],
    estimation: [
      'Throughput is modest vs. social, but each write is critical and must be durable.',
      'Read history grows forever → partition by account, archive cold.',
      'Reconciliation load = external events/day.',
    ],
    entities: [
      'Account{id, balanceCache}',
      'LedgerEntry{id, accountId, amount, direction, txnId, createdAt} (immutable)',
      'Transaction{id, idempotencyKey, state: pending|settled|failed}',
      'API: transfer(idempotencyKey, from, to, amount); getBalance; getHistory',
    ],
    architecture: [
      'Every money movement writes double-entry ledger rows in a single ACID transaction; balances are derived (or cached and reconciled).',
      'An idempotency key dedupes retries so a resubmitted request is a no-op.',
      'External processor calls go through an outbox + state machine (pending→settled/failed) with retries and reconciliation.',
      'Risk/fraud checks run in-line (block) or async (flag) depending on rail.',
    ],
    deepDives: [
      { title: 'Ledger & double-entry', body: 'Represent state as immutable, append-only entries where every transaction debits one account and credits another (sums to zero). Balances are the fold of entries — this gives a natural audit trail and makes corrections additive (never mutate history; post a reversing entry).' },
      { title: 'Idempotency & exactly-once', body: 'Network retries are inevitable; require a client-supplied idempotency key, store the first result, and return it on replay. For external side-effects use an outbox/saga so “charged the card” and “recorded the charge” can’t diverge.' },
      { title: 'Distributed correctness', body: 'Cross-account transfers need atomicity. Prefer a single-DB ACID transaction when accounts co-locate; across services use a saga with compensating actions (refund) rather than a 2PC you can’t operate. Reconcile continuously against processor statements.' },
      { title: 'Fraud & risk', body: 'Score transactions on velocity, device, and graph features. Inline scoring must be fast (block bad actors) while heavier models run async and can reverse/hold. Keep a feature store fresh from the event stream.' },
    ],
    bottlenecks: [
      'Hot account rows → shard by account, cache balances.',
      'External processor latency/outages → async settlement + retries.',
      'Ever-growing ledger → partition + archive, snapshot balances.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'LOAD_BALANCER', 'SERVER', 'POSTGRESQL', 'KAFKA', 'REDIS'],
    hints: [
      'How do you represent a balance so that history is auditable and corrections never rewrite the past?',
      'A user double-clicks “pay” and the network retries — how do you charge exactly once?',
      'Where do you need a real ACID transaction, and where can a saga with compensation do the job?',
    ],
  }),

  // ─────────────────────── Search & recommendation ────────────────────────
  search: P({
    approach:
      'Search/rec is an indexing + ranking pipeline: gather documents (crawl/ingest), build an inverted (or vector) index offline, then serve low-latency ranked queries online. The separation of a batch indexing plane from a fast serving plane is the key structure.',
    functional: [
      'Ingest/crawl and index documents.',
      'Serve ranked results for a query (keyword and/or semantic).',
      'Autocomplete/typeahead and filters/facets.',
      'Freshness: new content becomes searchable quickly.',
    ],
    nonFunctional: [
      'Low query latency (tens of ms) at high QPS.',
      'Relevance quality is the product; ranking matters most.',
      'Index freshness vs. build cost trade-off.',
      'Scale index across shards; replicate for read throughput.',
    ],
    estimation: [
      'Corpus size → index size → shard count (each shard fits in memory ideally).',
      'Query QPS drives replica count; ranking cost per query drives CPU.',
      'Crawl/ingest rate determines freshness lag.',
    ],
    entities: [
      'Document{id, fields, tokens|embedding}',
      'InvertedIndex: term → posting list (docIds, positions, scores)',
      'Query{text, filters} → ranked docIds',
      'API: search(q, filters, page); suggest(prefix)',
    ],
    architecture: [
      'An offline pipeline crawls/ingests docs, tokenizes, and builds an inverted index (and/or vector index) partitioned into shards.',
      'The serving tier scatter-gathers a query across shards, each returning top-k, then merges and re-ranks.',
      'Ranking combines lexical signals (BM25) with learned/semantic scores; a cache serves hot queries.',
      'Typeahead uses a prefix structure (trie/FST) with precomputed top completions.',
    ],
    deepDives: [
      { title: 'Inverted index & sharding', body: 'Map each term to a posting list of documents; a query intersects/unions lists and scores matches. Shard by document so each node holds part of the corpus; scatter-gather across shards and merge top-k. Replicate shards for QPS and availability.' },
      { title: 'Ranking', body: 'Two phases: cheap candidate retrieval (BM25/ANN) then an expensive re-rank of the top few hundred with a richer model. Relevance is where products win — invest in signals (freshness, popularity, personalization) and offline evaluation.' },
      { title: 'Semantic / vector search', body: 'Embed docs and queries into vectors and use ANN (HNSW/IVF) to find nearest neighbors — great for meaning-based matching and recommendations. Often hybrid with lexical search for precision. Index build and memory are the costs.' },
      { title: 'Freshness & typeahead', body: 'Batch index builds lag reality; add a small real-time index for recent docs, merged at query time and periodically folded in. Typeahead needs sub-50ms responses — precompute top completions per prefix and cache aggressively.' },
    ],
    bottlenecks: [
      'Fan-out latency across many shards → limit shards, tail-tolerant gather.',
      'Hot queries → result cache.',
      'Index build cost/freshness → incremental + real-time layer.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'LOAD_BALANCER', 'SERVER', 'REDIS', 'CASSANDRA', 'KAFKA', 'S3_BUCKET'],
    hints: [
      'Separate the slow job (building the index) from the fast job (answering a query).',
      'A query shouldn’t scan every document — what data structure turns it into a lookup?',
      'Ranking is usually two-stage: cheap retrieval, then expensive re-rank of a small candidate set.',
    ],
  }),

  // ─────────────────────── Networking & edge infra ────────────────────────
  'infra-net': P({
    approach:
      'These are infrastructure/data-plane systems where throughput, tail latency, and reliability dominate. Separate the fast data plane (per-packet/request work, must be cheap and local) from the slower control plane (config, health, decisions). Fail open or closed deliberately.',
    functional: [
      'Route/forward/filter traffic according to policy.',
      'Distribute config/health across the fleet (control plane).',
      'Enforce limits/rules/security at line rate.',
      'Observe and adapt (health checks, failover).',
    ],
    nonFunctional: [
      'High throughput, low and predictable tail latency.',
      'Very high availability — this sits in the critical path.',
      'Horizontal scale; no single choke point.',
      'Safe failure mode (fail-open vs fail-closed) chosen per purpose.',
    ],
    estimation: [
      'Requests/packets per second per node = the core capacity unit.',
      'State per connection/rule must stay small and in memory.',
      'Control-plane updates are infrequent vs. data-plane ops — size them separately.',
    ],
    entities: [
      'Config/Policy{version, rules[]} distributed to the data plane',
      'Backend/Target{id, health, weight}',
      'ConnectionState (minimal, per-flow)',
      'API: admin config CRUD; data-plane is transparent to clients',
    ],
    architecture: [
      'A stateless (or minimal-state) data-plane fleet does the per-request work; a control plane pushes versioned config/health to it.',
      'Health checks + a routing/consistent-hashing layer pick healthy backends and drain unhealthy ones.',
      'Decisions that need shared state (rate counters, sessions) use a fast local + shared store with tolerances for approximation.',
      'Anycast/DNS/L4-L7 layering spreads and localizes traffic.',
    ],
    deepDives: [
      { title: 'Data plane vs control plane', body: 'Keep the data path dumb, fast, and local — no synchronous calls to a database per request. The control plane computes config/health out-of-band and distributes versioned snapshots the data plane applies atomically. This is why edge systems stay fast and resilient.' },
      { title: 'Load distribution & health', body: 'Use consistent hashing (or maglev-style) so adding/removing nodes reshuffles minimal traffic and sessions stick. Continuously health-check backends and drain gracefully; outlier-detect to eject slow nodes and protect the tail.' },
      { title: 'Failure mode', body: 'Decide fail-open vs fail-closed per purpose: a WAF/DDoS filter fails closed (block on doubt) to protect; a cache/accelerator fails open (serve/allow) to preserve availability. Make the choice explicit and test it.' },
      { title: 'Distributed limits/state', body: 'Global rate limits or session affinity need shared state; approximate it (local buckets + periodic sync) to avoid a hot central counter on every request. Accept small overshoot for big throughput gains.' },
    ],
    bottlenecks: [
      'Central state on the hot path → local-first with async sync.',
      'Uneven backend load → consistent hashing + outlier ejection.',
      'Config propagation lag → versioned atomic swaps, canary.',
    ],
    archsim: ['CLIENT', 'DNS', 'CDN', 'LOAD_BALANCER', 'API_GATEWAY', 'WAF', 'FIREWALL', 'SERVER', 'REDIS'],
    hints: [
      'What work happens on every single request, and how do you keep it off the database?',
      'Separate “decisions/config” from “forwarding” — which is allowed to be slow?',
      'On failure, should this component block traffic or let it through? Justify it.',
    ],
  }),

  // ─────────────────────── Notifications & email ──────────────────────────
  notifications: P({
    approach:
      'Notification/email systems are reliable, deduplicated fan-out to millions of endpoints across unreliable channels (APNs/FCM/SMTP). The core is a durable pipeline: accept → resolve targets → rate-limit/dedupe → deliver with retries → track receipts, honoring user preferences and avoiding spam.',
    functional: [
      'Accept notification requests from many producers.',
      'Resolve recipients + devices/addresses and preferences.',
      'Deliver across channels (push/email/SMS) with retries.',
      'Dedupe, respect opt-outs/quiet hours, track delivery.',
    ],
    nonFunctional: [
      'At-least-once delivery with dedup → effectively once.',
      'High fan-out throughput with backpressure.',
      'Respect provider rate limits; isolate failures per channel.',
      'Auditability of what was sent.',
    ],
    estimation: [
      'Peak = campaign size / send window; smooth with a queue.',
      'Device/address table size = users × devices.',
      'Provider throttles cap per-channel throughput — plan around them.',
    ],
    entities: [
      'NotificationRequest{id, templateId, audience, dedupKey}',
      'Device/Address{userId, channel, token, valid}',
      'Preference{userId, channel, optIn, quietHours}',
      'API: send(request); getStatus(id); manage preferences',
    ],
    architecture: [
      'Requests land on a durable queue; a fan-out worker resolves the audience into per-recipient messages.',
      'A delivery layer per channel (push/email/SMS) sends via providers with retries, backoff, and per-provider rate limiting.',
      'Dedup (by key) and preference/opt-out checks gate sending; receipts/bounces feed back to update device validity.',
      'Templating + localization render the final payload.',
    ],
    deepDives: [
      { title: 'Reliable fan-out with backpressure', body: 'A large campaign must not overwhelm downstream providers. Buffer in a durable queue and drain at a controlled rate; shard workers by channel/provider and apply token-bucket limits per provider to respect their quotas.' },
      { title: 'Dedup & idempotency', body: 'Producers retry and multiple triggers can fire for one event. A dedup key (event id + user + channel) with a short-lived seen-set ensures a user isn’t notified twice. Delivery is at-least-once + client/server dedup ⇒ effectively once.' },
      { title: 'Preferences, quiet hours, deliverability', body: 'Check opt-outs, frequency caps, and quiet hours before sending — over-notifying churns users and hurts sender reputation. For email, manage bounces/complaints and warm up sending domains; invalid tokens must be pruned from device bounces.' },
      { title: 'Failure isolation', body: 'One channel/provider outage shouldn’t block others. Isolate queues per channel, retry with backoff + dead-letter, and degrade gracefully (e.g., fall back push→email).' },
    ],
    bottlenecks: [
      'Provider rate limits → per-provider token buckets + sharding.',
      'Campaign spikes → durable queue smooths the burst.',
      'Stale device tokens → prune on bounce/uninstall feedback.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'SERVER', 'SQS', 'KAFKA', 'REDIS', 'POSTGRESQL'],
    hints: [
      'A campaign targets 10M users — what stops you from melting the push provider?',
      'The same event fires twice; how do you avoid notifying a user twice?',
      'Where do user preferences and quiet hours get enforced in the pipeline?',
    ],
  }),

  // ─────────────────────── Analytics & observability ──────────────────────
  analytics: P({
    approach:
      'These ingest huge volumes of events and turn them into aggregates/metrics/insights. The pattern is a streaming pipeline: high-throughput ingest → stream processing (windowed aggregation) → a store optimized for the query (time-series, OLAP, or precomputed top-k). Trade exactness for throughput where acceptable.',
    functional: [
      'Ingest events at high volume from many producers.',
      'Aggregate over time windows (counts, rates, top-k, percentiles).',
      'Query/alert on the results; dashboards.',
      'Retention/rollups for historical data.',
    ],
    nonFunctional: [
      'Very high write throughput; ingest must not block producers.',
      'Bounded, tunable freshness (seconds–minutes).',
      'Approximation acceptable for many metrics (sketches).',
      'Cost-efficient storage with rollups/tiering.',
    ],
    estimation: [
      'Events/sec × payload = ingest bandwidth; this drives the whole design.',
      'Cardinality (unique keys) is the silent killer — bound it.',
      'Raw retention is expensive → downsample old data.',
    ],
    entities: [
      'Event{ts, dimensions, value}',
      'Aggregate{key, window, value} (materialized)',
      'Sketch (HLL/Count-Min/t-digest) for approx distinct/top-k/quantiles',
      'API: ingest(event[]); query(metric, range, groupBy)',
    ],
    architecture: [
      'Producers write to a durable log (Kafka-like) that decouples ingest from processing and absorbs bursts.',
      'Stream processors consume, aggregate over tumbling/sliding windows, and write results to a query-optimized store.',
      'A time-series/OLAP store serves dashboards; alerting evaluates rules on the stream or store.',
      'Rollups compact old high-resolution data into coarser summaries.',
    ],
    deepDives: [
      { title: 'Streaming aggregation & windows', body: 'Aggregate in tumbling/sliding/session windows as events arrive rather than scanning raw data at query time. Handle late/out-of-order events with watermarks and a grace period; decide whether to update or drop late data.' },
      { title: 'Approximation with sketches', body: 'Exact distinct counts, top-k, and percentiles over billions of events are too expensive. HyperLogLog (cardinality), Count-Min (frequencies/top-k), and t-digest (quantiles) give bounded-error answers in tiny memory — the standard trick for “trending” and unique-visitor metrics.' },
      { title: 'Exactly-once vs at-least-once', body: 'For counters, at-least-once + idempotent aggregation (or dedup on event id) prevents double counting on retries. True exactly-once needs transactional sinks/offsets. Be explicit about which metrics tolerate small error.' },
      { title: 'Retention & cardinality', body: 'High-cardinality dimensions explode storage and query cost — limit tag combinations and pre-aggregate. Downsample: keep seconds for a day, minutes for a month, hours for a year.' },
    ],
    bottlenecks: [
      'Ingest spikes → durable log buffers and backpressures.',
      'High cardinality → bound tags, pre-aggregate, sketches.',
      'Raw storage cost → rollups + tiering.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'SERVER', 'KAFKA', 'CASSANDRA', 'REDIS', 'S3_BUCKET', 'PROMETHEUS'],
    hints: [
      'Decouple producers from processing so an ingest spike can’t block anyone — what sits in between?',
      'Do you need exact counts, or is a bounded-error sketch (HLL/Count-Min) good enough?',
      'What’s your plan for late-arriving events and for data that’s a year old?',
    ],
  }),

  // ─────────────────────── Jobs & orchestration ───────────────────────────
  jobs: P({
    approach:
      'These run work reliably: schedule it, place it on a worker fleet, execute (often untrusted) code with isolation, and track state through retries and failures. The core is a durable job/state store + a scheduler/dispatcher + isolated executors, with exactly-once *effects* despite at-least-once execution.',
    functional: [
      'Submit jobs/workflows with dependencies and schedules.',
      'Dispatch to workers; execute with isolation and resource limits.',
      'Track state, retry failures, report logs/results.',
      'Scale workers with demand; support DAGs where relevant.',
    ],
    nonFunctional: [
      'Reliability: no lost jobs; survive worker/coordinator crashes.',
      'Isolation and security for untrusted workloads.',
      'Fairness/priority across tenants.',
      'Elastic scaling; efficient bin-packing of resources.',
    ],
    estimation: [
      'Jobs/sec and avg duration → concurrent worker count.',
      'Resource shapes (cpu/mem) drive scheduling/bin-packing.',
      'Fan-out of a DAG determines coordinator load.',
    ],
    entities: [
      'Job{id, spec, state: queued|running|done|failed, attempts}',
      'Workflow/DAG{nodes, edges, state}',
      'Worker{id, capacity, lease}',
      'API: submit(spec); getStatus(id); cancel',
    ],
    architecture: [
      'Submissions persist to a durable store and enter a scheduler that assigns ready jobs to workers via leases/heartbeats.',
      'Workers execute in isolation (containers/microVMs/sandboxes), stream logs, and report terminal state.',
      'A DAG engine unblocks downstream tasks as dependencies complete; retries/backoff handle transient failures.',
      'Autoscaling adjusts the worker fleet to queue depth.',
    ],
    deepDives: [
      { title: 'Exactly-once effects', body: 'Workers can die mid-job, so execution is at-least-once. Make side-effects idempotent (keys/dedup) or transactional so a retried job doesn’t double-apply. Use leases with heartbeats: if a worker stops renewing, another may safely take over the job.' },
      { title: 'Isolation for untrusted code', body: 'Running user code (CI, serverless, online IDE) demands strong isolation — containers with seccomp/cgroups, or microVMs (Firecracker-style) for a real security boundary. Enforce cpu/mem/time quotas and cap network/filesystem access. Cold-start vs. isolation is the key trade-off.' },
      { title: 'Scheduling & fairness', body: 'Bin-pack jobs onto workers by resource shape while preventing one tenant from starving others (fair queuing/priorities/quotas). For DAGs, only schedule tasks whose dependencies are satisfied; track the frontier.' },
      { title: 'Failure & recovery', body: 'Persist state transitions so a coordinator crash resumes cleanly. Retry with capped backoff and a dead-letter for poison jobs. Distinguish infra failures (retry) from user failures (fail fast, surface logs).' },
    ],
    bottlenecks: [
      'Coordinator/scheduler as SPOF → replicate with leader election.',
      'Cold starts for isolated executors → warm pools.',
      'Noisy-neighbor tenants → quotas + fair scheduling.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'SERVER', 'CONTAINER', 'K8S_CLUSTER', 'SQS', 'KAFKA', 'POSTGRESQL', 'REDIS'],
    hints: [
      'A worker dies halfway through a job — how do you guarantee the work still completes exactly once?',
      'You’re running code you don’t trust; what’s your isolation boundary and why?',
      'How does a job get from “submitted” to a specific worker, and who notices if it never finishes?',
    ],
  }),

  // ─────────────────── Databases & storage engines ────────────────────────
  datastores: P({
    approach:
      'You’re building the data layer itself: an on-disk storage engine and/or a distributed layer over it. Decide the read/write optimization (B-tree vs LSM), how data is partitioned and replicated, and the consistency model (consensus for strong, quorums/gossip for tunable). Durability via a write-ahead log is non-negotiable.',
    functional: [
      'CRUD/queries with a defined data + query model.',
      'Durability: survive crashes without data loss (WAL).',
      'Partitioning to scale beyond one node; replication for HA.',
      'Defined consistency & isolation semantics.',
    ],
    nonFunctional: [
      'Durability + crash recovery.',
      'Predictable read/write latency for the target workload.',
      'Availability during node failures (replication/failover).',
      'Chosen consistency (strong vs eventual) with clear trade-offs.',
    ],
    estimation: [
      'Read vs write ratio picks the engine (B-tree reads, LSM writes).',
      'Dataset size / node capacity → shard count + replication factor.',
      'Working-set vs. memory decides cache hit rate and IO.',
    ],
    entities: [
      'WAL (append-only durability log)',
      'Memtable + SSTables (LSM) or page tree (B-tree)',
      'Partition/Shard map (consistent hashing / ranges)',
      'Replication log + consensus group (Raft/Paxos) for strong consistency',
    ],
    architecture: [
      'Writes append to a WAL (durability) then update an in-memory structure; the engine periodically flushes/compacts to disk.',
      'Data is partitioned across nodes (hash or range) and each partition replicated N ways.',
      'Strong consistency uses a consensus group per partition (Raft) with a leader; eventual uses quorum reads/writes + anti-entropy.',
      'A query/coordinator layer routes requests to the owning partition(s).',
    ],
    deepDives: [
      { title: 'B-tree vs LSM', body: 'B-trees update pages in place — great for reads and range scans, but random writes cause write amplification. LSM trees batch writes in memory and flush sorted runs, then compact — excellent write throughput and compression, at the cost of read amplification (checked with bloom filters) and background compaction. Choose by workload.' },
      { title: 'Durability & recovery (WAL)', body: 'Append every mutation to a write-ahead log and fsync before acking, so a crash replays the log to recover committed state. Checkpoints/snapshots bound replay time. This is the foundation under both engine types.' },
      { title: 'Partitioning & replication', body: 'Consistent hashing spreads keys and minimizes reshuffling on membership change; range partitioning enables scans but risks hotspots (needs splitting). Replicate each partition for availability; a replica can take over on failure.' },
      { title: 'Consistency & consensus', body: 'For strong consistency, run Raft/Paxos per partition: a leader orders writes, replicated to a quorum before commit; failover elects a new leader. For AP systems, use tunable quorums (R+W>N) plus read-repair/Merkle anti-entropy. Name the trade-off (CAP) explicitly.' },
    ],
    bottlenecks: [
      'Compaction IO (LSM) → throttle + schedule; size tiers.',
      'Hot partition → split/rebalance, salt keys.',
      'Leader as write bottleneck → partition finer, batch/pipeline.',
    ],
    archsim: ['SERVER', 'POSTGRESQL', 'CASSANDRA', 'DYNAMODB', 'EBS_VOLUME', 'BLOCK_STORAGE', 'LOAD_BALANCER'],
    hints: [
      'Is this workload read-heavy or write-heavy? That decides B-tree vs LSM before anything else.',
      'What exactly makes a committed write survive a power loss?',
      'How is data split across machines, and how do the copies agree when one fails?',
    ],
  }),

  // ─────────────────────────── Security & identity ────────────────────────
  security: P({
    approach:
      'Security systems protect secrets, prove identity, and establish trust — correctness and threat-modeling matter more than raw scale. Encrypt in transit and at rest, never store recoverable secrets you don’t need, minimize blast radius, and design for auditability and revocation.',
    functional: [
      'Authenticate identities / verify claims (auth, signatures, 2FA).',
      'Store and dispense secrets securely with rotation.',
      'Authorize actions (policies/roles) and audit them.',
      'Detect/prevent abuse (bots, malware, fraud).',
    ],
    nonFunctional: [
      'Confidentiality + integrity (encryption, signing).',
      'Least privilege + short-lived credentials.',
      'Full audit trail; revocation is fast and reliable.',
      'Availability of the trust path (auth can’t be the single outage).',
    ],
    estimation: [
      'Auth QPS peaks at login storms; cache/verify cheaply.',
      'Secret access rate + rotation frequency size the KMS.',
      'Token lifetime trades revocation speed vs. verification cost.',
    ],
    entities: [
      'Identity/Principal{id, credentials, factors}',
      'Token/Session{sub, scopes, exp, sig}',
      'Secret{id, ciphertext, version, rotationPolicy}',
      'API: authenticate, issueToken, verify, getSecret, rotate',
    ],
    architecture: [
      'An identity provider verifies credentials + second factor and issues short-lived signed tokens (JWT/opaque) carrying scopes.',
      'Services verify tokens locally (public key) — no round-trip per request — with a revocation list/short TTL for fast invalidation.',
      'Secrets live encrypted under a KMS/HSM root key; apps fetch just-in-time with leases and automatic rotation.',
      'Everything is logged immutably for audit; anomaly detection watches the stream.',
    ],
    deepDives: [
      { title: 'Credentials & password storage', body: 'Never store recoverable passwords — use a slow salted hash (bcrypt/scrypt/Argon2) so leaks aren’t trivially cracked. For secrets managers, encrypt values with data keys wrapped by a KMS root key (envelope encryption); the plaintext never persists.' },
      { title: 'Tokens: verification vs revocation', body: 'Signed stateless tokens (JWT) verify locally and scale beautifully but are hard to revoke before expiry — mitigate with short TTLs + refresh tokens and a small revocation list. Opaque tokens need a lookup but revoke instantly. State the trade-off.' },
      { title: 'Rotation, least privilege, blast radius', body: 'Issue short-lived, narrowly-scoped credentials and rotate keys/secrets regularly so a leak’s window is small. Compartmentalize (per-service keys) so one compromise doesn’t unlock everything. Automate rotation to make it routine.' },
      { title: 'Abuse detection', body: 'Bots/fraud/malware need layered defenses: rate limits, challenge (CAPTCHA/2FA) on risk signals, reputation/graph features, and async scanning. Fail closed for high-risk actions; keep humans-in-the-loop for appeals.' },
    ],
    bottlenecks: [
      'Central auth as SPOF → replicate, cache verifications, local token verify.',
      'KMS as chokepoint → data-key caching with envelope encryption.',
      'Revocation propagation → short TTLs + push invalidations.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'WAF', 'IAM', 'SECRETS_MANAGER', 'SERVER', 'POSTGRESQL', 'REDIS'],
    hints: [
      'What’s the worst case if your datastore leaks — is anything in it actually usable by an attacker?',
      'Stateless tokens scale but resist revocation; how do you get fast invalidation anyway?',
      'How small can you make the blast radius of one compromised credential?',
    ],
  }),

  // ─────────────────── Language & runtime internals ───────────────────────
  lowlevel: P({
    approach:
      'These are single-machine systems-programming problems (a GC, VM, browser, storage engine, runtime). Scaling is about memory layout, cache locality, and CPU efficiency rather than distributed nodes. Reason in terms of a pipeline of stages, the memory model, and worst-case latency (pauses).',
    functional: [
      'Parse/compile/interpret or manage memory/execution.',
      'Move data through well-defined stages (e.g., parse → optimize → execute).',
      'Manage a resource lifecycle (memory, handles, tabs) safely.',
      'Expose an API/contract to the layer above.',
    ],
    nonFunctional: [
      'Throughput and low, predictable pause/latency.',
      'Memory efficiency and cache locality.',
      'Correctness/safety (no corruption, no leaks).',
      'Isolation between units (tabs/threads/contexts).',
    ],
    estimation: [
      'Work per item × items/sec → CPU budget; find the hot loop.',
      'Live-set size vs. allocation rate drives GC/memory behavior.',
      'Latency budget per frame/op bounds pause times.',
    ],
    entities: [
      'Pipeline stages with clear inputs/outputs',
      'Memory regions/heaps (young/old generations, arenas)',
      'IR / bytecode / DOM tree as the intermediate representation',
      'Scheduler/event loop coordinating work',
    ],
    architecture: [
      'Model the system as a staged pipeline; each stage transforms an intermediate representation and can be optimized/cached independently.',
      'Manage memory in regions/generations to exploit lifetime patterns and locality.',
      'Use an event loop/scheduler to interleave work and keep latency bounded.',
      'Isolate units (tabs/contexts/sandboxes) so one failure doesn’t corrupt others.',
    ],
    deepDives: [
      { title: 'Memory management & GC pauses', body: 'Generational collection exploits “most objects die young”: collect the small young generation frequently and cheaply, promote survivors. The enemy is stop-the-world pause time — incremental/concurrent/region-based collectors trade throughput for shorter, more predictable pauses. Measure p99 pause, not just average.' },
      { title: 'Staged pipeline & IRs', body: 'Compilers/browsers/VMs are pipelines over intermediate representations (tokens → AST → bytecode → optimized code; HTML → DOM → layout → paint). Clear stage boundaries let you cache, parallelize, and lazily recompute only what changed (incremental layout, JIT hot paths).' },
      { title: 'Tiered execution / JIT', body: 'Start interpreting for fast startup, profile to find hot code, then JIT-compile and optimize it — deoptimizing if assumptions break. This balances startup latency against steady-state throughput.' },
      { title: 'Isolation & safety', body: 'Separate contexts (browser tabs → processes, VM threads, sandboxes) so a crash or exploit is contained. Enforce memory safety at boundaries and validate all untrusted input before it reaches privileged stages.' },
    ],
    bottlenecks: [
      'GC pause spikes → concurrent/incremental collection, tune generation sizes.',
      'Cache misses in the hot loop → data-oriented layout.',
      'Recompiling unchanged work → incremental caching/memoization.',
    ],
    archsim: ['SERVER', 'BLOCK_STORAGE', 'EBS_VOLUME'],
    hints: [
      'This runs on one machine — think memory layout, cache locality, and pause times, not shards.',
      'Model it as a pipeline of stages over an intermediate representation; what can be cached or done incrementally?',
      'Where’s the worst-case latency (e.g., a GC pause), and how do you bound it?',
    ],
  }),

  // ─────────────────────── Distributed primitives ─────────────────────────
  primitives: P({
    approach:
      'These are the building blocks other systems lean on — an ID generator, counter, cache, lock, rate limiter, short-link. Each is small in surface area but must be correct and fast under concurrency and partial failure. Nail the one core property (uniqueness, atomicity, freshness) and the failure behavior.',
    functional: [
      'Provide one crisp primitive (unique id, count, cached value, lock, limit, mapping).',
      'Support the required operations at high QPS.',
      'Persist/replicate enough to survive restarts where needed.',
      'Expose a tiny, well-defined API.',
    ],
    nonFunctional: [
      'Correctness under concurrency (no dup ids, no lost increments, no double lock).',
      'Very low latency, very high throughput.',
      'Graceful behavior on node failure/partition.',
      'Horizontal scalability without a global choke point.',
    ],
    estimation: [
      'Ops/sec is the headline number — design for the peak.',
      'State size is usually small; the challenge is contention, not volume.',
      'Decide how much coordination each op truly needs (often less than it seems).',
    ],
    entities: [
      'The primitive’s state (counter value / id ranges / cache entries / lock record)',
      'Sharding scheme to avoid a single hot key',
      'TTL/lease where liveness matters (locks, rate windows)',
      'API: e.g., nextId(), incr(key), get/set(key), acquire/release(lock), allow(key)',
    ],
    architecture: [
      'Shard the primitive by key so no single node is a global bottleneck (e.g., per-key counters, id ranges per node).',
      'Keep hot state in memory (Redis-like) with optional persistence/replication for durability.',
      'Use atomic operations or short leases for correctness under concurrency.',
      'Design an explicit failure mode (fail-open/closed, fallback id scheme).',
    ],
    deepDives: [
      { title: 'Unique IDs without coordination', body: 'A Snowflake-style id packs timestamp + machine id + per-ms sequence into 64 bits — sortable, unique, and generated locally with no central coordinator. Clock skew/rollback is the hazard: handle it by waiting or using a logical clock. Contrast with a central allocator (simpler, but a SPOF/bottleneck).' },
      { title: 'Distributed counters & rate limits', body: 'A single hot counter serializes everything — shard it (sum shards on read) or use approximate counts. Rate limiting uses token/leaky buckets; a global limit needs shared state, so approximate with local buckets + periodic sync and accept small overshoot for huge throughput.' },
      { title: 'Distributed locks — safely', body: 'A lock needs a lease/TTL (so a dead holder auto-releases) and a fencing token (monotonic number) the resource checks, so a paused-then-resumed holder can’t act on a stale lock. Understand why “just SETNX in Redis” is unsafe without fencing (the Redlock debate).' },
      { title: 'Caching & short-links', body: 'Cache-aside with TTLs is the default; guard against stampedes (locking/coalescing) and choose an eviction policy (LRU/LFU) for the access pattern. For URL shorteners, generate a short key (base62 of an id or hash) and store key→URL; dedupe identical URLs and plan for collisions.' },
    ],
    bottlenecks: [
      'A single hot key/counter → shard it.',
      'Central allocator/coordinator → local generation (Snowflake) or ranges.',
      'Cache stampede → request coalescing + jittered TTLs.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'SERVER', 'REDIS', 'MEMCACHED', 'POSTGRESQL', 'DYNAMODB'],
    hints: [
      'What is the single correctness property this primitive must never violate?',
      'Can each node do the work locally, or does every operation really need global coordination?',
      'What’s the behavior when a node holding state dies mid-operation?',
    ],
  }),

  // ─────────────────────────── Generic fallback ───────────────────────────
  generic: P({
    approach:
      'Apply the standard framework end to end: clarify requirements, estimate scale to locate the pressure, design the happy path (API → services → data), then go deep on the hardest parts and finish with bottlenecks. Let the numbers, not habit, drive each choice.',
    functional: [
      'Restate the problem and list 3–5 concrete functional requirements.',
      'Define the primary read and write flows.',
      'Identify the core entities and their relationships.',
      'Call out what is explicitly out of scope.',
    ],
    nonFunctional: [
      'Scale (users/QPS/data), latency, availability, consistency targets.',
      'Decide where strong consistency is required vs. eventual is fine.',
      'Durability and failure expectations.',
      'Cost/operability constraints.',
    ],
    estimation: [
      'Estimate QPS (read vs write), data/day, and bandwidth.',
      'Find the dominant pressure: read-heavy, write-heavy, storage-heavy, fan-out-heavy.',
      'Size caches, shards, and replicas from those numbers.',
    ],
    entities: [
      'Core entities with ids and key fields',
      'A clean API surface (verbs + payloads)',
      'The read path and the write path, drawn separately',
    ],
    architecture: [
      'Client → gateway/load balancer → stateless services → data stores, with a cache on the hot read path.',
      'Introduce a queue to decouple heavy/asynchronous work from the request path.',
      'Replicate and partition data stores for availability and scale.',
      'Add observability (metrics/logs/traces) from day one.',
    ],
    deepDives: [
      { title: 'Find the bottleneck first', body: 'The estimate tells you what to optimize. Read-heavy → caching + read replicas + CDN. Write-heavy → partitioning, batching, LSM-style stores, queues. Fan-out-heavy → precompute vs. on-read trade-off. Don’t optimize what isn’t hot.' },
      { title: 'Consistency trade-offs', body: 'Pick per-flow: money/inventory need strong consistency; feeds/counters/analytics tolerate eventual. Naming this explicitly (and the CAP consequence during partitions) is what separates a strong answer.' },
      { title: 'Scaling the data tier', body: 'Vertical first, then read replicas, then sharding by a key that spreads load without creating hotspots. Cache aggressively but plan invalidation. Keep the app tier stateless so it scales horizontally.' },
    ],
    bottlenecks: [
      'Single database → replicas then shards.',
      'Hot keys/rows → cache + sharding/salting.',
      'Synchronous heavy work on the request path → offload to a queue.',
    ],
    archsim: ['CLIENT', 'API_GATEWAY', 'LOAD_BALANCER', 'SERVER', 'REDIS', 'POSTGRESQL', 'KAFKA', 'CDN'],
    hints: [
      'Start by restating the problem and pinning down 3–5 functional requirements.',
      'Do a quick estimate — is this read-heavy, write-heavy, or fan-out-heavy? That decides the shape.',
      'Design the happy path first, then attack the two or three hardest parts.',
    ],
  }),
};

// Per-problem bespoke enrichment for flagship problems — merged over the topic
// playbook so these get sharper, name-specific deep dives while every problem
// still inherits a complete, high-quality baseline.
export const OVERRIDES: Record<string, Partial<Solution>> = {
  'url-shortener': {
    approach:
      'A URL shortener is a deceptively simple, extremely read-heavy key/value service. The whole game is generating a short unique key, storing key→URL durably, and serving redirects with tiny latency via caching — plus the analytics and abuse concerns that come with public links.',
    deepDives: [
      { title: 'Key generation', body: 'Two options: (1) base62-encode a globally unique id (from a counter/Snowflake) → guaranteed unique, sequential-ish; (2) hash the URL and take N chars → dedupes identical URLs but needs collision handling (retry with more bits). 7 base62 chars ≈ 3.5 trillion keys. Avoid a central counter bottleneck by handing out id ranges per node.' },
      { title: 'Read path & caching', body: 'Redirects are ~100:1 reads:writes. Cache key→URL in memory (LRU) and at the CDN edge; a cache hit is a single lookup + 301/302. Use 302 if you need to keep counting clicks (301 lets browsers skip you).' },
      { title: 'Analytics & abuse', body: 'Click analytics is a write-heavy stream — log asynchronously to a queue and aggregate, don’t block the redirect. Scan submitted URLs against malware/phishing lists and rate-limit creation to prevent abuse.' },
    ],
  },
  'web-crawler': {
    approach:
      'A web crawler is a massive, polite, distributed BFS over the web graph. The core is a URL frontier (what to fetch next) with prioritization and politeness, dedup of seen URLs at enormous scale, and fault-tolerant fetch/parse workers that feed new links back into the frontier.',
    deepDives: [
      { title: 'The URL frontier', body: 'A prioritized, politeness-aware queue: partition by host so one worker handles a host (respecting robots.txt + crawl-delay), and prioritize by importance/freshness. This is the heart of the crawler — it controls what gets fetched, how often, and how politely.' },
      { title: 'Dedup at web scale', body: 'You’ll see the same URL/content billions of times. Keep a “seen URLs” set (bloom filter for cheap membership + backing store) and detect duplicate/near-duplicate content via hashing/simhash so you don’t re-index mirrors.' },
      { title: 'Politeness & traps', body: 'Respect robots.txt, cap per-host request rate, and detect crawler traps (infinite calendars, session-id URLs). Fault tolerance: workers are stateless and idempotent; the frontier is the durable state to protect.' },
    ],
  },
  'distributed-rate-limiter': {
    approach:
      'A distributed rate limiter must enforce “N requests per window” across a fleet without a hot central counter on every request. The trade-off is accuracy vs. throughput/latency: perfectly global counting is slow, so approximate cleverly and pick the right algorithm.',
    deepDives: [
      { title: 'Algorithms', body: 'Token bucket (allows bursts up to bucket size, refills at rate) and sliding-window-log/counter (smoother, more accurate) are the mainstays. Fixed windows are simplest but allow 2× bursts at boundaries; sliding-window counter fixes that cheaply.' },
      { title: 'Distributed enforcement', body: 'A shared Redis counter per key is accurate but adds a round-trip and a hotspot. Alternatively, give each node a local bucket sized to its share and periodically sync — much faster, with small global overshoot. Choose based on how strict the limit must be.' },
      { title: 'Failure mode & keys', body: 'If the limiter’s store is down, fail open (allow) for user-facing paths or closed (block) for protection — decide deliberately. Key by user/API-key/IP; watch for hot keys (one abusive client) and shard or tarpit them.' },
    ],
  },
  'dropbox-cloud-file-storage': {
    approach:
      'Dropbox is a file sync + sharing service. The hard parts are moving large files efficiently (chunking + resumable uploads), keeping every device consistent through a change journal, and sharing without proxying bytes. Metadata is a small DB problem; bytes live in object storage behind a CDN.',
    deepDives: [
      { title: 'Chunking, dedup & resumable upload', body: 'Split files client-side into ~4 MB content-addressed chunks; upload chunks in parallel and skip ones the server already has (a resumed upload continues where it stopped, and identical chunks dedupe globally). completeUpload stitches a manifest of chunk hashes.' },
      { title: 'Multi-device sync', body: 'Model sync as a monotonic per-user change journal (cursor/version). Each device long-polls or subscribes and applies events after its cursor idempotently. Concurrent edits to one file resolve via version vectors — keep a “conflicted copy” rather than silently dropping data.' },
      { title: 'Sharing & access', body: 'Authorize at the metadata service, then hand back a short-lived pre-signed URL scoped to one object. Folder shares expand to per-file grants; revocation is bounded by the URL TTL, so keep it short.' },
    ],
  },
  'whatsapp-real-time-chat': {
    approach:
      'WhatsApp is real-time fan-out over persistent connections. Storage of messages is a trivial append; the hard parts are routing a message to the recipient’s live connection anywhere in the fleet, guaranteeing ordered at-least-once delivery, handling offline/multi-device, and (optionally) end-to-end encryption.',
    deepDives: [
      { title: 'Connection routing & presence', body: 'Clients hold a WebSocket to a stateless gateway; a registry (Redis) maps userId → gateway node. On send, persist, look up the recipient’s gateway via pub/sub, and push; clear the entry and fall back to an offline inbox on disconnect.' },
      { title: 'Delivery, ordering & receipts', body: 'Persist before acking the sender so a crash can’t lose a message; deliver at-least-once and dedupe by message id on the client. Order per conversation with monotonic ids (never wall-clock). Sent/delivered/read are separate acks flowing back.' },
      { title: 'Offline, multi-device & E2E', body: 'A durable per-user inbox buffers messages until each device (tracked by its own cursor) acks. E2E encryption (Signal protocol) means the server routes ciphertext it can’t read — key exchange and multi-device fan-out of encrypted copies become the complexity.' },
    ],
  },
  'youtube-video-streaming': {
    approach:
      'YouTube is bandwidth/CDN-dominated. Uploads transcode into an adaptive bitrate ladder chopped into segments; playback pulls segments from edge caches. Metadata, search, and recommendations are a comparatively small database problem next to the egress.',
    deepDives: [
      { title: 'Transcoding pipeline', body: 'On upload, split the source into GOP-aligned chunks and transcode them in parallel across a worker fleet fed by a queue, producing multiple renditions + a manifest. This turns a long serial encode into a fast fan-out job; retry failed chunks idempotently.' },
      { title: 'Adaptive bitrate delivery', body: 'Players fetch a manifest then pull short (2–6 s) segments, measuring bandwidth/buffer to pick the highest sustainable rendition and stepping down on congestion. Segments live in object storage served through a tiered CDN; the origin should see almost no traffic.' },
      { title: 'CDN economics & virality', body: 'Cache hit-rate is the dominant cost lever. Use tiered caches (edge→regional→origin) with request coalescing so a cold-but-viral video doesn’t stampede the origin, and pre-position premieres. Watch state is write-heavy — batch it.' },
    ],
  },
  'uber-ride-hailing': {
    approach:
      'Uber matches riders to nearby drivers in real time. The core is a spatial index over a very high write rate of driver location pings, low-latency proximity queries, and a dispatch/matching layer that resolves contention (two riders, one driver) with holds and a trip state machine.',
    deepDives: [
      { title: 'Location writes & geo index', body: 'Millions of driver pings/sec: throttle client frequency, keep the latest position in memory (Redis geo / geohash buckets) not a disk DB per write, and persist only periodically. Moving a driver between cells is an O(1) index update.' },
      { title: 'Proximity search', body: 'Geohash/S2 map the rider’s point to a cell + neighbors (to cover borders) and return candidate drivers, re-filtered by true distance/ETA. Quadtrees adapt to density for cities vs. countryside.' },
      { title: 'Matching under contention', body: 'Dispatch is a real-time optimization: place a short hold on the chosen driver, run a state machine (requested→accepted→enroute→complete) with timeouts to release stale holds, and never offer one driver to many riders at once. Partition by region to keep it local.' },
    ],
  },
  'ticketmaster-event-ticket-booking': {
    approach:
      'Ticketmaster sells limited inventory under extreme, bursty contention — the same seat must never sell twice, yet on-sales spike 100×. Correctness (no oversell) beats availability, so it’s fundamentally a concurrency-control + fairness problem.',
    deepDives: [
      { title: 'Atomic seat holds', body: 'The hold must be a single atomic step (conditional update available→held, DB row lock or atomic Redis op) that exactly one request wins, returning a reservation with a TTL. Never check-then-set in two steps or you oversell.' },
      { title: 'Waiting room & fairness', body: 'An on-sale stampede is tamed by a virtual waiting room that admits users at the rate inventory can safely handle, converting a thundering herd into a fair, ordered stream. Show queue position to stop refresh storms.' },
      { title: 'Hold expiry & idempotent purchase', body: 'Abandoned holds expire (TTL + sweeper) so seats free up. Confirmation is idempotent via a dedup key so a retried payment can’t double-charge or double-sell; keep holds short so payment latency doesn’t lock inventory.' },
    ],
  },
  'facebook-news-feed': {
    approach:
      'The News Feed is the canonical fan-out problem: producing a post is rare, reading feeds is constant (100:1+). The defining decision is fan-out-on-write (precompute each follower’s feed) vs on-read (assemble at query time), with a hybrid to survive celebrity accounts.',
    deepDives: [
      { title: 'Fan-out on write vs read', body: 'On-write gives fast reads but expensive writes and wasted work for inactive users; on-read is cheap to write but slow to read. Hybrid: push to normal followers’ feed caches, but mark celebrities “pull” and merge their recent posts in at read time.' },
      { title: 'The celebrity problem', body: 'A 50M-follower post would create 50M feed writes. Cap fan-out and special-case high-degree authors as pull. The same amplification appears in chat groups and notifications — recognizing it is the interview signal.' },
      { title: 'Ranking & counters', body: 'Start chronological, then score by recency/affinity/engagement over a precomputed candidate set. Like/view counts are hot-write spots — use sharded counters aggregated async or approximate counts; readers tolerate slight staleness.' },
    ],
  },
  'payment-processing-system': {
    approach:
      'A payment system puts correctness first: no lost or double-spent money, a complete audit trail, and idempotency everywhere. Model balances as an append-only double-entry ledger, make external effects idempotent, and reconcile continuously against processor statements.',
    deepDives: [
      { title: 'Double-entry ledger', body: 'State is immutable, append-only entries where each transaction debits one account and credits another (nets to zero). Balances are the fold of entries — a natural audit trail; corrections post a reversing entry, never mutate history.' },
      { title: 'Idempotency & exactly-once', body: 'Retries are inevitable, so require a client idempotency key, store the first result, and replay it on duplicates. For the card charge use an outbox/saga so “charged the processor” and “recorded the charge” can never diverge.' },
      { title: 'Async settlement & reconciliation', body: 'External rails are slow and flaky: drive them through a state machine (pending→settled/failed) with retries, and reconcile continuously against processor statements to catch drift. Cross-account transfers use ACID when co-located, sagas with compensation otherwise.' },
    ],
  },
  'message-queue-kafka': {
    approach:
      'Kafka is a distributed, durable, append-only commit log. Producers append to partitioned topics; consumers read at their own offset. The design centers on the partitioned log for ordering + parallelism, replication for durability, and consumer groups for scalable, replayable consumption.',
    deepDives: [
      { title: 'Partitioned append-only log', body: 'Each topic is split into partitions, each an ordered, immutable log on disk. Ordering is guaranteed within a partition (not across); the partition key decides placement. Sequential disk writes + zero-copy reads make it extremely fast.' },
      { title: 'Replication & durability', body: 'Each partition has a leader and follower replicas; producers wait for acks from the in-sync replica set (ISR) before commit, so a leader failure fails over without data loss. Tune acks vs. latency deliberately.' },
      { title: 'Consumer groups & delivery', body: 'Consumers in a group split partitions (one partition → one consumer) and track offsets, enabling parallelism and replay. Delivery is at-least-once by default; exactly-once needs idempotent producers + transactional offset commits. Consumer lag is the health metric.' },
    ],
  },
  'top-k-trending-elements': {
    approach:
      'Top-K/trending finds the most frequent items in a massive stream where you can’t store per-item exact counts. The trick is approximation: a Count-Min sketch for frequencies plus a bounded heap for the current top-K, aggregated over sliding time windows.',
    deepDives: [
      { title: 'Approximate counting (Count-Min + heap)', body: 'A Count-Min sketch estimates any item’s frequency in fixed memory (with bounded overestimate); pair it with a min-heap of size K to track current leaders. This answers “top-K” over billions of events without per-key storage.' },
      { title: 'Sliding windows & decay', body: 'Trending is recency-weighted: use time-bucketed sketches (e.g., per-minute) and sum a sliding window, or apply exponential decay so old spikes fade. Merge per-shard sketches (they’re additive) into a global view.' },
      { title: 'Two-tier aggregation', body: 'Shard producers write to a durable log; per-shard workers keep local sketches and periodically roll them up to a global aggregator. This bounds hot-key pressure and lets you trade freshness for cost.' },
    ],
  },
  'google-docs-collaborative-editing': {
    approach:
      'Google Docs is concurrent editing that must converge without losing intent. The central choice is the conflict-resolution model — Operational Transformation (used by Docs) or CRDTs — delivered over a low-latency channel with a per-document ordering point.',
    deepDives: [
      { title: 'OT with a single-writer coordinator', body: 'Route all ops for a document to one owner shard that serializes them, assigns a sequence, transforms concurrent ops so intent is preserved, and broadcasts the result. Central ordering keeps transforms simple; scale by sharding per document.' },
      { title: 'Optimistic local edits & reconnect', body: 'Clients apply edits locally for zero-latency echo, tagging each with a base version. On ack/conflict they transform pending ops forward against everything since their base. Offline edits buffer and merge on reconnect the same way.' },
      { title: 'Snapshots & ephemeral presence', body: 'Compact the op log into periodic snapshots so load/recovery stay fast. Cursors/selections are high-frequency and lossy — send them out-of-band and never persist them.' },
    ],
  },
};

// ── Composer ──────────────────────────────────────────────────────────────

export function buildSolution(name: string, topic: TopicId, slug: string): Solution {
  const base = PLAYBOOKS[topic] ?? PLAYBOOKS.generic;
  const override = OVERRIDES[slug];
  if (!override) return base;
  return {
    ...base,
    ...override,
    // Arrays in the override replace wholesale when present (intentional for the
    // curated deep dives); otherwise inherit the playbook's.
    functional: override.functional ?? base.functional,
    nonFunctional: override.nonFunctional ?? base.nonFunctional,
    estimation: override.estimation ?? base.estimation,
    entities: override.entities ?? base.entities,
    architecture: override.architecture ?? base.architecture,
    deepDives: override.deepDives ?? base.deepDives,
    bottlenecks: override.bottlenecks ?? base.bottlenecks,
    archsim: override.archsim ?? base.archsim,
    hints: override.hints ?? base.hints,
  };
}

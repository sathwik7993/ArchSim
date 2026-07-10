package com.designlab.archsim.simulation;

import com.designlab.archsim.project.CanvasState;
import com.designlab.archsim.project.CanvasStateRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Server-side steady-state simulation. Traffic originates at CLIENT nodes and
 * propagates across the graph's links (splitting evenly across out-edges,
 * merging at in-edges). Each node applies a type-derived throughput capacity;
 * load beyond capacity queues and drops, driving CPU, queue depth and error
 * rate. This mirrors the frontend engine so both agree on a design's health.
 */
@Service
public class SimulationService {
  private static final int ITERATIONS = 12;

  private final CanvasStateRepository canvasStates;
  private final SimulationRunRepository runs;
  private final SimulationMetricRepository metrics;

  public SimulationService(
      CanvasStateRepository canvasStates,
      SimulationRunRepository runs,
      SimulationMetricRepository metrics
  ) {
    this.canvasStates = canvasStates;
    this.runs = runs;
    this.metrics = metrics;
  }

  @Transactional
  public SimulationSnapshot start(String projectId, String userId, String trafficProfile, long seed) {
    CanvasState canvas = canvasStates.findById(projectId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Canvas not found"));

    SimulationRun run = new SimulationRun();
    run.id = "sim-" + UUID.randomUUID();
    run.projectId = projectId;
    run.startedBy = userId;
    run.status = "RUNNING";
    run.trafficProfile = trafficProfile == null ? "BURST" : trafficProfile;
    run.seed = seed;
    runs.save(run);

    List<ComponentMetric> snapshot = simulate(run.id, canvas.nodes, canvas.links, run.trafficProfile);
    return new SimulationSnapshot(run.id, run.status, snapshot);
  }

  @Transactional
  public SimulationRun stop(String simulationId) {
    SimulationRun run = runs.findById(simulationId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Simulation not found"));
    run.status = "COMPLETED";
    run.endedAt = Instant.now();
    return runs.save(run);
  }

  public MetricSeries getMetrics(String simulationId, String componentId, String metricName) {
    List<SimulationMetric> rows = metrics.findBySimulationIdAndComponentIdAndMetricNameOrderByRecordedAtMs(
        simulationId, componentId, metricName);
    return new MetricSeries(
        simulationId, componentId, metricName,
        rows.stream().map(row -> row.recordedAtMs).toList(),
        rows.stream().map(row -> row.value).toList());
  }

  // ── Flow simulation ──────────────────────────────────────────────────────

  private List<ComponentMetric> simulate(String simulationId, JsonNode nodes, JsonNode links, String profile) {
    List<ComponentMetric> result = new ArrayList<>();
    if (nodes == null || !nodes.isArray()) {
      return result;
    }

    double mult = switch (profile == null ? "" : profile.toUpperCase()) {
      case "BURST" -> 2.2;
      case "LINEAR" -> 1.4;
      default -> 1.0;
    };

    // Index nodes and out/in adjacency.
    Map<String, List<String[]>> outLinks = new HashMap<>(); // nodeId -> list of {linkId, target}
    Map<String, List<String[]>> inLinks = new HashMap<>();
    for (JsonNode node : nodes) {
      String id = node.path("id").asText();
      outLinks.put(id, new ArrayList<>());
      inLinks.put(id, new ArrayList<>());
    }
    int autoLink = 0;
    if (links != null && links.isArray()) {
      for (JsonNode link : links) {
        String lid = link.path("id").asText("link-" + (autoLink++));
        String s = link.path("source").asText();
        String t = link.path("target").asText();
        if (outLinks.containsKey(s) && inLinks.containsKey(t)) {
          outLinks.get(s).add(new String[] {lid, t});
          inLinks.get(t).add(new String[] {lid, s});
        }
      }
    }

    // Generated load at CLIENT sources.
    Map<String, Double> generated = new HashMap<>();
    for (JsonNode node : nodes) {
      if ("CLIENT".equalsIgnoreCase(node.path("type").asText())) {
        generated.put(node.path("id").asText(), prop(node, "qps", 100) * mult);
      }
    }

    // Iterative relaxation of link throughput.
    Map<String, Double> linkThroughput = new HashMap<>();
    Map<String, Double> inflow = new HashMap<>();
    for (int iter = 0; iter < ITERATIONS; iter++) {
      for (JsonNode node : nodes) {
        String id = node.path("id").asText();
        double load = generated.getOrDefault(id, 0.0);
        for (String[] in : inLinks.get(id)) {
          load += linkThroughput.getOrDefault(in[0], 0.0);
        }
        inflow.put(id, load);
      }
      for (JsonNode node : nodes) {
        String id = node.path("id").asText();
        double cap = capacity(node);
        double processed = Math.min(inflow.getOrDefault(id, 0.0), cap);
        List<String[]> outs = outLinks.get(id);
        double per = outs.isEmpty() ? 0 : processed / outs.size();
        for (String[] out : outs) {
          linkThroughput.put(out[0], per);
        }
      }
    }

    // Emit metrics.
    for (JsonNode node : nodes) {
      String id = node.path("id").asText();
      double load = inflow.getOrDefault(id, 0.0);
      double cap = capacity(node);
      boolean source = Double.isInfinite(cap);
      double saturation = source ? 0 : Math.min(load / cap, 3);

      double cpu = source ? Math.min(load / 50.0, 100) : Math.min(saturation * 100, 100);
      double overflow = Math.max(0, load - cap);
      double errorRate = source ? 0 : Math.min(overflow / Math.max(cap, 1) * 0.4, 0.35);
      double queueDepth = Math.round(overflow / 10.0);
      double ram = baseMemory(node) + Math.min(saturation, 1) * (peakMemory(node) - baseMemory(node)) * 0.7;
      double qps = source ? load : Math.min(load, cap);

      persistMetric(simulationId, id, "cpu", cpu);
      persistMetric(simulationId, id, "qps", qps);
      persistMetric(simulationId, id, "memory", ram);
      persistMetric(simulationId, id, "queueDepth", queueDepth);
      persistMetric(simulationId, id, "errorRate", errorRate);

      result.add(new ComponentMetric(id, cpu, ram, qps, queueDepth, errorRate));
    }
    return result;
  }

  private static double prop(JsonNode node, String key, double fallback) {
    JsonNode v = node.path("properties").path(key);
    return v.isNumber() ? v.asDouble() : fallback;
  }

  /** Requests/sec a node can service before it queues and drops. */
  private static double capacity(JsonNode node) {
    String type = node.path("type").asText("");
    return switch (type) {
      case "CLIENT" -> Double.POSITIVE_INFINITY;
      case "SERVER" -> prop(node, "cpu_cores", 4) * 250;
      case "CONTAINER" -> prop(node, "cpu_limit", 2) * 200 * prop(node, "replicas", 1);
      case "LAMBDA" -> prop(node, "concurrency_limit", 100) * 12;
      case "VM" -> prop(node, "cpu_cores", 2) * 200;
      case "API_GATEWAY" -> prop(node, "rate_limit_rps", 1000);
      case "LOAD_BALANCER" -> prop(node, "max_connections", 10000) * 0.6;
      case "CDN" -> 40000;
      case "DNS" -> 20000;
      case "FIREWALL" -> prop(node, "max_rules", 100) * 60;
      case "S3_BUCKET" -> 5500;
      case "EBS_VOLUME" -> prop(node, "iops", 3000);
      case "BLOCK_STORAGE" -> prop(node, "iops", 1000);
      case "POSTGRESQL", "MYSQL" -> prop(node, "max_connections", 100) * 22;
      case "MONGODB" -> prop(node, "replica_set_members", 3) * 900;
      case "DYNAMODB" -> (prop(node, "read_capacity", 5) + prop(node, "write_capacity", 5)) * 30;
      case "CASSANDRA" -> prop(node, "num_nodes", 3) * 1200;
      case "REDIS" -> 90000;
      case "MEMCACHED" -> prop(node, "max_connections", 1024) * 80;
      case "KAFKA" -> prop(node, "partitions", 12) * 2500;
      case "RABBITMQ" -> 12000;
      case "SQS", "SNS" -> 30000;
      case "PROMETHEUS", "GRAFANA", "CLOUDWATCH" -> 8000;
      case "WAF" -> prop(node, "rate_limit", 2000);
      case "IAM", "SECRETS_MANAGER" -> 6000;
      case "K8S_CLUSTER" -> prop(node, "node_count", 3) * 3000;
      case "K8S_DEPLOYMENT" -> prop(node, "replicas", 3) * 800;
      case "K8S_SERVICE", "K8S_INGRESS" -> 15000;
      default -> 5000;
    };
  }

  private static double baseMemory(JsonNode node) {
    String type = node.path("type").asText("");
    return switch (type) {
      case "SERVER" -> prop(node, "memory_gb", 16) * 1024 * 0.15;
      case "VM" -> prop(node, "memory_gb", 4) * 1024 * 0.2;
      case "CONTAINER" -> prop(node, "memory_limit", 512) * 0.25;
      case "LAMBDA" -> prop(node, "memory_mb", 256) * 0.3;
      case "REDIS" -> prop(node, "maxmemory_mb", 256) * 0.2;
      case "MEMCACHED" -> prop(node, "memory_mb", 256) * 0.2;
      default -> 128;
    };
  }

  private static double peakMemory(JsonNode node) {
    String type = node.path("type").asText("");
    return switch (type) {
      case "SERVER" -> prop(node, "memory_gb", 16) * 1024;
      case "VM" -> prop(node, "memory_gb", 4) * 1024;
      case "CONTAINER" -> prop(node, "memory_limit", 512);
      case "LAMBDA" -> prop(node, "memory_mb", 256);
      case "REDIS" -> prop(node, "maxmemory_mb", 256);
      case "MEMCACHED" -> prop(node, "memory_mb", 256);
      default -> 512;
    };
  }

  private void persistMetric(String simulationId, String componentId, String name, double value) {
    SimulationMetric metric = new SimulationMetric();
    metric.simulationId = simulationId;
    metric.componentId = componentId;
    metric.metricName = name;
    metric.recordedAtMs = System.currentTimeMillis();
    metric.value = value;
    metrics.save(metric);
  }

  public record ComponentMetric(
      String id,
      double cpuUsage,
      double ramUsageMb,
      double qps,
      double queueDepth,
      double errorRate
  ) {}
  public record SimulationSnapshot(String simulationId, String status, List<ComponentMetric> components) {}
  public record MetricSeries(
      String simulationId,
      String componentId,
      String metric,
      List<Long> timestamps,
      List<Double> values
  ) {}
}

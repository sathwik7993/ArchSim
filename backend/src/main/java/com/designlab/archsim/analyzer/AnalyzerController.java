package com.designlab.archsim.analyzer;

import com.designlab.archsim.project.CanvasState;
import com.designlab.archsim.project.CanvasStateRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/analyzer/projects")
public class AnalyzerController {
  private final CanvasStateRepository canvasStates;

  public AnalyzerController(CanvasStateRepository canvasStates) {
    this.canvasStates = canvasStates;
  }

  @PostMapping("/{projectId}")
  public AnalyzerReport analyze(@PathVariable String projectId) {
    CanvasState canvas = canvasStates.findById(projectId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Canvas not found"));
    List<Issue> issues = new ArrayList<>();
    JsonNode nodes = canvas.nodes;

    if (nodes != null && nodes.isArray()) {
      long databases = countType(nodes, "POSTGRESQL");
      long loadBalancers = countType(nodes, "LOAD_BALANCER");
      long caches = countType(nodes, "REDIS");
      long services = countType(nodes, "VM") + countType(nodes, "SERVICE");

      if (databases == 1) {
        issues.add(new Issue("database", "WARNING", "SPOF",
            "Only one database node exists in the design.",
            "Add a replica or model failover before relying on this architecture."));
      }
      if (services > 1 && loadBalancers == 0) {
        issues.add(new Issue("edge", "WARNING", "BOTTLENECK",
            "Multiple compute nodes exist without a load balancer.",
            "Add a load balancer in front of the service tier."));
      }
      if (databases > 0 && caches == 0) {
        issues.add(new Issue("cache", "INFO", "COST",
            "Database reads have no cache layer in front of them.",
            "Add Redis for high-read workloads and compare simulated QPS reduction."));
      }
    }

    String summary = issues.isEmpty()
        ? "No obvious topology issues were found by the rule-based analyzer."
        : "Rule-based analyzer found " + issues.size() + " architecture issue(s).";
    return new AnalyzerReport(summary, issues);
  }

  private long countType(JsonNode nodes, String type) {
    long count = 0;
    for (JsonNode node : nodes) {
      if (type.equalsIgnoreCase(node.path("type").asText())) {
        count++;
      }
    }
    return count;
  }

  public record AnalyzerReport(String summary, List<Issue> issues) {}
  public record Issue(String componentId, String severity, String category, String description, String fix) {}
}


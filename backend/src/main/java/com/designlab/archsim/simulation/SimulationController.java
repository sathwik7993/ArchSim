package com.designlab.archsim.simulation;

import java.security.Principal;
import java.util.Map;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/simulations")
public class SimulationController {
  private final SimulationService simulationService;
  private final SimpMessagingTemplate messagingTemplate;

  public SimulationController(SimulationService simulationService, SimpMessagingTemplate messagingTemplate) {
    this.simulationService = simulationService;
    this.messagingTemplate = messagingTemplate;
  }

  @PostMapping("/start")
  public SimulationService.SimulationSnapshot start(@RequestBody StartSimulationRequest request, Principal principal) {
    SimulationService.SimulationSnapshot snapshot = simulationService.start(
        request.projectId(),
        principal.getName(),
        request.trafficProfile(),
        request.seed() == null ? 42L : request.seed()
    );
    messagingTemplate.convertAndSend("/topic/simulations/" + snapshot.simulationId() + "/metrics", snapshot);
    return snapshot;
  }

  @PostMapping("/{simulationId}/stop")
  public Map<String, String> stop(@PathVariable String simulationId) {
    SimulationRun run = simulationService.stop(simulationId);
    return Map.of("simulationId", run.id, "status", run.status);
  }

  @GetMapping("/{simulationId}/metrics")
  public SimulationService.MetricSeries metrics(
      @PathVariable String simulationId,
      @RequestParam String componentId,
      @RequestParam String metricName
  ) {
    return simulationService.getMetrics(simulationId, componentId, metricName);
  }

  public record StartSimulationRequest(String projectId, String trafficProfile, Integer durationSeconds, Long seed) {}
}


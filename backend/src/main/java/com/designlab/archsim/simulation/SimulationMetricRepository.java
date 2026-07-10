package com.designlab.archsim.simulation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationMetricRepository extends JpaRepository<SimulationMetric, Long> {
  List<SimulationMetric> findBySimulationIdAndComponentIdAndMetricNameOrderByRecordedAtMs(
      String simulationId,
      String componentId,
      String metricName
  );
}


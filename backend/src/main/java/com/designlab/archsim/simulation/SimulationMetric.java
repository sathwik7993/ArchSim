package com.designlab.archsim.simulation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "simulation_metrics")
public class SimulationMetric {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  public Long id;

  @Column(name = "simulation_id")
  public String simulationId;

  @Column(name = "component_id")
  public String componentId;

  @Column(name = "metric_name")
  public String metricName;

  @Column(name = "recorded_at_ms")
  public long recordedAtMs;

  public double value;
}


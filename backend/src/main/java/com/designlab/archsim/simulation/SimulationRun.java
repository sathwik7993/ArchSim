package com.designlab.archsim.simulation;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "simulation_runs")
public class SimulationRun {
  @Id
  public String id;

  @Column(name = "project_id")
  public String projectId;

  @Column(name = "started_by")
  public String startedBy;

  @Column(name = "started_at")
  public Instant startedAt = Instant.now();

  @Column(name = "ended_at")
  public Instant endedAt;

  public String status;

  @Column(name = "traffic_profile")
  public String trafficProfile;

  public long seed;
}


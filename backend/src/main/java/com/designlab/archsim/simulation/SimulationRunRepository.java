package com.designlab.archsim.simulation;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SimulationRunRepository extends JpaRepository<SimulationRun, String> {
  List<SimulationRun> findByProjectIdOrderByStartedAtDesc(String projectId);
}


package com.designlab.archsim.simulation;

import java.util.Comparator;
import java.util.PriorityQueue;

public class EventScheduler {
  private final PriorityQueue<SimulationEvent> queue = new PriorityQueue<>(
      Comparator.comparingLong(SimulationEvent::scheduledTimeMs).thenComparing(SimulationEvent::eventType)
  );

  public void schedule(SimulationEvent event) {
    queue.add(event);
  }

  public int size() {
    return queue.size();
  }

  public void runToCompletion() {
    while (!queue.isEmpty()) {
      queue.poll().handler().run();
    }
  }
}


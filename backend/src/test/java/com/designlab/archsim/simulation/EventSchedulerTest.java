package com.designlab.archsim.simulation;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class EventSchedulerTest {
  @Test
  void executesEventsInScheduledTimeOrder() {
    EventScheduler scheduler = new EventScheduler();
    List<String> executionLog = new ArrayList<>();

    scheduler.schedule(new SimulationEvent(200, "EVT_2", "node-b", () -> executionLog.add("second")));
    scheduler.schedule(new SimulationEvent(100, "EVT_1", "node-a", () -> executionLog.add("first")));

    scheduler.runToCompletion();

    assertEquals(List.of("first", "second"), executionLog);
    assertEquals(0, scheduler.size());
  }
}


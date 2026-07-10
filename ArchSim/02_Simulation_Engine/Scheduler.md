# ArchSim Simulation Scheduler Specification

This document details the priority-queue-based event scheduler that coordinates all discrete simulation operations.

---

## 1. Priority Queue Scheduler Design
At the core of the scheduler is a **Min-Heap Priority Queue** ordered by the event's virtual execution timestamp ($T_e$). If multiple events share the exact same timestamp, tie-breaker priorities are applied:

$$\text{Event Order} = (T_e, \text{Priority\_Class}, \text{Sequence\_Number})$$

### 1.1. Priority Class Ranking (Tie-Breakers)
To prevent race conditions and ensure logical consistency (e.g. database locks releasing before subsequent transactions attempt to write):

| Rank | Priority Class | Description |
| :--- | :--- | :--- |
| **1** | `SYSTEM_CHAOS` | Failures, network splits, server crashes |
| **2** | `DB_RECOVERY` | Commit completions, locks releasing |
| **3** | `NETWORK_PACKET` | Packet arrivals, connection drops |
| **4** | `COMPUTE_PROCESS`| Web VM processing events, caches lookups |
| **5** | `METRICS_TICK` | High-frequency telemetry updates |

---

## 2. Java Scheduler Execution Loop
The scheduler loop is written using high-efficiency structures in Java. It implements wall-clock pacing to synchronize virtual time with real time based on the active Speed Factor:

```java
public class EventScheduler implements Runnable {
    private final PriorityQueue<SimulationEvent> eventQueue = new PriorityQueue<>(
        Comparator.comparingLong(SimulationEvent::getScheduledTimeMs)
                  .thenComparingInt(SimulationEvent::getPriorityClass)
                  .thenComparingLong(SimulationEvent::getSequenceNumber)
    );
    private final AtomicBoolean isPaused = new AtomicBoolean(true);
    
    private long virtualTimeMs = 0;
    private long startWallTimeMs = 0;
    private long startVirtualTimeMs = 0;
    private double speedFactor = 1.0; // e.g. 10.0 for 10x virtual speed

    public void run() {
        startWallTimeMs = System.currentTimeMillis();
        startVirtualTimeMs = virtualTimeMs;

        while (!isPaused.get()) {
            SimulationEvent event = eventQueue.peek();
            if (event == null) {
                break; // No events remaining
            }

            long eventTime = event.getScheduledTimeMs();
            
            // Wall-clock throttle calculation
            if (eventTime > virtualTimeMs) {
                long virtualDelta = eventTime - startVirtualTimeMs;
                long targetElapsedWall = (long) (virtualDelta / speedFactor);
                long actualElapsedWall = System.currentTimeMillis() - startWallTimeMs;
                long delayNeeded = targetElapsedWall - actualElapsedWall;

                if (delayNeeded > 0) {
                    try {
                        Thread.sleep(delayNeeded);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
                virtualTimeMs = eventTime;
            }

            // Pop and process all events scheduled for the current virtual timestamp
            while (event != null && event.getScheduledTimeMs() <= virtualTimeMs) {
                eventQueue.poll();
                dispatchEvent(event);
                event = eventQueue.peek();
            }
        }
    }

    private void dispatchEvent(SimulationEvent event) {
        Component target = ComponentRegistry.get(event.getTargetId());
        if (target != null) {
            target.handleEvent(event, this);
        }
    }
}
```

---

## 3. Thread Safety & Real-Time Sync
* **Thread Partitioning**: The scheduler executes within a dedicated single-threaded thread pool to guarantee event processing order.
* **Non-blocking Insertion**: External events (e.g. user-triggered failure injections or real-time configuration changes) are submitted using thread-safe channels (`java.util.concurrent.ConcurrentLinkedQueue`) and merged into the priority queue at the start of the next scheduler tick.
* **Client Synchronization**: Tick progression is throttled on the server if the client visual queue cannot keep up with metrics packets, maintaining a smooth visualization frame rate.

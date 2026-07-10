# Unit Testing Specification

This document details the testing frameworks, code coverage requirements, and mocking strategies for the ArchSim frontend and backend projects.

---

## 1. Frontend Unit Testing
* **Framework**: Vitest + React Testing Library.
* **Coverage Target**: Minimum $80\%$ code coverage on utility functions, state reducers, and core canvas model manipulation modules.
* **Component Testing**: Canvas nodes are tested by asserting correct class updates and style mapping responses based on simulated component states.

---

## 2. Backend Unit Testing
* **Framework**: JUnit 5 + Mockito.
* **Coverage Target**: Minimum $85\%$ code coverage on service layers and discrete event scheduler classes.
* **Database Mocking**: Relational database operations are tested using an in-memory database engine (H2 or testcontainers PostgreSQL instances) to ensure migration scripts and repository queries run successfully.

---

## 3. Reference Test Script Example
```java
// JUnit Test for Discrete Event Scheduler
class EventSchedulerTest {
    @Test
    void testEventExecutionOrder() {
        EventScheduler scheduler = new EventScheduler();
        List<String> executionLog = new ArrayList<>();

        scheduler.schedule(new SimulationEvent(200, "EVT_2", () -> executionLog.add("second")));
        scheduler.schedule(new SimulationEvent(100, "EVT_1", () -> executionLog.add("first")));

        scheduler.runToCompletion();

        assertEquals(List.of("first", "second"), executionLog);
    }
}
```
* **Assertion Rules**: Tests must assert execution logs to confirm event execution timestamps and priority rank sorting functions resolve correctly.
* **Execution**: Tests run automatically on PR submission using GitHub Actions pipelines.

# Coding Standards Specification

This document details the code formatting rules, architectural guidelines, and styling conventions for the ArchSim project.

---

## 1. Frontend Development Guidelines (TypeScript / React)
* **Functional Components**: Use functional components with hooks. Avoid class components.
* **Typing Rules**: Strict type safety. The compiler flags `noImplicitAny: true` must be enabled.
* **Component Responsibilities**: UI components must remain clean and visual. State transitions must be managed using specialized context providers or state libraries (e.g. Zustand/Redux).
* **Styling Guidelines**: Use predefined layout properties. Hardcoded styling values (colors, dimensions) must be avoided in favor of CSS variables defined in `index.css`.

---

## 2. Backend Development Guidelines (Java / Spring Boot)
* **Design Patterns**: Use clean architecture patterns. Controller layers manage HTTP mapping, Service layers coordinate transaction boundaries, and Repository layers interface with PostgreSQL.
* **Performance Considerations**:
  * Use JVM collections optimized for concurrency (`ConcurrentHashMap`, `ConcurrentLinkedQueue`) inside the multi-threaded simulation engine.
  * Minimize garbage collection allocations by reusing event objects where possible (object pools).
* **Logging Standards**: Use SLF4J logger interfaces. Log messages must include transaction or simulation context tags:
  ```java
  log.info("[SimulationID: {}] Component {} transition to FAILED state.", simId, componentId);
  ```

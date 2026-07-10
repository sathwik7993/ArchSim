# Development Milestones Specification

This document details the scheduling, sprint goals, and quality gates for the ArchSim development timeline.

---

## 1. Release Sprint Cadence
* **Sprint Cycle**: 2-week iterations.
* **Sprint Planning**: Every second Monday to define task backlogs.
* **Sprint Review**: Every second Friday. Includes live demos of active visual canvas features or backend simulation improvements.
* **Feature Flagging**: All new simulation mechanics (e.g. Raft consensus, Autoscaling) are deployed behind feature flags to isolate testing.

---

## 2. Quality Gates for Release Targets
Before moving a milestone from development to staging or production, the codebase must pass:
* **Linter Compliance**: Zero errors in ESLint/Prettier (frontend) and Checkstyle/SpotBugs (backend).
* **Test Coverage**: Unit tests coverage must meet the target parameters ($>80\%$ client, $>85\%$ backend).
* **Automated Builds**: Pull request builds must succeed on GitHub Actions runner environments.
* **Performance Validation**: Benchmark checks must confirm rendering speeds ($>60\text{ FPS}$) and event throughput rates ($>200\text{k events/s}$).

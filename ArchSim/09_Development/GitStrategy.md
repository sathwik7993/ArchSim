# Git Strategy Specification

This document details the branch management, commit naming conventions, and pull request review workflows used in the ArchSim repository.

---

## 1. Branch Naming Rules
We follow a Git Flow style naming structure. Developers create target feature branches off the `develop` branch:
* `feature/<ticket-id>-description`: For new features (e.g. `feature/AS-112-add-redis-node`).
* `bugfix/<ticket-id>-description`: For bug fixes (e.g. `bugfix/AS-443-fix-packet-retransmission`).
* `hotfix/<ticket-id>-description`: Emergency patches applied directly to `main`.
* `release/v<semver>`: Preparation branch for new releases.

---

## 2. Commit Message Convention
Commits must follow Conventional Commits guidelines to support automated changelog creation:
```
<type>(<scope>): <short summary description>

[Optional body text details]

[Optional footer metadata references, e.g. Co-authored-by, Refs #112]
```
* **Supported Types**:
  * `feat`: New feature development.
  * `fix`: Bug resolution.
  * `docs`: Documentation edits.
  * `style`: Formatting, missing semi-colons (no logical code updates).
  * `refactor`: Restructuring code files without altering behaviors.
  * `test`: Adding or correcting tests.

---

## 3. Pull Request Review Guidelines
* **Approvals**: Every pull request requires at least 1 peer approval before it can be merged.
* **Checks**: All CI pipelines (compilation, unit tests, linters) must resolve successfully.
* **Clean History**: PRs are merged using "Squash and Merge" policies to keep the target branch commits lineage clean.

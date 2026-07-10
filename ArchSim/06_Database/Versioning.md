# ArchSim Architecture Versioning Specification

This document details the data structures and version-control model designed to support branching, commits, and rollback of system architecture layouts.

---

## 1. Git-like Versioning Schema

To allow users to version their designs, ArchSim implements a lightweight Git-like commit structure within the relational database.

```
+-------------------------------------------------------+
|  Branch (e.g. main) ────────────────► Head Commit     |
|                                            │          |
|  Commit B (V2: Added Redis Cache) ◄────────┘          |
|       │                                               |
|  Commit A (V1: Initial VM & Postgres Setup)           |
+-------------------------------------------------------+
```

### 1.1. Versioning Tables
```sql
-- Commits Table
CREATE TABLE project_commits (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
    parent_commit_id VARCHAR(64) REFERENCES project_commits(id),
    author_id VARCHAR(64) NOT NULL,
    commit_message VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    canvas_snapshot_json JSONB NOT NULL -- Stores delta-compressed schema state
);

-- Branches Table
CREATE TABLE project_branches (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL, -- e.g. 'main', 'dev-cache-test'
    head_commit_id VARCHAR(64) REFERENCES project_commits(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, name)
);
```

---

## 2. Branching & Merging Conflict Logic

### 2.1. Creating a Branch
1. User requests a branch clone: `POST /api/v1/projects/{projectId}/branches`.
2. A new row is inserted into `project_branches` setting the `head_commit_id` to the parent branch's current HEAD.
3. No file duplication is required; both branches reference the same parent commit lineage.

### 2.2. Merging Branches
1. The backend compares the JSON structures of the target and source branch HEAD commits.
2. If conflicts exist (e.g. same node ID modified in both branches):
  * **Visual Confict**: The UI renders a merge split-screen overlay, highlighting conflicting components in yellow.
  * **Resolution**: The user selects which property version to keep or accepts both by auto-generating a new node ID.
3. On merge approval, a merge commit is generated referencing both parent branch commits.

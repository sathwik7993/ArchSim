-- Phase 8 — problem catalog + per-user practice progress.
-- The catalog is static reference content seeded on startup from
-- classpath:seed/problems.json; progress is dynamic, per-user data.

CREATE TABLE problems (
  slug        VARCHAR(128) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  difficulty  VARCHAR(16)  NOT NULL,
  topic       VARCHAR(32)  NOT NULL,
  summary     TEXT,
  note        TEXT,
  sources     JSONB NOT NULL DEFAULT '[]'::jsonb,
  solution    JSONB NOT NULL,
  ref_arch    JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_problems_topic ON problems(topic);
CREATE INDEX idx_problems_difficulty ON problems(difficulty);

CREATE TABLE problem_progress (
  user_id     VARCHAR(64)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug        VARCHAR(128) NOT NULL REFERENCES problems(slug) ON DELETE CASCADE,
  status      VARCHAR(16)  NOT NULL CHECK (status IN ('attempted', 'solved')),
  updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, slug)
);

CREATE INDEX idx_problem_progress_user ON problem_progress(user_id);

CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tenant_id VARCHAR(64) NOT NULL,
  owner_id VARCHAR(64) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  version INT DEFAULT 1
);

CREATE TABLE canvas_states (
  project_id VARCHAR(64) PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  nodes JSONB NOT NULL,
  links JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE simulation_runs (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) REFERENCES projects(id) ON DELETE CASCADE,
  started_by VARCHAR(64) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMPTZ,
  status VARCHAR(32) CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  traffic_profile VARCHAR(64) NOT NULL,
  seed BIGINT NOT NULL
);

CREATE TABLE simulation_metrics (
  id BIGSERIAL PRIMARY KEY,
  simulation_id VARCHAR(64) REFERENCES simulation_runs(id) ON DELETE CASCADE,
  component_id VARCHAR(64) NOT NULL,
  metric_name VARCHAR(64) NOT NULL,
  recorded_at_ms BIGINT NOT NULL,
  value DOUBLE PRECISION NOT NULL
);

CREATE INDEX idx_canvas_nodes_gin ON canvas_states USING gin (nodes);
CREATE INDEX idx_sim_runs_project ON simulation_runs(project_id, started_at DESC);
CREATE INDEX idx_metrics_lookup ON simulation_metrics(simulation_id, component_id, metric_name, recorded_at_ms);


-- Practice workspaces are linked to a problem by slug; persist it so a signed-in
-- student's practice projects round-trip across devices (not just local-only).
ALTER TABLE projects ADD COLUMN problem_slug VARCHAR(128);

CREATE INDEX idx_projects_owner_slug ON projects(owner_id, problem_slug);

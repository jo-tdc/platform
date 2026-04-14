-- Migration 005 : autoriser les statuts 'done' et 'deleted' sur les projets
ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft', 'active', 'archived', 'done', 'deleted'));

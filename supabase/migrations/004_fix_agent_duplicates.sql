-- Migration 004 : dédoublonner project_agents + contrainte UNIQUE

-- 1. Supprimer les doublons : garder l'entrée la plus ancienne par (project_id, template_id)
DELETE FROM project_agents
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id, template_id) id
  FROM project_agents
  ORDER BY project_id, template_id, created_at ASC
);

-- 2. Ajouter la contrainte UNIQUE pour empêcher les futurs doublons
ALTER TABLE project_agents
  ADD CONSTRAINT project_agents_project_template_unique
  UNIQUE (project_id, template_id);

-- 3. Vider le cache compiled_prompt (sera recompilé avec les nouveaux prompts)
UPDATE project_agents SET compiled_prompt = NULL;

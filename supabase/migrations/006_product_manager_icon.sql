-- Migration 006 : mise à jour de l'icône du Product Manager (target → chart)
UPDATE agent_templates SET icon = 'chart' WHERE name = 'The Product Manager';

-- COUCHE 1 : Utilisateurs & accès

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR UNIQUE NOT NULL,
  full_name     VARCHAR NOT NULL,
  avatar_url    VARCHAR,
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_seen_at  TIMESTAMPTZ
);

CREATE TABLE user_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan        VARCHAR NOT NULL CHECK (plan IN ('bootcamp','trial','free','pro','editor','admin')),
  started_at  TIMESTAMPTZ DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN DEFAULT true
);

CREATE INDEX idx_user_plans_user_active ON user_plans(user_id, is_active);

CREATE TABLE cohorts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR NOT NULL,
  starts_at  DATE NOT NULL,
  ends_at    DATE NOT NULL,
  is_open    BOOLEAN DEFAULT false
);

CREATE TABLE cohort_members (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cohort_id  UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, cohort_id)
);

-- COUCHE 2 : Curriculum (Mode Apprendre)

CREATE TABLE weeks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position     SMALLINT NOT NULL,
  title        VARCHAR NOT NULL,
  description  TEXT,
  is_published BOOLEAN DEFAULT false
);

CREATE TABLE modules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id        UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  position       SMALLINT NOT NULL,
  title          VARCHAR NOT NULL,
  slug           VARCHAR UNIQUE NOT NULL,
  description    TEXT,
  ai_context     TEXT,
  required_plan  VARCHAR DEFAULT 'free' CHECK (required_plan IN ('free','pro')),
  is_published   BOOLEAN DEFAULT false
);

CREATE TABLE lessons (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id          UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  position           SMALLINT NOT NULL,
  title              VARCHAR NOT NULL,
  type               VARCHAR NOT NULL CHECK (type IN ('video','figma','resource','ui_challenge','text')),
  content_url        VARCHAR,
  content_body       TEXT,
  estimated_minutes  SMALLINT,
  is_published       BOOLEAN DEFAULT false
);

CREATE TABLE lesson_completions (
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id         UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at      TIMESTAMPTZ DEFAULT now(),
  time_spent_secs   INTEGER,
  PRIMARY KEY (user_id, lesson_id)
);

-- COUCHE 3 : Projets (Mode Pratiquer)

CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR NOT NULL,
  brief_text      TEXT,
  brief_summary   TEXT,
  status          VARCHAR DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_user ON projects(user_id);

CREATE TABLE project_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name       VARCHAR NOT NULL,
  file_type       VARCHAR NOT NULL CHECK (file_type IN ('pdf','image','link')),
  storage_url     VARCHAR NOT NULL,
  extracted_text  TEXT,
  uploaded_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agent_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR NOT NULL,
  description         TEXT NOT NULL,
  base_system_prompt  TEXT NOT NULL,
  context_variables   JSONB,
  icon                VARCHAR,
  position            SMALLINT,
  is_published        BOOLEAN DEFAULT false
);

CREATE TABLE project_agents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id      UUID NOT NULL REFERENCES agent_templates(id),
  custom_name      VARCHAR,
  context_values   JSONB,
  compiled_prompt  TEXT,
  prompt_version   INTEGER DEFAULT 1,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- COUCHE 4 : Sessions IA

CREATE TABLE ai_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_type          VARCHAR CHECK (agent_type IN ('tutor','general','practice_chat','practice_agent')),
  context_module_id   UUID REFERENCES modules(id),
  project_id          UUID REFERENCES projects(id),
  project_agent_id    UUID REFERENCES project_agents(id),
  started_at          TIMESTAMPTZ DEFAULT now(),
  ended_at            TIMESTAMPTZ,
  total_tokens_used   INTEGER DEFAULT 0,
  message_count       INTEGER DEFAULT 0
);

CREATE INDEX idx_ai_sessions_user ON ai_sessions(user_id);
CREATE INDEX idx_ai_sessions_project ON ai_sessions(project_id);

CREATE TABLE ai_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role        VARCHAR NOT NULL CHECK (role IN ('user','assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  tokens_used INTEGER
);

CREATE INDEX idx_ai_messages_session ON ai_messages(session_id, created_at);

-- VUE : Rate limiting trial

CREATE VIEW trial_daily_usage AS
SELECT
  s.user_id,
  SUM(s.message_count) AS messages_today
FROM ai_sessions s
JOIN user_plans p ON p.user_id = s.user_id
  AND p.is_active = true
  AND p.plan = 'trial'
WHERE s.started_at >= CURRENT_DATE
GROUP BY s.user_id;

-- TRIGGER : updated_at automatique sur projects

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

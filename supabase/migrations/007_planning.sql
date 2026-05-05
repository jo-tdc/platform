-- Migration 007: Planning (mentors, schedules, schedule_blocks)

CREATE TABLE mentors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR NOT NULL,
  job_title  VARCHAR,
  photo_url  VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE schedules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id  UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  starts_at  DATE NOT NULL,
  ends_at    DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cohort_id)
);

CREATE TABLE schedule_blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  period      VARCHAR NOT NULL CHECK (period IN ('morning', 'afternoon')),
  type        VARCHAR NOT NULL CHECK (type IN ('theory', 'practice')),
  title       VARCHAR NOT NULL,
  mentor_id   UUID REFERENCES mentors(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(schedule_id, date, period)
);

-- Migration 008: add is_published to schedules
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Remove unique constraint on cohort_id to allow duplicate schedules for different batches
-- (kept as is — each cohort still has one schedule max)

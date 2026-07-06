-- NANASTOTO Database Schema
-- Execute this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  max_concurrent integer DEFAULT 1,
  quota_break_long_per_day integer DEFAULT 4,
  quota_break_short_per_day integer DEFAULT 3,
  quota_toilet_per_day integer DEFAULT -1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- STAFF TABLE
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role_id uuid REFERENCES roles(id),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- SHIFTS TABLE
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cutoff_time time NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id),
  shift_id uuid REFERENCES shifts(id),
  check_in_time timestamptz NOT NULL,
  date date NOT NULL,
  status text CHECK (status IN ('ON_TIME','LATE')),
  photo_url text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz DEFAULT now()
);

-- BREAK RECORDS TABLE
CREATE TABLE IF NOT EXISTS break_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id),
  break_type text CHECK (break_type IN ('toilet','smoking','meal')),
  start_time timestamptz NOT NULL,
  deadline timestamptz NOT NULL,
  return_time timestamptz,
  duration_minutes integer NOT NULL,
  date date NOT NULL,
  status text CHECK (status IN ('ACTIVE','ON_TIME','LATE','FORCE_STOPPED','AUTO_CLOSED')),
  overtime_seconds integer DEFAULT 0,
  photo_start_url text,
  photo_return_url text,
  latitude_start double precision,
  longitude_start double precision,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- DAILY USAGE TABLE
CREATE TABLE IF NOT EXISTS daily_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id),
  date date NOT NULL,
  break_long_count integer DEFAULT 0,
  break_short_count integer DEFAULT 0,
  toilet_count integer DEFAULT 0,
  UNIQUE(staff_id, date)
);

-- SYSTEM CONFIG TABLE
CREATE TABLE IF NOT EXISTS system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- SYSTEM LOGS TABLE
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details jsonb,
  triggered_by text DEFAULT 'system',
  created_at timestamptz DEFAULT now()
);

-- REGULATIONS TABLE
CREATE TABLE IF NOT EXISTS regulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- CHAT MESSAGES TABLE (for chat-nanastoto)
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL,
  sender_name text NOT NULL,
  message text NOT NULL,
  encrypted boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- SHIFT HANDOVER TABLE
CREATE TABLE IF NOT EXISTS shift_handover (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id text NOT NULL,
  staff_name text NOT NULL,
  notes text NOT NULL,
  shift_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- SYSTEM ALERTS TABLE
CREATE TABLE IF NOT EXISTS system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text CHECK (severity IN ('low','medium','high','critical')) DEFAULT 'low',
  read boolean DEFAULT false,
  telegram_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE break_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE regulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handover ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for authenticated users
CREATE POLICY "Allow all" ON roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON shifts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON attendance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON break_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON daily_usage FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON system_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON system_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON regulations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON shift_handover FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON system_alerts FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE roles;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE break_records;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_usage;
ALTER PUBLICATION supabase_realtime ADD TABLE system_config;
ALTER PUBLICATION supabase_realtime ADD TABLE system_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE regulations;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE shift_handover;
ALTER PUBLICATION supabase_realtime ADD TABLE system_alerts;

-- Insert default data
INSERT INTO roles (name, max_concurrent, quota_break_long_per_day, quota_break_short_per_day, quota_toilet_per_day) VALUES
  ('Kasir', 2, 4, 3, -1),
  ('Kapten', 1, 4, 3, -1),
  ('CS', 1, 4, 3, -1),
  ('CS LINE', 1, 4, 3, -1)
ON CONFLICT DO NOTHING;

INSERT INTO shifts (name, cutoff_time, active) VALUES
  ('Shift Pagi', '08:00:00', true),
  ('Shift Siang', '14:00:00', true),
  ('Shift Malam', '22:00:00', true)
ON CONFLICT DO NOTHING;

INSERT INTO system_config (key, value) VALUES
  ('app_name', '"NANASTOTO"'),
  ('admin_password', '"nasdes"'),
  ('break_durations', '{"toilet": 15, "smoking": 15, "meal": 8}'),
  ('late_tolerance_seconds', '59'),
  ('telegram_bot_token', '""'),
  ('telegram_chat_id', '""'),
  ('telegram_enabled', 'false'),
  ('text_color_mode', '"auto"'),
  ('regulations', '""'),
  ('photo_retention_days', '7'),
  ('last_daily_reset', 'null'),
  ('last_weekly_cleanup', 'null')
ON CONFLICT (key) DO NOTHING;

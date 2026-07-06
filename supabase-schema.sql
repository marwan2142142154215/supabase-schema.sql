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
  break_type text CHECK (break_type IN ('keluar','meal')),
  start_time timestamptz NOT NULL,
  deadline timestamptz,
  return_time timestamptz,
  duration_minutes integer,
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
  file_url text,
  file_type text,
  group_id uuid,
  created_at timestamptz DEFAULT now()
);

-- CHAT GROUPS TABLE
CREATE TABLE IF NOT EXISTS chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- CHAT GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS chat_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES chat_groups(id) ON DELETE CASCADE,
  staff_id text NOT NULL,
  joined_at timestamptz DEFAULT now()
);

-- ROLE PERMISSIONS TABLE (RBAC)
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_key)
);

-- STAFF PERMISSIONS TABLE (individual overrides)
CREATE TABLE IF NOT EXISTS staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  permission_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, permission_key)
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
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "Allow all" ON chat_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON chat_group_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON role_permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON staff_permissions FOR ALL USING (true) WITH CHECK (true);
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
ALTER PUBLICATION supabase_realtime ADD TABLE chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE role_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE shift_handover;
ALTER PUBLICATION supabase_realtime ADD TABLE system_alerts;

-- Insert default data
INSERT INTO roles (name, max_concurrent, quota_break_long_per_day, quota_break_short_per_day) VALUES
  ('LEADER', 5, 10, 10),
  ('KAPTEN', 1, 4, 3),
  ('CS', 1, 4, 3),
  ('CS LINE', 1, 4, 3),
  ('KASIR', 2, 4, 3)
ON CONFLICT DO NOTHING;

INSERT INTO shifts (name, cutoff_time, active) VALUES
  ('Shift Pagi', '08:00:00', true),
  ('Shift Siang', '14:00:00', true),
  ('Shift Malam', '22:00:00', true)
ON CONFLICT DO NOTHING;

INSERT INTO system_config (key, value) VALUES
  ('app_name', '"NANASTOTO"'),
  ('admin_password', '"nasdes"'),
  ('break_durations', '{"keluar": 15, "meal": 8}'),
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

-- Assign all permissions to LEADER role by default
DO $$
DECLARE
  leader_id uuid;
BEGIN
  SELECT id INTO leader_id FROM roles WHERE name = 'LEADER' LIMIT 1;
  IF leader_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_key) VALUES
      (leader_id, 'access_master_panel'),
      (leader_id, 'manage_staff'),
      (leader_id, 'manage_shifts'),
      (leader_id, 'manage_roles'),
      (leader_id, 'manage_permissions'),
      (leader_id, 'manage_regulations'),
      (leader_id, 'manage_telegram'),
      (leader_id, 'manage_appearance'),
      (leader_id, 'manage_security'),
      (leader_id, 'manage_photos'),
      (leader_id, 'view_reports'),
      (leader_id, 'view_analytics'),
      (leader_id, 'view_monitor'),
      (leader_id, 'view_system_alerts'),
      (leader_id, 'view_staff_directory'),
      (leader_id, 'view_break_analytics'),
      (leader_id, 'view_performance_dashboard'),
      (leader_id, 'view_emergency_logs'),
      (leader_id, 'view_quota_overview'),
      (leader_id, 'view_shift_summary'),
      (leader_id, 'view_shift_handover'),
      (leader_id, 'view_all_history'),
      (leader_id, 'emergency_stop'),
      (leader_id, 'emergency_stop_all'),
      (leader_id, 'daily_reset'),
      (leader_id, 'export_csv'),
      (leader_id, 'access_chat'),
      (leader_id, 'create_chat_group'),
      (leader_id, 'upload_chat_files'),
      (leader_id, 'manage_chat')
    ON CONFLICT (role_id, permission_key) DO NOTHING;
  END IF;
END $$;

-- Assign basic permissions to KAPTEN and CS LINE
DO $$
DECLARE
  kapten_id uuid;
  csline_id uuid;
BEGIN
  SELECT id INTO kapten_id FROM roles WHERE name = 'KAPTEN' LIMIT 1;
  IF kapten_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_key) VALUES
      (kapten_id, 'access_master_panel'),
      (kapten_id, 'manage_staff'),
      (kapten_id, 'view_reports'),
      (kapten_id, 'view_monitor'),
      (kapten_id, 'view_all_history'),
      (kapten_id, 'emergency_stop'),
      (kapten_id, 'view_shift_summary'),
      (kapten_id, 'view_shift_handover'),
      (kapten_id, 'export_csv'),
      (kapten_id, 'access_chat'),
      (kapten_id, 'upload_chat_files')
    ON CONFLICT (role_id, permission_key) DO NOTHING;
  END IF;

  SELECT id INTO csline_id FROM roles WHERE name = 'CS LINE' LIMIT 1;
  IF csline_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_key) VALUES
      (csline_id, 'access_master_panel'),
      (csline_id, 'view_reports'),
      (csline_id, 'view_monitor'),
      (csline_id, 'view_all_history'),
      (csline_id, 'view_shift_summary'),
      (csline_id, 'view_shift_handover'),
      (csline_id, 'export_csv'),
      (csline_id, 'access_chat'),
      (csline_id, 'upload_chat_files')
    ON CONFLICT (role_id, permission_key) DO NOTHING;
  END IF;
END $$;

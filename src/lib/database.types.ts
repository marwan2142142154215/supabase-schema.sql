export interface Role {
  id: string
  name: string
  max_concurrent: number
  quota_break_long_per_day: number
  quota_break_short_per_day: number
  quota_toilet_per_day: number
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  name: string
  role_id: string
  active: boolean
  created_at: string
  updated_at: string
  roles?: Role
}

export interface Shift {
  id: string
  name: string
  cutoff_time: string
  active: boolean
  created_at: string
}

export interface AttendanceRecord {
  id: string
  staff_id: string
  shift_id: string
  check_in_time: string
  date: string
  status: 'ON_TIME' | 'LATE'
  photo_url: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
  staff?: Staff
  shifts?: Shift
}

export interface BreakRecord {
  id: string
  staff_id: string
  break_type: 'toilet' | 'smoking' | 'meal'
  start_time: string
  deadline: string
  return_time: string | null
  duration_minutes: number
  date: string
  status: 'ACTIVE' | 'ON_TIME' | 'LATE' | 'FORCE_STOPPED' | 'AUTO_CLOSED'
  overtime_seconds: number
  photo_start_url: string | null
  photo_return_url: string | null
  latitude_start: number | null
  longitude_start: number | null
  created_at: string
  updated_at: string
  staff?: Staff
}

export interface DailyUsage {
  id: string
  staff_id: string
  date: string
  break_long_count: number
  break_short_count: number
  toilet_count: number
  staff?: Staff
}

export interface SystemConfig {
  key: string
  value: any
  updated_at: string
}

export interface SystemLog {
  id: string
  action: string
  details: any
  triggered_by: string
  created_at: string
}

export interface Regulation {
  id: string
  content: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  sender_id: string
  sender_name: string
  message: string
  encrypted: boolean
  created_at: string
}

export interface ShiftHandover {
  id: string
  staff_id: string
  staff_name: string
  notes: string
  shift_name: string
  created_at: string
}

export interface EmergencyLog {
  id: string
  staff_id: string
  staff_name: string
  break_id: string
  break_type: string
  action: string
  timestamp: string
  created_at: string
}

export interface SystemAlert {
  id: string
  type: string
  title: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  read: boolean
  telegram_sent: boolean
  created_at: string
}

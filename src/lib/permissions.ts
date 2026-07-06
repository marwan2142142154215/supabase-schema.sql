export type PermissionKey =
  | 'access_master_panel'
  | 'manage_staff'
  | 'manage_shifts'
  | 'manage_roles'
  | 'manage_permissions'
  | 'manage_regulations'
  | 'manage_telegram'
  | 'manage_appearance'
  | 'manage_security'
  | 'manage_photos'
  | 'view_reports'
  | 'view_analytics'
  | 'view_monitor'
  | 'view_system_alerts'
  | 'view_staff_directory'
  | 'view_break_analytics'
  | 'view_performance_dashboard'
  | 'view_emergency_logs'
  | 'view_quota_overview'
  | 'view_shift_summary'
  | 'view_shift_handover'
  | 'view_all_history'
  | 'emergency_stop'
  | 'emergency_stop_all'
  | 'daily_reset'
  | 'export_csv'
  | 'access_chat'
  | 'create_chat_group'
  | 'upload_chat_files'
  | 'manage_chat'

export interface Permission {
  key: PermissionKey
  label: string
  description: string
  group: 'master_panel' | 'view' | 'management' | 'emergency' | 'chat'
}

export const ALL_PERMISSIONS: Permission[] = [
  { key: 'access_master_panel', label: 'Akses Master Panel', description: 'Membuka halaman Master Panel', group: 'master_panel' },
  { key: 'manage_staff', label: 'Kelola Staff', description: 'Tambah/edit/nonaktifkan staff', group: 'master_panel' },
  { key: 'manage_shifts', label: 'Kelola Shift', description: 'Atur shift dan jam cutoff', group: 'master_panel' },
  { key: 'manage_roles', label: 'Kelola Role', description: 'Atur role dan kuota', group: 'master_panel' },
  { key: 'manage_permissions', label: 'Kelola Hak Akses', description: 'Atur permission per role (Hanya LEADER)', group: 'master_panel' },
  { key: 'manage_regulations', label: 'Kelola Peraturan', description: 'Ubah teks peraturan kantor', group: 'master_panel' },
  { key: 'manage_telegram', label: 'Integrasi Telegram', description: 'Atur bot Telegram', group: 'master_panel' },
  { key: 'manage_appearance', label: 'Tampilan', description: 'Ubah background/tema', group: 'master_panel' },
  { key: 'manage_security', label: 'Keamanan', description: 'Ganti password, lihat log', group: 'master_panel' },
  { key: 'manage_photos', label: 'Kelola Foto', description: 'Hapus/bersihkan foto', group: 'master_panel' },
  { key: 'view_reports', label: 'Laporan Bulanan', description: 'Lihat halaman laporan bulanan', group: 'view' },
  { key: 'view_analytics', label: 'Analitik Kehadiran', description: 'Lihat grafik dan analitik', group: 'view' },
  { key: 'view_monitor', label: 'Monitor Live', description: 'Lihat halaman monitor aktif', group: 'view' },
  { key: 'view_system_alerts', label: 'System Alerts', description: 'Lihat alert sistem', group: 'view' },
  { key: 'view_staff_directory', label: 'Staff Directory', description: 'Lihat direktori staff', group: 'view' },
  { key: 'view_break_analytics', label: 'Break Analytics', description: 'Lihat analitik break', group: 'view' },
  { key: 'view_performance_dashboard', label: 'Performance Dashboard', description: 'Lihat dashboard performa', group: 'view' },
  { key: 'view_emergency_logs', label: 'Emergency Logs', description: 'Lihat log emergency', group: 'view' },
  { key: 'view_quota_overview', label: 'Quota Overview', description: 'Lihat sisa quota', group: 'view' },
  { key: 'view_shift_summary', label: 'Shift Summary', description: 'Lihat ringkasan shift', group: 'view' },
  { key: 'view_shift_handover', label: 'Shift Handover', description: 'Lihat catatan handover', group: 'view' },
  { key: 'view_all_history', label: 'Semua Riwayat', description: 'Lihat riwayat lengkap', group: 'view' },
  { key: 'emergency_stop', label: 'Emergency Stop', description: 'Hentikan izin aktif', group: 'emergency' },
  { key: 'emergency_stop_all', label: 'Stop Semua Izin', description: 'Hentikan semua izin', group: 'emergency' },
  { key: 'daily_reset', label: 'Reset Harian', description: 'Reset quota harian', group: 'emergency' },
  { key: 'export_csv', label: 'Export CSV', description: 'Download data sebagai CSV', group: 'management' },
  { key: 'access_chat', label: 'Akses Chat', description: 'Masuk ke ruang chat', group: 'chat' },
  { key: 'create_chat_group', label: 'Buat Grup Chat', description: 'Membuat grup chat baru', group: 'chat' },
  { key: 'upload_chat_files', label: 'Upload File Chat', description: 'Upload foto/video di chat', group: 'chat' },
  { key: 'manage_chat', label: 'Kelola Chat', description: 'Hapus pesan, kelola grup', group: 'chat' },
]

export const PAGE_PERMISSIONS: Record<string, PermissionKey> = {
  '/': 'access_chat',
  '/absensi': 'access_chat',
  '/izin': 'access_chat',
  '/monitor': 'view_monitor',
  '/riwayat': 'view_all_history',
  '/laporan-bulanan': 'view_reports',
  '/profil-staf': 'access_chat',
  '/manajemen-peraturan': 'manage_regulations',
  '/analitik-kehadiran': 'view_analytics',
  '/shift-summary': 'view_shift_summary',
  '/system-alerts': 'view_system_alerts',
  '/staff-directory': 'view_staff_directory',
  '/break-analytics': 'view_break_analytics',
  '/shift-handover': 'view_shift_handover',
  '/performance-dashboard': 'view_performance_dashboard',
  '/emergency-logs': 'view_emergency_logs',
  '/quota-overview': 'view_quota_overview',
  '/master-panel': 'access_master_panel',
  '/chat-nanastoto': 'access_chat',
}

export const MASTER_PANEL_SECTIONS: Record<string, PermissionKey> = {
  'dashboard': 'access_master_panel',
  'staff': 'manage_staff',
  'shifts': 'manage_shifts',
  'durations': 'manage_roles',
  'roles': 'manage_roles',
  'emergency': 'emergency_stop',
  'regulations': 'manage_regulations',
  'telegram': 'manage_telegram',
  'appearance': 'manage_appearance',
  'security': 'manage_security',
  'photos': 'manage_photos',
  'logs': 'access_master_panel',
  'permissions': 'manage_permissions',
}

export function hasPermission(userPermissions: PermissionKey[], required: PermissionKey): boolean {
  return userPermissions.includes(required)
}

export function getPagePermission(path: string): PermissionKey | null {
  return PAGE_PERMISSIONS[path] || null
}

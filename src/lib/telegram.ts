import { supabase } from './supabase'
import { encryptMessage } from './encryption'

interface TelegramConfig {
  botToken: string
  chatId: string
  enabled: boolean
}

let tgConfig: TelegramConfig = { botToken: '', chatId: '', enabled: false }

export async function loadTelegramConfig() {
  const { data } = await supabase.from('system_config').select('key, value')
  if (data) {
    const getVal = (key: string) => data.find((d: any) => d.key === key)?.value
    tgConfig = {
      botToken: getVal('telegram_bot_token') || '',
      chatId: getVal('telegram_chat_id') || '',
      enabled: getVal('telegram_enabled') || false,
    }
  }
}

export async function sendTelegramNotification(
  message: string,
  photoUrl?: string | null,
  encryptKey?: string
): Promise<boolean> {
  if (!tgConfig.enabled || !tgConfig.botToken || !tgConfig.chatId) return false

  let finalMessage = message
  if (encryptKey) {
    finalMessage = await encryptMessage(message, encryptKey)
  }

  try {
    if (photoUrl) {
      const res = await fetch(
        `https://api.telegram.org/bot${tgConfig.botToken}/sendPhoto`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgConfig.chatId,
            photo: photoUrl,
            caption: finalMessage,
            parse_mode: 'HTML',
          }),
        }
      )
      return res.ok
    } else {
      const res = await fetch(
        `https://api.telegram.org/bot${tgConfig.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgConfig.chatId,
            text: finalMessage,
            parse_mode: 'HTML',
          }),
        }
      )
      if (!res.ok) {
        // Retry 3x
        for (let i = 0; i < 3; i++) {
          await new Promise(r => setTimeout(r, 5000))
          const retry = await fetch(
            `https://api.telegram.org/bot${tgConfig.botToken}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: tgConfig.chatId,
                text: finalMessage,
                parse_mode: 'HTML',
              }),
            }
          )
          if (retry.ok) return true
        }
        await supabase.from('system_logs').insert({
          action: 'telegram_failed',
          details: { message: 'Gagal kirim setelah 3x retry', error: res.statusText },
          triggered_by: 'system',
        })
        return false
      }
      return true
    }
  } catch {
    return false
  }
}

export function formatAttendanceNotification(name: string, role: string, shift: string, time: string, status: string, location: string): string {
  return `<b>NANASTOTO — ABSENSI</b>\nNama: ${name}\nRole: ${role}\nShift: ${shift}\nTanggal: ${new Date().toLocaleDateString('id-ID')}\nJam: ${time}\nLokasi: ${location}\nStatus: ${status}`
}

export function formatBreakStartNotification(name: string, role: string, type: string, start: string, deadline: string): string {
  return `<b>NANASTOTO — IZIN KELUAR</b>\nNama: ${name}\nRole: ${role}\nJenis: ${type}\nTanggal: ${new Date().toLocaleDateString('id-ID')}\nMulai: ${start}\nDeadline: ${deadline}`
}

export function formatBreakReturnNotification(name: string, type: string, time: string, duration: string, status: string): string {
  return `<b>NANASTOTO — STAFF KEMBALI</b>\nNama: ${name}\nJenis: ${type}\nKembali: ${time}\nDurasi: ${duration}\nStatus: ${status}`
}

export function formatEmergencyNotification(name: string, type: string, time: string): string {
  return `<b>NANASTOTO — EMERGENCY STOP</b>\nStaff: ${name}\nIzin: ${type}\nDihentikan: ${time}\nDipaksa berhenti oleh admin`
}

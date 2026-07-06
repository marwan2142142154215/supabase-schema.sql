import { format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'

export function formatDate(date: string | Date, fmt = 'EEEE, dd MMMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: id })
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'HH:mm:ss')
}

export function formatTimeShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'HH:mm')
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ON_TIME': return 'text-accent-green'
    case 'LATE': return 'text-accent-red'
    case 'ACTIVE': return 'text-accent-indigo'
    case 'FORCE_STOPPED': return 'text-accent-orange'
    case 'AUTO_CLOSED': return 'text-gray-500'
    default: return 'text-secondary'
  }
}

export function getStatusBadge(status: string): string {
  switch (status) {
    case 'ON_TIME': return 'bg-accent-green/20 text-accent-green border border-accent-green/30'
    case 'LATE': return 'bg-accent-red/20 text-accent-red border border-accent-red/30'
    case 'ACTIVE': return 'bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30'
    case 'FORCE_STOPPED': return 'bg-accent-orange/20 text-accent-orange border border-accent-orange/30'
    case 'AUTO_CLOSED': return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
      { headers: { 'Accept-Language': 'id' } }
    )
    const data = await res.json()
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}

export function compressImage(file: File, maxSize = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxSize) { h = (maxSize / w) * h; w = maxSize }
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}

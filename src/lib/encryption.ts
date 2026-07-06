const encoder = new TextEncoder()
const decoder = new TextDecoder()

async function getKey(key: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(key))
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptMessage(text: string, secretKey: string): Promise<string> {
  const key = await getKey(secretKey)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(text)
  )
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)
  return btoa(String.fromCharCode(...combined))
}

export async function decryptMessage(encryptedBase64: string, secretKey: string): Promise<string> {
  try {
    const key = await getKey(secretKey)
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const data = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    return decoder.decode(decrypted)
  } catch {
    return ''
  }
}

export function generateChatKey(): string {
  return crypto.randomUUID() + crypto.randomUUID()
}

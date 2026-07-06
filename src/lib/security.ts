interface SecurityEvent {
  type: string
  timestamp: number
  details: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class SecurityGuard {
  private events: SecurityEvent[] = []
  private loginAttempts: Map<string, { count: number; lockoutUntil: number }> = new Map()
  private maxLoginAttempts = 5
  private lockoutDuration = 5 * 60 * 1000

  logEvent(type: string, details: string, severity: SecurityEvent['severity'] = 'low') {
    this.events.push({ type, timestamp: Date.now(), details, severity })
    if (this.events.length > 1000) this.events.shift()
  }

  checkLoginAttempt(identifier: string): boolean {
    const attempt = this.loginAttempts.get(identifier)
    if (!attempt) return true
    if (Date.now() < attempt.lockoutUntil) return false
    if (Date.now() >= attempt.lockoutUntil) {
      this.loginAttempts.delete(identifier)
      return true
    }
    return true
  }

  recordFailedLogin(identifier: string) {
    const attempt = this.loginAttempts.get(identifier) || { count: 0, lockoutUntil: 0 }
    attempt.count++
    if (attempt.count >= this.maxLoginAttempts) {
      attempt.lockoutUntil = Date.now() + this.lockoutDuration
      this.logEvent('login_lockout', `Login lockout for ${identifier}`, 'high')
    }
    this.loginAttempts.set(identifier, attempt)
  }

  recordSuccessfulLogin(identifier: string) {
    this.loginAttempts.delete(identifier)
  }

  sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  getEvents(): SecurityEvent[] {
    return [...this.events]
  }

  clearEvents() {
    this.events = []
  }
}

export const securityGuard = new SecurityGuard()

export class RateLimiter {
  private limits: Map<string, { count: number; resetAt: number }> = new Map()

  constructor(private maxRequests: number, private windowMs: number) {}

  check(key: string): boolean {
    const now = Date.now()
    const entry = this.limits.get(key)
    if (!entry || now > entry.resetAt) {
      this.limits.set(key, { count: 1, resetAt: now + this.windowMs })
      return true
    }
    if (entry.count >= this.maxRequests) return false
    entry.count++
    return true
  }

  reset(key: string) {
    this.limits.delete(key)
  }
}

export const globalRateLimiter = new RateLimiter(100, 60000)

export function generateCsrfToken(): string {
  const token = crypto.randomUUID()
  sessionStorage.setItem('csrf_token', token)
  return token
}

export function validateCsrfToken(token: string): boolean {
  const stored = sessionStorage.getItem('csrf_token')
  return stored === token
}

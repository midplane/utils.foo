export interface JWTPayload {
  [key: string]: unknown
}

export interface JWTHeader {
  alg?: string
  typ?: string
  [key: string]: unknown
}

export interface DecodedJWT {
  header: JWTHeader
  payload: JWTPayload
  signature: string
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function decodeJWT(token: string): DecodedJWT {
  // Accept a value copied from an Authorization header, and a token that wraps across lines.
  const normalized = token.trim().replace(/^Bearer\s+/i, '').replace(/\s+/g, '')
  const parts = normalized.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format: must have 3 parts separated by dots')
  }

  const [headerB64, payloadB64, signature] = parts

  const decodeBase64Url = (str: string): string => {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const padding = base64.length % 4
    if (padding) {
      base64 += '='.repeat(4 - padding)
    }
    return decodeURIComponent(escape(atob(base64)))
  }

  let header: unknown
  let payload: unknown
  try {
    header = JSON.parse(decodeBase64Url(headerB64 ?? ''))
    payload = JSON.parse(decodeBase64Url(payloadB64 ?? ''))
  } catch {
    throw new Error('Invalid JWT: failed to decode')
  }

  if (!isPlainObject(header)) {
    throw new Error('Invalid JWT: header is not a JSON object')
  }
  if (!isPlainObject(payload)) {
    throw new Error('Invalid JWT: payload is not a JSON object')
  }
  return { header, payload, signature: signature ?? '' }
}

export function formatPayloadValue(value: unknown): string {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed !== null && typeof parsed === 'object') {
        return JSON.stringify(parsed, null, 2)
      }
    } catch {
      // Keep ordinary string claims unchanged.
    }
    return value
  }

  if (value !== null && typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

export function formatTimestamp(value: unknown): string | null {
  if (typeof value !== 'number') return null
  const date = new Date(value * 1000)
  if (isNaN(date.getTime())) return null
  return date.toLocaleString()
}

export function isExpired(exp: unknown): boolean {
  if (typeof exp !== 'number') return false
  return Date.now() >= exp * 1000
}

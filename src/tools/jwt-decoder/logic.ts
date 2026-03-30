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

export function decodeJWT(token: string): DecodedJWT {
  const parts = token.split('.')
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

  try {
    const header = JSON.parse(decodeBase64Url(headerB64 ?? ''))
    const payload = JSON.parse(decodeBase64Url(payloadB64 ?? ''))
    return { header, payload, signature: signature ?? '' }
  } catch {
    throw new Error('Invalid JWT: failed to decode')
  }
}

export function formatTimestamp(value: unknown): string | null {
  if (typeof value !== 'number') return null
  const date = new Date(value * 1000)
  if (isNaN(date.getTime())) return null
  return date.toLocaleString()
}

export function isExpired(exp: unknown): boolean {
  if (typeof exp !== 'number') return false
  return Date.now() > exp * 1000
}

export const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  digits:    '0123456789',
  symbols:   '!@#$%^&*()-_=+[]{}|;:,.<>?',
}

export type CharsetKey = keyof typeof CHARSETS

const UINT32_RANGE = 2 ** 32

export function buildPool(enabled: Record<CharsetKey, boolean>, excludeAmbiguous: boolean): string {
  let pool = ''
  for (const [key, chars] of Object.entries(CHARSETS) as [CharsetKey, string][]) {
    if (enabled[key]) pool += chars
  }
  if (excludeAmbiguous) pool = pool.replace(/[0Ol1I]/g, '')
  return pool
}

export function generatePassword(length: number, enabled: Record<CharsetKey, boolean>, excludeAmbiguous: boolean): string {
  const pool = buildPool(enabled, excludeAmbiguous)
  if (!pool) return ''

  // Use crypto.getRandomValues for cryptographically secure generation
  const poolLen = pool.length
  // Values at or above this limit are discarded. Each index then has the same number of source values (no modulo bias).
  const limit = UINT32_RANGE - (UINT32_RANGE % poolLen)
  const result: string[] = []
  while (result.length < length) {
    const rand = new Uint32Array(length - result.length)
    crypto.getRandomValues(rand)
    for (const n of rand) {
      if (result.length >= length) break
      if (n < limit) result.push(pool[n % poolLen]!)
    }
  }
  return result.join('')
}

export function calcEntropy(length: number, enabled: Record<CharsetKey, boolean>, excludeAmbiguous: boolean): number {
  const pool = buildPool(enabled, excludeAmbiguous)
  if (!pool) return 0
  return Math.floor(length * Math.log2(pool.length))
}

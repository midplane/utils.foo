export type HmacAlgorithm = 'SHA-256' | 'SHA-512'

export async function computeHmac(message: string, secret: string, algorithm: HmacAlgorithm): Promise<string> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', keyMaterial, enc.encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

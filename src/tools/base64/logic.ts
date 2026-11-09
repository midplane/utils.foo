export const INVALID_BASE64 = 'Invalid Base64 input'
export const NOT_UTF8 = 'The Base64 is valid, but the decoded bytes are not valid UTF-8 text'
export const LONE_SURROGATE = 'The text contains an incomplete Unicode character and cannot be encoded'

export function encodeBase64(text: string): string {
  let utf8: string
  try {
    utf8 = unescape(encodeURIComponent(text))
  } catch {
    throw new Error(LONE_SURROGATE)
  }
  return btoa(utf8)
}

export function decodeBase64(input: string): string {
  // Accept the URL-safe alphabet (RFC 4648 §5) too. atob adds missing padding.
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  let binary: string
  try {
    binary = atob(normalized)
  } catch {
    throw new Error(INVALID_BASE64)
  }
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
  } catch {
    throw new Error(NOT_UTF8)
  }
}

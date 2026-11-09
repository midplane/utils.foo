export type InputMode = 'text' | 'codepoint' | 'hex' | 'decimal'

export interface CharInfo {
  char: string
  codepoint: number
  hex: string
  decimal: string
  name: string
  utf8: string
  utf16: string
}

const MAX_CODEPOINT = 0x10FFFF

function isSurrogate(codepoint: number): boolean {
  return codepoint >= 0xD800 && codepoint <= 0xDFFF
}

export function formatCodepoint(codepoint: number): string {
  return 'U+' + codepoint.toString(16).toUpperCase().padStart(4, '0')
}

export function getCharInfo(char: string): CharInfo {
  const codepoint = char.codePointAt(0) ?? 0
  const hex = formatCodepoint(codepoint)
  const decimal = codepoint.toString()

  // TextEncoder changes a lone surrogate to U+FFFD (EF BF BD). That is not the
  // encoding of this code point, because UTF-8 cannot encode surrogates.
  const utf8 = isSurrogate(codepoint)
    ? 'invalid (lone surrogate)'
    : Array.from(new TextEncoder().encode(char)).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')

  const utf16Units: string[] = []
  for (let i = 0; i < char.length; i++) {
    utf16Units.push(char.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0'))
  }
  const utf16 = utf16Units.join(' ')

  let name = 'Unknown'
  if (codepoint >= 0x0000 && codepoint <= 0x001F) name = 'Control Character'
  else if (codepoint >= 0x0020 && codepoint <= 0x007F) name = 'Basic Latin'
  else if (codepoint >= 0x0080 && codepoint <= 0x00FF) name = 'Latin-1 Supplement'
  else if (codepoint >= 0x0100 && codepoint <= 0x017F) name = 'Latin Extended-A'
  else if (codepoint >= 0x0180 && codepoint <= 0x024F) name = 'Latin Extended-B'
  else if (codepoint >= 0x0370 && codepoint <= 0x03FF) name = 'Greek and Coptic'
  else if (codepoint >= 0x0400 && codepoint <= 0x04FF) name = 'Cyrillic'
  else if (codepoint >= 0x0590 && codepoint <= 0x05FF) name = 'Hebrew'
  else if (codepoint >= 0x0600 && codepoint <= 0x06FF) name = 'Arabic'
  else if (codepoint >= 0xD800 && codepoint <= 0xDFFF) name = 'Surrogate (invalid alone)'
  else if (codepoint >= 0x3000 && codepoint <= 0x303F) name = 'CJK Symbols'
  else if (codepoint >= 0x4E00 && codepoint <= 0x9FFF) name = 'CJK Unified Ideographs'
  else if (codepoint >= 0x1F300 && codepoint <= 0x1F9FF) name = 'Emoji'

  return { char, codepoint, hex, decimal, name, utf8, utf16 }
}

function toChar(codepoint: number, token: string): string {
  if (!Number.isFinite(codepoint) || codepoint > MAX_CODEPOINT) {
    throw new Error(`"${token}" is out of range. The maximum code point is U+10FFFF.`)
  }
  if (isSurrogate(codepoint)) {
    throw new Error(`"${token}" is a surrogate code point. It is not a valid character.`)
  }
  return String.fromCodePoint(codepoint)
}

const SEPARATOR = /[\s,;]+/

/**
 * Returns one string per code point. Numeric modes throw an Error with a
 * message for the user when a token is not valid.
 */
export function parseInput(input: string, mode: InputMode): string[] {
  // Iterate by code point, not by grapheme. A grapheme such as "e" + U+0301 or
  // a ZWJ emoji sequence has more than one code point, and each one must show.
  if (mode === 'text') return Array.from(input)

  const tokens = input.split(SEPARATOR).filter(Boolean)
  const chars: string[] = []

  for (const token of tokens) {
    if (mode === 'codepoint') {
      // One token can hold adjacent values, for example "U+0048U+0065".
      if (!/^(?:U\+[0-9A-F]+)+$/i.test(token)) {
        throw new Error(`"${token}" is not a valid code point. Use the format U+XXXX.`)
      }
      for (const m of token.matchAll(/U\+([0-9A-F]+)/gi)) {
        chars.push(toChar(parseInt(m[1] ?? '', 16), m[0]))
      }
    } else if (mode === 'hex') {
      const m = /^(?:0x)?([0-9A-F]+)$/i.exec(token)
      if (!m) throw new Error(`"${token}" is not a valid hex value.`)
      chars.push(toChar(parseInt(m[1] ?? '', 16), token))
    } else {
      if (!/^\d+$/.test(token)) throw new Error(`"${token}" is not a valid decimal value.`)
      chars.push(toChar(parseInt(token, 10), token))
    }
  }

  return chars
}

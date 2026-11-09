// ─── Color conversion helpers ─────────────────────────────────────────────────

export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }

export function hexToRgb(hex: string): RGB | null {
  const clean = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

export function rgbToHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break
      case gn: h = ((bn - rn) / d + 2) / 6; break
      case bn: h = ((rn - gn) / d + 4) / 6; break
    }
  }

  return {
    // A hue near 360 rounds up to 360. Show it as 0, which is the same hue.
    h: Math.round(h * 360) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const sn = s / 100, ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = ln - c / 2
  let r: number, g: number, b: number

  if (h < 60)       { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else              { r = c; g = 0; b = x }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

// The full value must match. An unanchored match takes "5, 2, 3" from
// "1.5, 2, 3" and "5, 10, 20" from "-5, 10, 20".
const NUM = '(\\d+(?:\\.\\d+)?)'
const RGB_PATTERN = new RegExp(`^(?:rgb\\(\\s*)?${NUM}\\s*,\\s*${NUM}\\s*,\\s*${NUM}\\s*\\)?$`, 'i')
const HSL_PATTERN = new RegExp(`^(?:hsl\\(\\s*)?${NUM}(?:deg)?\\s*,\\s*${NUM}%?\\s*,\\s*${NUM}%?\\s*\\)?$`, 'i')

export function parseRgbString(value: string): RGB | null {
  const m = value.trim().match(RGB_PATTERN)
  if (!m) return null
  const r = Math.round(Number(m[1])), g = Math.round(Number(m[2])), b = Math.round(Number(m[3]))
  if ([r, g, b].some(n => n < 0 || n > 255)) return null
  return { r, g, b }
}

export function parseHslString(value: string): HSL | null {
  const m = value.trim().match(HSL_PATTERN)
  if (!m) return null
  const h = Number(m[1]), s = Number(m[2]), l = Number(m[3])
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null
  return { h, s, l }
}

// ─── Contrast ─────────────────────────────────────────────────────────────────

const DARK_TEXT = '#1a1a1a'
const LIGHT_TEXT = '#ffffff'

function channelToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance({ r, g, b }: RGB): number {
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a), lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// Returns the text color (dark or white) with the higher WCAG contrast ratio.
export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#000000'
  const dark = hexToRgb(DARK_TEXT)!, light = hexToRgb(LIGHT_TEXT)!
  return contrastRatio(rgb, dark) >= contrastRatio(rgb, light) ? DARK_TEXT : LIGHT_TEXT
}

import QRCode from 'qrcode'

export type ErrorLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrSettings {
  errorLevel: ErrorLevel
  size: number
  margin: number
  fgColor: string
  bgColor: string
}

// The qrcode library does not check the hex digits: "#GGGGGG" parses to a
// fully transparent colour, and "#1C19" parses as #RGBA. Accept only the forms
// that the colour picker and CSS both read the same way.
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value)
}

export function qrOptions(s: QrSettings) {
  if (!isHexColor(s.fgColor)) throw new Error(`Foreground colour "${s.fgColor}" is not valid. Use #RRGGBB.`)
  if (!isHexColor(s.bgColor)) throw new Error(`Background colour "${s.bgColor}" is not valid. Use #RRGGBB.`)
  return {
    errorCorrectionLevel: s.errorLevel,
    margin: s.margin,
    // Also sets width and height on the SVG. Without it, the SVG has only a viewBox.
    width: s.size,
    color: { dark: s.fgColor, light: s.bgColor },
  }
}

// Capacity depends on the error-correction level and on the encoding mode
// (numeric and alphanumeric text fit more characters than bytes), so ask the
// encoder instead of comparing with a fixed byte limit.
export function fitsInQr(text: string, errorLevel: ErrorLevel): boolean {
  if (!text) return true
  try {
    QRCode.create(text, { errorCorrectionLevel: errorLevel })
    return true
  } catch {
    return false
  }
}

export interface LogoSvgOptions {
  lines: string[]
  width: number
  height: number
  fontSize: number
  fontFamily: string
  fontWeight: string
  bgColor: string
  fgColor: string
  letterSpacing: number
  lineHeight: number
}

// XML 1.0 does not allow most C0 control characters or lone surrogates.
// One of them in the text makes the whole file invalid, so remove them.
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

export function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function buildSvg({
  lines, width: w, height: h, fontSize, fontFamily, fontWeight,
  bgColor, fgColor, letterSpacing, lineHeight,
}: LogoSvgOptions): string {
  const lineCount = lines.length
  // For multi-line: offset each line relative to centre so the block is centred
  const blockH = lineCount === 1
    ? 0
    : (lineCount - 1) * fontSize * lineHeight
  const startY = h / 2 - blockH / 2

  const tspans = lines.map((line, i) => {
    const dy = i === 0 ? 0 : fontSize * lineHeight
    const safeText = escapeXml(line)
    return `<tspan x="50%" dy="${dy}">${safeText || '&#x200B;'}</tspan>`
  }).join('')

  // xml:space="preserve" keeps repeated, leading and trailing spaces as typed.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${escapeXml(bgColor)}"/>
  <text
    x="50%"
    y="${startY.toFixed(1)}"
    xml:space="preserve"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="${escapeXml(fontFamily)}"
    font-size="${fontSize}"
    font-weight="${escapeXml(fontWeight)}"
    fill="${escapeXml(fgColor)}"
    letter-spacing="${letterSpacing}"
  >${tspans}</text>
</svg>`
}

// ─── resolveSvgForRaster ──────────────────────────────────────────────────────
// Canvas cannot resolve CSS custom properties or color-mix(). Before PNG export
// we inline all vars to literal hex values, strip @import, and inject a solid
// background rect so the PNG isn't transparent.
//
// beautiful-mermaid derives its colours as `var(--line, color-mix(...))`, so a
// theme override (--line, --accent, --muted, --surface, --border) must win over
// the mix. The vars are resolved from the declarations in the SVG itself, not
// from a copy of the library's mix table, so new vars do not fall back to the
// background colour and become invisible.

const HEX6 = /^#[0-9a-fA-F]{6}$/

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function mixHex(fg: string, bg: string, fgPct: number): string {
  const f = hexToRgb(fg), b = hexToRgb(bg), t = fgPct / 100
  return '#' + ([0, 1, 2] as const)
    .map(i => Math.round(f[i]! * t + b[i]! * (1 - t)).toString(16).padStart(2, '0'))
    .join('')
}

// Index of the ')' that closes the '(' at `open`, or -1.
function closingParen(s: string, open: number): number {
  let depth = 0
  for (let i = open; i < s.length; i++) {
    if (s[i] === '(') depth++
    else if (s[i] === ')' && --depth === 0) return i
  }
  return -1
}

function topLevelComma(s: string): number {
  let depth = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++
    else if (s[i] === ')') depth--
    else if (s[i] === ',' && depth === 0) return i
  }
  return -1
}

const COLOR_MIX = /color-mix\(\s*in\s+srgb\s*,\s*(#[0-9a-fA-F]{6})\s*(?:([\d.]+)%)?\s*,\s*(#[0-9a-fA-F]{6})\s*(?:([\d.]+)%)?\s*\)/g

function evalColorMix(value: string): string {
  let out = value
  for (let prev = ''; prev !== out;) {
    prev = out
    out = out.replace(COLOR_MIX, (_, a: string, pa: string | undefined, b: string, pb: string | undefined) => {
      let p = pa !== undefined ? parseFloat(pa) : pb !== undefined ? 100 - parseFloat(pb) : 50
      if (pa !== undefined && pb !== undefined) {
        const sum = parseFloat(pa) + parseFloat(pb)
        if (sum > 0) p = (parseFloat(pa) / sum) * 100
      }
      return mixHex(a, b, p)
    })
  }
  return out
}

// Replaces each var() in `value`. Returns null when a var has no
// declaration and no fallback, or when the declarations form a cycle.
function substituteVars(value: string, decls: Map<string, string>, seen: ReadonlySet<string>): string | null {
  let out = ''
  let i = 0
  for (;;) {
    const start = value.indexOf('var(', i)
    if (start < 0) return evalColorMix(out + value.slice(i))
    const end = closingParen(value, start + 3)
    if (end < 0) return null
    out += value.slice(i, start)
    const inner = value.slice(start + 4, end)
    const comma = topLevelComma(inner)
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim()
    const fallback = comma < 0 ? null : inner.slice(comma + 1).trim()

    let resolved: string | null = null
    const declared = decls.get(name)
    if (declared !== undefined && !seen.has(name)) {
      resolved = substituteVars(declared, decls, new Set([...seen, name]))
    }
    if (resolved === null && fallback !== null) resolved = substituteVars(fallback, decls, seen)
    if (resolved === null) return null
    out += resolved
    i = end + 1
  }
}

function collectDeclarations(sources: string[]): Map<string, string> {
  const decls = new Map<string, string>()
  for (const source of sources) {
    for (const [, name, value] of source.matchAll(/(--[\w-]+)\s*:\s*([^;"}]+)/g)) {
      if (!decls.has(name!)) decls.set(name!, value!.trim())
    }
  }
  return decls
}

export function resolveSvgForRaster(svg: string): string {
  const openEnd = svg.indexOf('>', svg.indexOf('<svg')) + 1
  const openTag = svg.slice(0, openEnd)
  const styleBlocks = [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]!)

  // Only the root tag and <style> blocks are read. Diagram labels are escaped
  // text, but "--x: ..." in a label must not define a colour.
  const decls = collectDeclarations([openTag, ...styleBlocks])
  const bgDecl = decls.get('--bg')
  const bg = bgDecl && HEX6.test(bgDecl) ? bgDecl : '#ffffff'

  const resolve = (value: string) => {
    let out = ''
    let i = 0
    for (;;) {
      const start = value.indexOf('var(', i)
      if (start < 0) return evalColorMix(out + value.slice(i))
      const end = closingParen(value, start + 3)
      if (end < 0) return evalColorMix(out + value.slice(i))
      out += value.slice(i, start) + (substituteVars(value.slice(start, end + 1), decls, new Set()) ?? bg)
      i = end + 1
    }
  }

  // Resolve only inside <style> blocks and colour attributes, so label text
  // that contains "var(" is exported as typed.
  let out = svg
    .replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_, open: string, css: string, close: string) => open + resolve(css) + close)
    .replace(/\b(fill|stroke|style|stop-color)="([^"]*)"/g, (_, attr: string, value: string) => `${attr}="${resolve(value)}"`)

  // Strip @import (Google Fonts — cross-origin, blocked when loading from blob).
  // The font URL contains ';', so match the whole url(...) and not up to the first ';'.
  out = out.replace(/@import\s+(?:url\([^)]*\)|"[^"]*"|'[^']*')[^;]*;/g, '')

  // Inject solid background rect immediately after the opening <svg ...> tag
  const insertAt = out.indexOf('>', out.indexOf('<svg')) + 1
  const vbMatch = out.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/)
  const wMatch = out.match(/\bwidth="([\d.]+)"/)
  const hMatch = out.match(/\bheight="([\d.]+)"/)
  const bgRect = vbMatch
    ? `<rect x="${vbMatch[1]}" y="${vbMatch[2]}" width="${vbMatch[3]}" height="${vbMatch[4]}" fill="${bg}"/>`
    : `<rect x="0" y="0" width="${wMatch?.[1] ?? 800}" height="${hMatch?.[1] ?? 600}" fill="${bg}"/>`

  return out.slice(0, insertAt) + bgRect + out.slice(insertAt)
}

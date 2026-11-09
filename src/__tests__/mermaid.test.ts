import { describe, it, expect } from 'vitest'
import { renderMermaidSVG, THEMES } from 'beautiful-mermaid'
import { resolveSvgForRaster, mixHex } from '../tools/mermaid/raster'

function render(code: string, theme: string) {
  return renderMermaidSVG(code, { ...THEMES[theme]!, transparent: false, padding: 32 })
}

const XY = `xychart-beta
  title "T"
  x-axis [a, b]
  y-axis "Y" 0 --> 10
  bar [3, 7]`

describe('resolveSvgForRaster', () => {
  it('uses the theme line and accent overrides, not the fg/bg mix', () => {
    const t = THEMES['tokyo-night']!
    const out = resolveSvgForRaster(render('graph TD\n  A --> B', 'tokyo-night'))
    expect(out).toMatch(new RegExp(`<polyline[^>]*stroke="${t.line}"`))
    expect(out).toMatch(new RegExp(`<polygon[^>]*fill="${t.accent}"`))
  })

  it('falls back to the fg/bg mix when the theme has no override', () => {
    const t = THEMES['zinc-light']!
    const out = resolveSvgForRaster(render('graph TD\n  A --> B', 'zinc-light'))
    expect(out).toMatch(new RegExp(`<polyline[^>]*stroke="${mixHex(t.fg, t.bg, 50)}"`, 'i'))
  })

  it('leaves no var() or color-mix() for the canvas to resolve', () => {
    for (const theme of Object.keys(THEMES)) {
      for (const code of [XY, 'classDiagram\n  class A {\n    +int x\n  }\n  A <|-- B', 'erDiagram\n  A ||--o{ B : has\n  A {\n    int id PK\n  }']) {
        const out = resolveSvgForRaster(render(code, theme))
        expect(out, theme).not.toMatch(/var\(/)
        expect(out, theme).not.toMatch(/color-mix/)
      }
    }
  })

  it('gives xychart bars a visible colour, not the background', () => {
    const t = THEMES['tokyo-night']!
    const out = resolveSvgForRaster(render(XY, 'tokyo-night'))
    expect(out).toContain(`.xychart-bar.xychart-color-0 { stroke: ${t.accent}; fill: ${mixHex(t.bg, t.accent!, 75)};`)
    expect(out).not.toContain(`.xychart-grid { fill: ${t.bg}`)
  })

  it('does not change label text that looks like a CSS var', () => {
    const out = resolveSvgForRaster(render('graph TD\n  A["var(--bg) --line: #ff0000;"] --> B', 'zinc-light'))
    expect(out).toContain('>var(--bg) --line: #ff0000;</text>')
    expect(out).not.toMatch(/<polyline[^>]*stroke="#ff0000"/)
  })

  it('adds a background rect and strips @import', () => {
    const out = resolveSvgForRaster(render('graph TD\n  A --> B', 'dracula'))
    expect(out).not.toContain('@import')
    expect(out).not.toContain('display=swap')
    expect(out).toMatch(/<style>\s*text \{ font-family:/)
    expect(out).toMatch(new RegExp(`^<svg[^>]*><rect x="0" y="0" width="[\\d.]+" height="[\\d.]+" fill="${THEMES['dracula']!.bg}"/>`))
  })
})

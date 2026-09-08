import { describe, expect, it } from 'vitest'
import { formatD2Error, sanitizeSvg } from '../tools/d2/render'

describe('D2 SVG sanitization', () => {
  it('removes executable content from previews and exported diagrams', () => {
    const svg = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
      <script>alert(1)</script><a href="javascript:alert(1)"><text>Link</text></a>
      <foreignObject><div xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="alert(1)" /><iframe src="https://example.com"></iframe></div></foreignObject>
    </svg>`)
    expect(svg).not.toMatch(/<script|onload|onerror|javascript:|<iframe/)
    expect(svg).toContain('Link')
  })

  it('preserves SVG geometry, embedded fonts, and Markdown labels', () => {
    const svg = sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
      <style>@font-face {font-family: d2; src: url("data:application/font-woff;base64,AAAA")}</style>
      <path d="M0 0L10 10" />
      <foreignObject width="100" height="50"><div xmlns="http://www.w3.org/1999/xhtml"><strong>Label</strong></div></foreignObject>
    </svg>`)
    expect(svg).toContain('viewBox="0 0 200 100"')
    expect(svg).toContain('data:application/font-woff;base64,AAAA')
    expect(svg).toContain('<foreignObject')
    expect(svg).toContain('<strong>Label</strong>')
    expect(svg).toContain('d="M0 0L10 10"')
  })
})

describe('D2 diagnostics', () => {
  it('shows compiler messages with line numbers without the JSON wrapper', () => {
    const diagnostics = [{ range: 'index,0:0:0-0:1:1', errmsg: 'index:1:1: unknown shape' }]
    expect(formatD2Error(new Error(JSON.stringify(diagnostics)))).toBe('index:1:1: unknown shape')
  })

  it('preserves ordinary worker errors and unexpected error formats', () => {
    expect(formatD2Error(new Error('Failed to load WebAssembly'))).toBe('Failed to load WebAssembly')
    expect(formatD2Error(new Error('[{"other":"error"}]'))).toBe('[{"other":"error"}]')
  })
})

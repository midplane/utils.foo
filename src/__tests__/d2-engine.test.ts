// @vitest-environment node
import { afterAll, describe, expect, it } from 'vitest'
import { D2 } from '@d2lang/d2'
import { SAMPLES } from '../tools/d2/samples'

const engine = new D2()
afterAll(() => engine.dispose())

describe('D2 WebAssembly rendering', () => {
  for (const layout of ['tala', 'dagre', 'elk'] as const) {
    for (const sample of SAMPLES) {
      if (sample.value === 'positions' && layout !== 'tala') continue
      it(`renders ${sample.label} with ${layout}`, async () => {
        const result = await engine.compile(sample.code, { layout })
        const svg = await engine.render(result.diagram, result.renderOptions)
        expect(result.diagram.shapes.length).toBeGreaterThan(0)
        expect(svg).toContain('<svg')
        expect(svg).toContain('</svg>')
      }, 30_000)
    }
  }

  it('reports syntax errors and can render again afterward', async () => {
    await expect(engine.compile('broken: {', { layout: 'tala' })).rejects.toThrow()
    const result = await engine.compile('hello -> world', { layout: 'tala', sketch: true, themeID: 200 })
    expect(await engine.render(result.diagram, result.renderOptions)).toContain('<svg')
  })

  for (const layout of ['tala', 'elk'] as const) {
    for (const asciiMode of ['standard', 'extended'] as const) {
      it(`renders ${asciiMode} text with ${layout}`, async () => {
        const result = await engine.compile('hello -> world', { layout, ascii: true, asciiMode })
        const text = await engine.render(result.diagram, { ...result.renderOptions, ascii: true, asciiMode })
        expect(text).toContain('hello')
        expect(text).toContain('world')
        expect(text).not.toContain('<svg')
        expect(text.split('\n').length).toBeGreaterThan(2)
        if (asciiMode === 'standard') expect([...text].every(char => char.charCodeAt(0) < 128)).toBe(true)
        else expect(text).toMatch(/[\u2500-\u257F]/)
      })
    }
  }
})

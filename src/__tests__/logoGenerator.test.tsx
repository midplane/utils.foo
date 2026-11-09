import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import LogoGenerator from '../tools/logo-generator'
import { buildSvg, escapeXml } from '../tools/logo-generator/svg'

const BASE = {
  lines: ['utils.foo'],
  width: 512,
  height: 512,
  fontSize: 72,
  fontFamily: 'Inter, sans-serif',
  fontWeight: '700',
  bgColor: '#1C1917',
  fgColor: '#FFFBF5',
  letterSpacing: -2,
  lineHeight: 1.2,
}

function parseSvg(svg: string): Document {
  return new DOMParser().parseFromString(svg, 'image/svg+xml')
}

function hasParseError(doc: Document): boolean {
  return doc.getElementsByTagName('parsererror').length > 0
}

// ─── buildSvg ─────────────────────────────────────────────────────────────────

describe('logo generator buildSvg', () => {
  it('escapes XML special characters in the text', () => {
    const doc = parseSvg(buildSvg({ ...BASE, lines: [`A & B <c> "d" 'e'`] }))
    expect(hasParseError(doc)).toBe(false)
    expect(doc.querySelector('tspan')?.textContent).toBe(`A & B <c> "d" 'e'`)
  })

  it('escapes colour values so they cannot add attributes or elements', () => {
    const svg = buildSvg({
      ...BASE,
      bgColor: '#fff" onload="alert(1)',
      fgColor: `red'/><script>alert(1)</script>`,
    })
    const doc = parseSvg(svg)
    expect(hasParseError(doc)).toBe(false)
    const rect = doc.querySelector('rect')!
    expect(rect.getAttribute('onload')).toBeNull()
    expect(rect.getAttribute('fill')).toBe('#fff" onload="alert(1)')
    expect(doc.querySelector('script')).toBeNull()
  })

  it('removes characters that XML does not allow', () => {
    const doc = parseSvg(buildSvg({ ...BASE, lines: ['a\x01b\x0Cc\uD800d'] }))
    expect(hasParseError(doc)).toBe(false)
    expect(doc.querySelector('tspan')?.textContent).toBe('abcd')
  })

  it('keeps valid surrogate pairs such as emoji', () => {
    expect(escapeXml('hi 🚀')).toBe('hi 🚀')
  })

  it('preserves repeated, leading and trailing spaces', () => {
    const doc = parseSvg(buildSvg({ ...BASE, lines: ['  a   b  '] }))
    const text = doc.querySelector('text')!
    expect(text.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'space')).toBe('preserve')
    expect(text.querySelector('tspan')?.textContent).toBe('  a   b  ')
  })

  it('keeps an empty line so the next lines stay in position', () => {
    const doc = parseSvg(buildSvg({ ...BASE, lines: ['a', '', 'b'] }))
    const tspans = doc.querySelectorAll('tspan')
    expect(tspans).toHaveLength(3)
    expect(tspans[1]!.textContent).toBe('\u200B')
  })
})

// ─── PNG export ───────────────────────────────────────────────────────────────

class FakeImage {
  static instances: FakeImage[] = []
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  constructor() { FakeImage.instances.push(this) }
}

describe('logo generator PNG export', () => {
  const drawImage = vi.fn()
  const blobs = new Map<string, Blob>()
  const downloads: string[] = []

  beforeEach(() => {
    FakeImage.instances = []
    drawImage.mockReset()
    blobs.clear()
    downloads.length = 0
    vi.stubGlobal('Image', FakeImage)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ({ drawImage } as unknown as CanvasRenderingContext2D),
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb) {
      cb(new Blob(['png'], { type: 'image/png' }))
    })
    let n = 0
    vi.spyOn(URL, 'createObjectURL').mockImplementation((obj) => {
      const url = `blob:${n++}`
      blobs.set(url, obj as Blob)
      return url
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders the current settings when the user clicks, not an earlier draw', async () => {
    render(<LogoGenerator />)
    fireEvent.change(screen.getByPlaceholderText('Your logo text…'), { target: { value: 'first' } })
    fireEvent.change(screen.getByPlaceholderText('Your logo text…'), { target: { value: 'second' } })

    fireEvent.click(screen.getByRole('button', { name: /PNG/ }))
    expect(FakeImage.instances).toHaveLength(1)
    const img = FakeImage.instances[0]!
    const svg = await blobs.get(img.src)!.text()
    expect(svg).toContain('>second</tspan>')

    act(() => { img.onload?.() })
    expect(drawImage).toHaveBeenCalledWith(img, 0, 0, 512, 512)
    expect(downloads).toEqual(['logo.png'])
  })

  it('does not revoke the download URL before the browser can use it', () => {
    vi.useFakeTimers()
    try {
      render(<LogoGenerator />)
      fireEvent.click(screen.getByRole('button', { name: /SVG/ }))
      expect(downloads).toEqual(['logo.svg'])
      expect(URL.revokeObjectURL).not.toHaveBeenCalled()
      vi.runAllTimers()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:0')
    } finally {
      vi.useRealTimers()
    }
  })

  it('escapes the colour in the live preview', () => {
    const { container } = render(<LogoGenerator />)
    const bg = screen.getAllByDisplayValue('#1C1917').find(e => e.getAttribute('type') !== 'color')!
    fireEvent.change(bg, { target: { value: '#fff" onmouseover="alert(1)' } })
    const rect = container.querySelector('svg[viewBox="0 0 512 512"] rect')!
    expect(rect.getAttribute('onmouseover')).toBeNull()
  })
})

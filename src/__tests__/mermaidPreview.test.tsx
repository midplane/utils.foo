import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'

vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ isDark: false, toggle: () => {} }) }))

let observers: { cb: ResizeObserverCallback; el: Element }[] = []

// Reports a new size for the preview scroll container only.
function reportSize(width: number, height: number) {
  for (const { cb, el } of observers) {
    if (el.className.includes('overflow-auto')) cb([{ contentRect: { width, height } } as ResizeObserverEntry], {} as ResizeObserver)
  }
}

beforeAll(() => {
  class FakeResizeObserver {
    constructor(private cb: ResizeObserverCallback) {}
    observe(el: Element) { observers.push({ cb: this.cb, el }) }
    unobserve() {}
    disconnect() { observers = observers.filter(o => o.cb !== this.cb) }
  }
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
  })
  document.createRange = () => {
    const range = new Range()
    range.getBoundingClientRect = () => new DOMRect()
    range.getClientRects = () => ({ item: () => null, length: 0, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
    return range
  }
})

const { default: MermaidTool } = await import('../tools/mermaid/index')

function diagram() {
  const svg = document.querySelector('svg[style*="--bg"]') as SVGSVGElement
  return { svg, box: svg.parentElement as HTMLElement, w: parseFloat(svg.getAttribute('width')!), h: parseFloat(svg.getAttribute('height')!) }
}

describe('Mermaid preview zoom', () => {
  it('sizes the diagram box to the zoom so the scroll area matches it', () => {
    render(<MermaidTool />)
    const { box, w, h } = diagram()
    expect(box.style.transform).toBe('')

    // Fit to a pane narrower than the diagram.
    act(() => reportSize(232, 2000))
    const fit = 200 / w
    expect(parseFloat(box.style.width)).toBeCloseTo(w * fit)
    expect(parseFloat(box.style.height)).toBeCloseTo(h * fit)
    expect(screen.getByText(`${Math.round(fit * 100)}%`)).toBeTruthy()

    fireEvent.click(screen.getByTitle('Zoom in'))
    expect(parseFloat(box.style.width)).toBeCloseTo(w * fit * 1.25)

    fireEvent.click(screen.getByTitle('Fit to window'))
    expect(parseFloat(box.style.width)).toBeCloseTo(w * fit)
  })

  it('keeps the zoom controls outside the scroll container', () => {
    render(<MermaidTool />)
    const scroller = diagram().box.parentElement as HTMLElement
    expect(scroller.className).toContain('overflow-auto')
    expect(scroller.contains(screen.getAllByTitle('Zoom in')[0]!)).toBe(false)
  })
})

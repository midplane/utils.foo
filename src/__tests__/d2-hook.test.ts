import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useD2, type RenderFormat } from '../tools/d2/useD2'

const mocks = vi.hoisted(() => ({ compile: vi.fn(), render: vi.fn(), dispose: vi.fn() }))
vi.mock('@d2lang/d2', () => ({
  D2: class {
    compile = mocks.compile
    render = mocks.render
    dispose = mocks.dispose
  },
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetAllMocks()
  mocks.compile.mockResolvedValue({ diagram: {}, renderOptions: {} })
  mocks.render.mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg"><text>Diagram</text></svg>')
  mocks.dispose.mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.useRealTimers() })

const advance = (ms = 400) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

describe('D2 live preview', () => {
  it('debounces typing and compiles only the latest source', async () => {
    const { result, rerender } = renderHook(({ code }) => useD2(code, 'tala', 0, false, 0), { initialProps: { code: 'a' } })
    await advance(200)
    rerender({ code: 'a -> b' })
    await advance()
    expect(mocks.compile).toHaveBeenCalledTimes(1)
    expect(mocks.compile).toHaveBeenCalledWith('a -> b', expect.objectContaining({ layout: 'tala' }))
    expect(result.current.output).toContain('Diagram')
    expect(result.current.pending).toBe(false)
  })

  it('ignores an older render that completes after the current one', async () => {
    let finishOld!: (svg: string) => void
    mocks.render.mockImplementationOnce(() => new Promise<string>(resolve => { finishOld = resolve }))
    const { result, rerender } = renderHook(({ code }) => useD2(code, 'tala', 0, false, 0), { initialProps: { code: 'old' } })
    await advance()
    rerender({ code: 'new' })
    await advance()
    await act(async () => { finishOld('<svg><text>Old</text></svg>') })
    expect(result.current.output).toContain('Diagram')
    expect(result.current.output).not.toContain('Old')
  })

  it('clears output immediately when source is empty', async () => {
    const { result, rerender } = renderHook(({ code }) => useD2(code, 'tala', 0, false, 0), { initialProps: { code: 'a' } })
    await advance()
    rerender({ code: '  ' })
    expect(result.current).toEqual({ output: '', error: '', pending: false })
    await advance()
    expect(mocks.compile).toHaveBeenCalledTimes(1)
  })

  it('reports compiler errors and recovers after editing', async () => {
    mocks.compile.mockRejectedValueOnce(new Error('index:1: missing closing brace'))
    const { result, rerender } = renderHook(({ code }) => useD2(code, 'elk', 0, false, 0), { initialProps: { code: 'a: {' } })
    await advance()
    expect(result.current.error).toContain('missing closing brace')
    expect(result.current.output).toBe('')
    rerender({ code: 'a -> b' })
    await advance()
    expect(result.current.error).toBe('')
    expect(result.current.output).toContain('Diagram')
  })

  it('terminates a stalled engine and allows retrying', async () => {
    mocks.compile.mockImplementationOnce(() => new Promise(() => {}))
    const { result, rerender } = renderHook(({ revision }) => useD2('a', 'tala', 0, false, revision), { initialProps: { revision: 0 } })
    await advance(30_400)
    expect(result.current.error).toContain('too long')
    expect(mocks.dispose).toHaveBeenCalledTimes(1)
    rerender({ revision: 1 })
    await advance()
    expect(result.current.output).toContain('Diagram')
  })

  it('disposes its worker when leaving the tool', async () => {
    const { unmount } = renderHook(() => useD2('a', 'tala', 0, false, 0))
    await advance()
    unmount()
    expect(mocks.dispose).toHaveBeenCalledTimes(1)
  })

  it('preserves ASCII whitespace and literal HTML-like labels, using ELK for Dagre', async () => {
    const text = '+----------+\n| <client> |----> server\n+----------+\n'
    mocks.render.mockResolvedValue(text)
    const { result } = renderHook(() => useD2('client -> server', 'dagre', 0, true, 0, 'standard'))
    await advance()
    expect(mocks.compile).toHaveBeenCalledWith('client -> server', expect.objectContaining({
      layout: 'elk', ascii: true, asciiMode: 'standard', sketch: false,
    }))
    expect(mocks.render).toHaveBeenCalledWith({}, expect.objectContaining({ ascii: true, asciiMode: 'standard' }))
    expect(result.current.output).toBe(text)
  })

  it('clears the old format immediately and prevents a late SVG from replacing ASCII', async () => {
    let finishSvg!: (svg: string) => void
    mocks.render.mockImplementationOnce(() => new Promise<string>(resolve => { finishSvg = resolve }))
    const { result, rerender } = renderHook(({ format }: { format: RenderFormat }) => useD2('a -> b', 'tala', 0, false, 0, format), {
      initialProps: { format: 'svg' },
    })
    await advance()
    mocks.render.mockResolvedValue('a --> b')
    rerender({ format: 'extended' })
    expect(result.current.output).toBe('')
    expect(result.current.pending).toBe(true)
    await advance()
    await act(async () => { finishSvg('<svg><text>Old SVG</text></svg>') })
    expect(result.current.output).toBe('a --> b')
    expect(mocks.render).toHaveBeenLastCalledWith({}, expect.objectContaining({ ascii: true, asciiMode: 'extended' }))
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EChartsOption } from 'echarts'

const mocks = vi.hoisted(() => {
  const setOption = vi.fn()
  const flush = vi.fn()
  const getDataURL = vi.fn(() => 'data:image/png;base64,exported')
  const renderToSVGString = vi.fn(() => '<svg><path /></svg>')
  const dispose = vi.fn()
  const instance = {
    setOption,
    getZr: () => ({ flush }),
    getDataURL,
    renderToSVGString,
    dispose,
  }
  return { setOption, flush, getDataURL, renderToSVGString, dispose, instance, init: vi.fn(() => instance) }
})

vi.mock('echarts', () => ({ init: mocks.init }))

const { exportPNG, exportSVG } = await import('../tools/chart-builder/export')

const SERIES = { type: 'bar' as const, data: [4, 8, 15, 16, 23, 42] }

const OPTION: EChartsOption = {
  animation: true,
  backgroundColor: '#fff',
  series: [SERIES],
}

describe('chart export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:chart'),
      revokeObjectURL: vi.fn(),
    })
  })

  it.each(['png', 'svg'] as const)('finishes a static render before serializing %s', (format) => {
    if (format === 'png') {
      exportPNG(OPTION, { width: 640, height: 360, scale: 2 }, { width: 1, height: 1 }, '#fff')
    } else {
      exportSVG(OPTION, { width: 640, height: 360, scale: 2 }, { width: 1, height: 1 })
    }

    const renderedOption = mocks.setOption.mock.calls[0]?.[0] as EChartsOption
    expect(renderedOption.animation).toBe(false)
    expect(renderedOption.series).toEqual([
      expect.objectContaining({ type: 'bar', data: SERIES.data, animation: false, progressive: 0 }),
    ])
    expect(mocks.setOption).toHaveBeenCalledWith(renderedOption, { notMerge: true, lazyUpdate: false })
    expect(mocks.flush).toHaveBeenCalledOnce()

    const serialize = format === 'png' ? mocks.getDataURL : mocks.renderToSVGString
    expect(mocks.flush.mock.invocationCallOrder[0]).toBeLessThan(serialize.mock.invocationCallOrder[0]!)
    expect(mocks.dispose).toHaveBeenCalledOnce()
  })

  it('does not disable animation on the live chart option', () => {
    exportPNG(OPTION, { width: 640, height: 360, scale: 1 }, { width: 1, height: 1 }, '#fff')

    expect(OPTION.animation).toBe(true)
    expect(SERIES).not.toHaveProperty('animation')
    expect(SERIES).not.toHaveProperty('progressive')
  })
})

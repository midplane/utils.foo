import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

export type ExportFormat = 'png' | 'svg'

export interface ExportSize {
  width: number
  height: number
  /** Device-pixel multiplier for raster output. */
  scale: number
}

export const SIZE_PRESETS: Record<string, { width: number; height: number; label: string }> = {
  current: { width: 0, height: 0, label: 'On-screen size' },
  slide: { width: 1280, height: 720, label: 'Slide (1280×720)' },
  wide: { width: 1920, height: 1080, label: 'Full HD (1920×1080)' },
  square: { width: 1080, height: 1080, label: 'Square (1080×1080)' },
  doc: { width: 800, height: 500, label: 'Document (800×500)' },
}

export const DEFAULT_EXPORT_SIZE: ExportSize = { width: 0, height: 0, scale: 2 }

/**
 * Render an option to an offscreen instance at an explicit size.
 *
 * Exporting straight from the on-screen chart locks the output to whatever the
 * viewport happens to be, so a chart destined for a slide came out at whatever
 * width the browser window was. Rendering offscreen decouples the two.
 */
function withOffscreen<T>(
  option: EChartsOption,
  size: { width: number; height: number },
  renderer: 'canvas' | 'svg',
  fn: (instance: echarts.ECharts) => T
): T {
  const host = document.createElement('div')
  host.style.width = `${size.width}px`
  host.style.height = `${size.height}px`
  // Kept out of the layout and out of the accessibility tree; ECharts still
  // measures it correctly because the explicit size is set above.
  host.style.position = 'fixed'
  host.style.left = '-10000px'
  host.style.top = '0'
  host.setAttribute('aria-hidden', 'true')
  document.body.appendChild(host)

  const instance = echarts.init(host, null, {
    renderer,
    width: size.width,
    height: size.height,
  })
  try {
    instance.setOption(option)
    return fn(instance)
  } finally {
    instance.dispose()
    host.remove()
  }
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
}

function resolveSize(
  size: ExportSize,
  fallback: { width: number; height: number }
): { width: number; height: number } {
  const width = size.width > 0 ? size.width : Math.max(1, Math.round(fallback.width))
  const height = size.height > 0 ? size.height : Math.max(1, Math.round(fallback.height))
  return { width, height }
}

export function exportPNG(
  option: EChartsOption,
  size: ExportSize,
  fallback: { width: number; height: number },
  background: string,
  filename = 'chart.png'
) {
  const target = resolveSize(size, fallback)
  // The canvas renderer is required for this to produce an actual raster:
  // under the SVG renderer getDataURL ignores `type` and returns SVG markup.
  const url = withOffscreen(option, target, 'canvas', (instance) =>
    instance.getDataURL({ type: 'png', pixelRatio: size.scale, backgroundColor: background })
  )
  triggerDownload(url, filename)
}

export function exportSVG(
  option: EChartsOption,
  size: ExportSize,
  fallback: { width: number; height: number },
  filename = 'chart.svg'
) {
  const target = resolveSize(size, fallback)
  const svg = withOffscreen(option, target, 'svg', (instance) => instance.renderToSVGString())
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  triggerDownload(url, filename)
  // Revoking immediately can race the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Copy the chart to the clipboard as a PNG image. Returns false if unsupported. */
export async function copyPNGToClipboard(
  option: EChartsOption,
  size: ExportSize,
  fallback: { width: number; height: number },
  background: string
): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false

  const target = resolveSize(size, fallback)
  const dataUrl = withOffscreen(option, target, 'canvas', (instance) =>
    instance.getDataURL({ type: 'png', pixelRatio: size.scale, backgroundColor: background })
  )
  const blob = await (await fetch(dataUrl)).blob()
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  return true
}

/**
 * The ECharts option as formatted JSON.
 *
 * Functions cannot survive JSON, and several formatters here are functions, so
 * they are replaced with a readable marker rather than silently vanishing and
 * leaving the reader with an option that behaves differently from the preview.
 */
export function optionToJSON(option: EChartsOption): string {
  return JSON.stringify(
    option,
    (_key, value) => (typeof value === 'function' ? '/* formatter function omitted */' : value),
    2
  )
}

export function downloadJSON(option: EChartsOption, filename = 'chart-option.json') {
  const url = URL.createObjectURL(new Blob([optionToJSON(option)], { type: 'application/json' }))
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

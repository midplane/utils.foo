/**
 * Import and export.
 *
 * The image export renders its own standalone SVG rather than serialising the
 * on-screen chart. The live chart is half HTML (the frozen grid and the date
 * header are DOM, not SVG) and is styled with CSS custom properties that mean
 * nothing once the markup leaves the page, so a serialised copy would arrive
 * with no task names and no colours. Rendering fresh also decouples the output
 * from however wide the browser window happens to be.
 */

import Papa from 'papaparse'
import { formatISODate, parseISODate, todayDayNumber } from './calendar'
import {
  CalendarConfig,
  DEFAULT_CALENDAR_CONFIG,
  DEPENDENCY_TYPES,
  Dependency,
  DependencyType,
  Project,
  TASK_COLORS,
  Task,
  TaskColor,
  makeTask,
} from './model'
import { Schedule, toWorkCalendar } from './schedule'
import { Timeline, nonWorkingBands, xForDay } from './timeline'

// ─── Theme snapshot ───────────────────────────────────────────────────────────

export interface RenderTheme {
  surface: string
  ink: string
  inkLight: string
  inkMuted: string
  border: string
  nonWorking: string
  critical: string
  bar: Record<TaskColor, string>
}

/**
 * Resolve the theme tokens to concrete colours.
 *
 * `var(--x)` does not resolve inside a detached SVG, so every colour has to be
 * baked in at export time. Reading them back off the live document means the
 * export follows the user's current theme instead of a hardcoded guess.
 */
export function readTheme(): RenderTheme {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    surface: read('--color-surface', '#ffffff'),
    ink: read('--color-ink', '#1c1917'),
    inkLight: read('--color-ink-light', '#44403c'),
    inkMuted: read('--color-ink-muted', '#78716c'),
    border: read('--color-border', '#e7e5e4'),
    nonWorking: read('--color-cream-dark', '#fff7ed'),
    critical: read('--color-error-icon', '#ef4444'),
    bar: {
      blue: read('--color-gantt-blue', '#2a78d6'),
      orange: read('--color-gantt-orange', '#eb6834'),
      aqua: read('--color-gantt-aqua', '#1baf7a'),
    },
  }
}

const escapeXML = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const FONT_STACK = 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'

export interface SvgOptions {
  /** Width of the task-name column in the exported image. */
  labelWidth: number
  rowHeight: number
  showCritical: boolean
  showLinks: boolean
  title: string
  calendar: CalendarConfig
}

export const DEFAULT_SVG_OPTIONS: SvgOptions = {
  labelWidth: 240,
  rowHeight: 28,
  showCritical: true,
  showLinks: true,
  title: '',
  calendar: DEFAULT_CALENDAR_CONFIG,
}

export function renderGanttSVG(
  schedule: Schedule,
  timeline: Timeline,
  theme: RenderTheme,
  options: SvgOptions
): string {
  const rows = schedule.visible
  const { labelWidth, rowHeight } = options
  const headerHeight = 44
  const titleHeight = options.title ? 30 : 0
  const bodyHeight = Math.max(rowHeight, rows.length * rowHeight)
  const width = labelWidth + timeline.width
  const height = titleHeight + headerHeight + bodyHeight
  const top = titleHeight + headerHeight
  const barHeight = Math.min(16, rowHeight - 10)

  const parts: string[] = []
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT_STACK}">`
  )
  parts.push(`<rect width="${width}" height="${height}" fill="${theme.surface}"/>`)

  if (options.title) {
    parts.push(
      `<text x="12" y="20" font-size="14" font-weight="600" fill="${theme.ink}">${escapeXML(options.title)}</text>`
    )
  }

  // Non-working shading, from the same helper the live chart uses.
  for (const band of nonWorkingBands(timeline, toWorkCalendar(options.calendar))) {
    parts.push(
      `<rect x="${labelWidth + band.x}" y="${top}" width="${band.width}" height="${bodyHeight}" fill="${theme.nonWorking}"/>`
    )
  }

  // Period grid lines and the date header.
  for (const band of timeline.upper) {
    const x = labelWidth + band.x
    parts.push(
      `<line x1="${x}" y1="${titleHeight}" x2="${x}" y2="${height}" stroke="${theme.border}" stroke-width="1"/>`
    )
    parts.push(
      `<text x="${x + 5}" y="${titleHeight + 15}" font-size="11" font-weight="500" fill="${theme.inkLight}">${escapeXML(band.label)}</text>`
    )
  }
  for (const band of timeline.lower) {
    const x = labelWidth + band.x
    parts.push(
      `<line x1="${x}" y1="${titleHeight + 22}" x2="${x}" y2="${height}" stroke="${theme.border}" stroke-width="0.5"/>`
    )
    if (band.width > 16) {
      parts.push(
        `<text x="${x + band.width / 2}" y="${titleHeight + 36}" font-size="10" text-anchor="middle" fill="${theme.inkMuted}">${escapeXML(band.label)}</text>`
      )
    }
  }
  parts.push(
    `<line x1="0" y1="${top}" x2="${width}" y2="${top}" stroke="${theme.inkMuted}" stroke-width="1"/>`
  )

  // Today marker.
  const today = todayDayNumber()
  if (today >= timeline.origin && today <= timeline.end) {
    const x = labelWidth + xForDay(timeline, today) + timeline.dayWidth / 2
    parts.push(
      `<line x1="${x}" y1="${top}" x2="${x}" y2="${height}" stroke="${theme.critical}" stroke-width="1.5" stroke-dasharray="3 3"/>`
    )
  }

  const geometry = (id: string) => {
    const index = rows.findIndex((row) => row.id === id)
    const row = rows[index]
    if (!row || index < 0) return null
    const x = labelWidth + xForDay(timeline, row.start)
    const w = Math.max(timeline.dayWidth, (row.end - row.start + 1) * timeline.dayWidth)
    return { row, x, width: w, mid: top + index * rowHeight + rowHeight / 2 }
  }

  // Dependency links.
  if (options.showLinks) {
    for (const row of rows) {
      for (const dep of row.deps) {
        const from = geometry(dep.from)
        const to = geometry(row.id)
        if (!from || !to) continue
        const fromEnd = dep.type === 'FS' || dep.type === 'FF'
        const toStart = dep.type === 'FS' || dep.type === 'SS'
        const x1 = fromEnd ? from.x + from.width : from.x
        const x2 = toStart ? to.x : to.x + to.width
        const critical = options.showCritical && from.row.critical && to.row.critical
        const stroke = critical ? theme.critical : theme.inkMuted
        const stub = 11
        const turn = toStart ? x2 - stub : x2 + stub
        const path =
          (toStart ? turn >= x1 : turn <= x1)
            ? `M ${x1} ${from.mid} L ${turn} ${from.mid} L ${turn} ${to.mid} L ${x2} ${to.mid}`
            : `M ${x1} ${from.mid} L ${x1 + (fromEnd ? stub : -stub)} ${from.mid} L ${x1 + (fromEnd ? stub : -stub)} ${
                to.mid > from.mid ? from.mid + rowHeight / 2 : from.mid - rowHeight / 2
              } L ${turn} ${to.mid > from.mid ? from.mid + rowHeight / 2 : from.mid - rowHeight / 2} L ${turn} ${to.mid} L ${x2} ${to.mid}`
        parts.push(
          `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="1.2" stroke-linejoin="round"/>`
        )
        const dir = toStart ? 1 : -1
        parts.push(
          `<polygon points="${x2},${to.mid} ${x2 - dir * 6},${to.mid - 3.5} ${x2 - dir * 6},${to.mid + 3.5}" fill="${stroke}"/>`
        )
      }
    }
  }

  // Rows: label, then bar.
  rows.forEach((row, index) => {
    const y = top + index * rowHeight
    const mid = y + rowHeight / 2
    const barY = mid - barHeight / 2
    // Same rule as the live chart: critical keeps its category colour and is
    // marked by a red outline, so the palette survives on a plan where most
    // tasks are critical.
    const critical = options.showCritical && row.critical
    const fill = theme.bar[row.task.color]
    const outline = critical ? theme.critical : fill
    const outlineWidth = critical ? 2 : 1

    parts.push(
      `<line x1="0" y1="${y + rowHeight}" x2="${width}" y2="${y + rowHeight}" stroke="${theme.border}" stroke-width="0.5"/>`
    )

    const indent = 8 + row.depth * 12
    const maxChars = Math.max(4, Math.floor((labelWidth - indent - 8) / 6.2))
    const name =
      row.task.name.length > maxChars ? `${row.task.name.slice(0, maxChars - 1)}…` : row.task.name
    parts.push(
      `<text x="${indent}" y="${mid + 4}" font-size="11.5" font-weight="${row.isSummary ? 600 : 400}" fill="${theme.ink}">${escapeXML(name)}</text>`
    )

    const x = labelWidth + xForDay(timeline, row.start)
    const w = Math.max(timeline.dayWidth, (row.end - row.start + 1) * timeline.dayWidth)

    if (row.duration === 0 && !row.isSummary) {
      const cx = x + w / 2
      const size = Math.min(10, barHeight * 0.7)
      parts.push(
        `<path d="M ${cx} ${mid - size} L ${cx + size} ${mid} L ${cx} ${mid + size} L ${cx - size} ${mid} Z" fill="${fill}" stroke="${outline}" stroke-width="${critical ? 2 : 0}"/>`
      )
    } else if (row.isSummary) {
      parts.push(
        `<path d="M ${x} ${barY + 1} L ${x} ${barY + 9} L ${x + 4} ${barY + 5} L ${x + w - 4} ${barY + 5} L ${x + w} ${barY + 9} L ${x + w} ${barY + 1} Z" fill="${fill}" opacity="0.9"/>`
      )
    } else {
      parts.push(
        `<rect x="${x + 1}" y="${barY}" width="${Math.max(2, w - 2)}" height="${barHeight}" rx="4" fill="${fill}" opacity="0.4"/>`
      )
      if (row.progress > 0) {
        parts.push(
          `<rect x="${x + 1}" y="${barY}" width="${Math.max(1, ((w - 2) * Math.min(100, row.progress)) / 100)}" height="${barHeight}" rx="4" fill="${fill}"/>`
        )
      }
      parts.push(
        `<rect x="${x + 1}" y="${barY}" width="${Math.max(2, w - 2)}" height="${barHeight}" rx="4" fill="none" stroke="${outline}" stroke-width="${outlineWidth}"/>`
      )
    }
  })

  parts.push(
    `<line x1="${labelWidth}" y1="${titleHeight}" x2="${labelWidth}" y2="${height}" stroke="${theme.inkMuted}" stroke-width="1"/>`
  )
  parts.push('</svg>')
  return parts.join('\n')
}

// ─── Downloads ────────────────────────────────────────────────────────────────

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
}

function downloadText(text: string, mime: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  triggerDownload(url, filename)
  // Revoking immediately can race the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function downloadSVG(svg: string, filename = 'gantt.svg') {
  downloadText(svg, 'image/svg+xml', filename)
}

/** Rasterise the SVG through an offscreen canvas. */
export async function svgToPNG(svg: string, scale: number, background: string): Promise<string> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('The chart could not be rasterised.'))
      image.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is unavailable in this browser.')
    // The SVG background is already painted, but a transparent PNG pasted into
    // a dark document would show the bars floating on nothing.
    context.fillStyle = background
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function downloadPNG(svg: string, scale: number, background: string, filename = 'gantt.png') {
  triggerDownload(await svgToPNG(svg, scale, background), filename)
}

export async function copyPNGToClipboard(svg: string, scale: number, background: string): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false
  const dataUrl = await svgToPNG(svg, scale, background)
  const blob = await (await fetch(dataUrl)).blob()
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  return true
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  'id',
  'name',
  'parent',
  'start',
  'duration',
  'progress',
  'assignee',
  'color',
  'notes',
  'dependencies',
] as const

/** `pred:FS+2` — the id, the link type, and a signed lag when it is non-zero. */
function formatDependency(dep: Dependency): string {
  const lag = dep.lag === 0 ? '' : dep.lag > 0 ? `+${dep.lag}` : String(dep.lag)
  return `${dep.from}:${dep.type}${lag}`
}

function parseDependency(text: string): Dependency | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const match = /^(.+?)(?::([A-Za-z]{2})([+-]\d+)?)?$/.exec(trimmed)
  if (!match || !match[1]) return null
  const type = (match[2] ?? 'FS').toUpperCase() as DependencyType
  return {
    from: match[1],
    type: DEPENDENCY_TYPES.includes(type) ? type : 'FS',
    lag: match[3] ? Number(match[3]) : 0,
  }
}

export function projectToCSV(project: Project, schedule: Schedule): string {
  const rows = project.tasks.map((task) => {
    const scheduled = schedule.byId.get(task.id)
    return {
      id: task.id,
      name: task.name,
      parent: task.parentId ?? '',
      // The resolved date, not the stored floor: a CSV of a scheduled plan
      // should say when each task actually happens.
      start: scheduled ? formatISODate(scheduled.start) : task.start,
      duration: scheduled?.isSummary ? scheduled.duration : task.duration,
      progress: task.progress,
      assignee: task.assignee,
      color: task.color,
      notes: task.notes,
      dependencies: task.deps.map(formatDependency).join(' '),
    }
  })
  return Papa.unparse(rows, { columns: [...CSV_COLUMNS] })
}

export interface ImportResult {
  project: Project
  warnings: string[]
}

/** Column aliases, so a CSV exported from another planner usually just works. */
const HEADER_ALIASES: Record<string, string> = {
  task: 'name',
  title: 'name',
  'task name': 'name',
  'start date': 'start',
  begin: 'start',
  days: 'duration',
  length: 'duration',
  percent: 'progress',
  'percent complete': 'progress',
  complete: 'progress',
  owner: 'assignee',
  resource: 'assignee',
  predecessors: 'dependencies',
  predecessor: 'dependencies',
  depends: 'dependencies',
  'depends on': 'dependencies',
  parentid: 'parent',
  'parent id': 'parent',
  end: 'end',
  'end date': 'end',
  finish: 'end',
}

function normaliseHeader(header: string): string {
  const key = header.trim().toLowerCase()
  return HEADER_ALIASES[key] ?? key
}

export function projectFromCSV(text: string): ImportResult {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: normaliseHeader,
  })
  const warnings: string[] = []
  for (const error of parsed.errors.slice(0, 3)) {
    warnings.push(`Row ${(error.row ?? 0) + 1}: ${error.message}`)
  }

  const tasks: Task[] = []
  const seenIds = new Set<string>()

  parsed.data.forEach((row, index) => {
    const name = (row.name ?? '').trim()
    if (!name) return
    let id = (row.id ?? '').trim()
    if (!id || seenIds.has(id)) {
      // Falling back to the row number keeps dependencies that referenced a
      // duplicate id pointing at the first occurrence rather than silently
      // rewiring to the last.
      id = id ? `${id}-${index + 1}` : `row${index + 1}`
    }
    seenIds.add(id)

    const start = (row.start ?? '').trim()
    // An absent duration column must not read as zero — Number('') is 0, which
    // would quietly turn every imported task into a milestone. Only an explicit
    // 0 means milestone.
    const durationText = (row.duration ?? '').trim()
    let duration = durationText === '' ? Number.NaN : Number(durationText)
    if (!Number.isFinite(duration)) {
      const end = parseISODate((row.end ?? '').trim())
      const from = parseISODate(start)
      duration = end !== null && from !== null ? Math.max(1, end - from + 1) : 5
    }

    const colorText = (row.color ?? '').trim().toLowerCase() as TaskColor
    const progress = Number((row.progress ?? '').trim())

    tasks.push(
      makeTask({
        id,
        name,
        parentId: (row.parent ?? '').trim() || null,
        start: parseISODate(start) !== null ? start : '',
        duration: Math.max(0, Math.round(duration)),
        progress: Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0,
        assignee: (row.assignee ?? '').trim(),
        color: TASK_COLORS.includes(colorText) ? colorText : 'blue',
        notes: (row.notes ?? '').trim(),
        deps: (row.dependencies ?? '')
          .split(/[;,\s]+/)
          .map(parseDependency)
          .filter((dep): dep is Dependency => dep !== null),
      })
    )
  })

  if (tasks.length === 0) {
    throw new Error('No rows with a task name were found. A "name" column is required.')
  }

  return {
    project: {
      name: 'Imported plan',
      tasks,
      calendar: DEFAULT_CALENDAR_CONFIG,
      autoSchedule: true,
    },
    warnings,
  }
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

export function projectToJSON(project: Project): string {
  return JSON.stringify({ version: 1, ...project }, null, 2)
}

export function projectFromJSON(text: string): Project {
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null) throw new Error('Expected a JSON object.')
  const raw = parsed as Partial<Project> & { version?: number }
  if (!Array.isArray(raw.tasks)) throw new Error('Expected a "tasks" array.')

  const tasks = raw.tasks.map((task, index) => {
    const source = (task ?? {}) as Partial<Task>
    const color = source.color as TaskColor
    return makeTask({
      ...source,
      id: typeof source.id === 'string' && source.id ? source.id : `row${index + 1}`,
      name: typeof source.name === 'string' ? source.name : `Task ${index + 1}`,
      color: TASK_COLORS.includes(color) ? color : 'blue',
      deps: Array.isArray(source.deps)
        ? source.deps.filter(
            (dep): dep is Dependency =>
              typeof dep?.from === 'string' && DEPENDENCY_TYPES.includes(dep.type)
          )
        : [],
    })
  })

  return {
    name: typeof raw.name === 'string' ? raw.name : 'Imported plan',
    tasks,
    calendar: raw.calendar ?? DEFAULT_CALENDAR_CONFIG,
    autoSchedule: raw.autoSchedule !== false,
  }
}

// ─── Mermaid ──────────────────────────────────────────────────────────────────

/** Mermaid ids may not contain spaces or punctuation it uses structurally. */
function mermaidId(id: string): string {
  return id.replace(/[^A-Za-z0-9_]/g, '_')
}

/**
 * A `gantt` block for the Mermaid tool elsewhere on this site.
 *
 * Mermaid has no notion of SS/FF/SF links or of lag, so only a plain
 * finish-to-start chain survives as `after`; everything else is written out as
 * the resolved absolute date, which renders identically even though the
 * relationship is no longer live.
 */
export function projectToMermaid(project: Project, schedule: Schedule): string {
  const lines = ['gantt', `    title ${project.name || 'Project plan'}`, '    dateFormat YYYY-MM-DD']
  const bySection = new Map<string, string[]>()

  for (const row of schedule.rows) {
    if (row.isSummary) continue
    const parent = row.task.parentId
    const sectionName = parent ? (schedule.byId.get(parent)?.task.name ?? 'Tasks') : 'Tasks'

    const tags: string[] = []
    if (row.duration === 0) tags.push('milestone')
    if (row.progress >= 100) tags.push('done')
    else if (row.progress > 0) tags.push('active')
    if (row.critical) tags.push('crit')

    const simpleChain =
      row.deps.length === 1 && row.deps[0]?.type === 'FS' && row.deps[0]?.lag === 0
        ? row.deps[0]?.from
        : undefined
    const when = simpleChain ? `after ${mermaidId(simpleChain)}` : formatISODate(row.start)
    const length = row.duration === 0 ? '0d' : `${row.duration}d`
    const prefix = tags.length > 0 ? `${tags.join(', ')}, ` : ''
    // Mermaid splits task fields on ':', so a colon in a name breaks the row.
    const safeName = row.task.name.replace(/:/g, ' -')

    const line = `    ${safeName} :${prefix}${mermaidId(row.id)}, ${when}, ${length}`
    const bucket = bySection.get(sectionName)
    if (bucket) bucket.push(line)
    else bySection.set(sectionName, [line])
  }

  for (const [section, rows] of bySection) {
    lines.push(`    section ${section}`)
    lines.push(...rows)
  }
  return lines.join('\n')
}

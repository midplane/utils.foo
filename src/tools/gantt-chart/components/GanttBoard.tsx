import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { formatISODate, todayDayNumber } from '../calendar'
import { TASK_COLOR_VAR, Task } from '../model'
import { Schedule, ScheduledTask, toWorkCalendar } from '../schedule'
import { Timeline, formatDayLabel, nonWorkingBands, xForDay } from '../timeline'
import type { Project } from '../model'

export const ROW_HEIGHT = 32
const BAR_HEIGHT = 16
const MILESTONE_SIZE = 11
/** Grab zone at each end of a bar, in pixels. */
const HANDLE_WIDTH = 7
const HEADER_HEIGHT = 44

export interface TaskEdit {
  start?: string
  duration?: number
}

export interface GanttBoardProps {
  project: Project
  schedule: Schedule
  timeline: Timeline
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** A drag finished; commit the new dates. */
  onEdit: (id: string, edit: TaskEdit) => void
  onFieldChange: (id: string, patch: Partial<Task>) => void
  onToggleCollapse: (id: string) => void
  onCreateLink: (fromId: string, toId: string) => void
  showCritical: boolean
  showLinks: boolean
  /** CSS length for the scroll viewport, e.g. the shared pane-height constants. */
  height: string
  gridWidth: number
  onGridWidthChange: (width: number) => void
}

// ─── Drag state ───────────────────────────────────────────────────────────────

type Drag =
  | { kind: 'move' | 'resize-start' | 'resize-end'; id: string; originX: number; deltaDays: number }
  | { kind: 'link'; fromId: string; x: number; y: number; overId: string | null }
  | null

/**
 * Where a dependency line leaves or enters a bar.
 *
 * `dir` is +1 when the line travels right out of (or into) that point, which is
 * what decides the stub direction and which way the arrowhead faces.
 */
interface Anchor {
  x: number
  y: number
  dir: 1 | -1
}

/**
 * Orthogonal route between two bars.
 *
 * The vertical leg is placed just before the target where there is room, so
 * links land on the bar rather than running along it. When the target sits
 * behind the source — a lead, or a link that runs backwards up the chart — the
 * line detours through the gap between the two rows instead of crossing either
 * bar.
 */
function linkPath(from: Anchor, to: Anchor): string {
  const stub = 11
  const sx = from.x + from.dir * stub
  const tx = to.x - to.dir * stub
  const roomAhead = to.dir > 0 ? tx >= sx : tx <= sx

  if (roomAhead) {
    return `M ${from.x} ${from.y} L ${tx} ${from.y} L ${tx} ${to.y} L ${to.x} ${to.y}`
  }
  // Halfway into the vertical gap between the rows, so the detour never sits on
  // top of a bar.
  const midY = to.y > from.y ? from.y + ROW_HEIGHT / 2 : from.y - ROW_HEIGHT / 2
  return `M ${from.x} ${from.y} L ${sx} ${from.y} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${to.y} L ${to.x} ${to.y}`
}

function arrowHead(to: Anchor): string {
  const size = 4
  const tip = to.x
  const back = to.x - to.dir * size * 1.6
  return `${tip},${to.y} ${back},${to.y - size} ${back},${to.y + size}`
}

export function GanttBoard({
  project,
  schedule,
  timeline,
  selectedId,
  onSelect,
  onEdit,
  onFieldChange,
  onToggleCollapse,
  onCreateLink,
  showCritical,
  showLinks,
  height,
  gridWidth,
  onGridWidthChange,
}: GanttBoardProps) {
  const [drag, setDrag] = useState<Drag>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const rows = schedule.visible
  const chartHeight = Math.max(rows.length * ROW_HEIGHT, ROW_HEIGHT)
  const today = todayDayNumber()
  const workCalendar = useMemo(() => toWorkCalendar(project.calendar), [project.calendar])

  const rowIndex = useMemo(() => {
    const map = new Map<string, number>()
    rows.forEach((row, index) => map.set(row.id, index))
    return map
  }, [rows])

  /** Bar geometry after any in-flight drag, so the preview follows the pointer. */
  const geometry = useCallback(
    (row: ScheduledTask) => {
      let start = row.start
      let end = row.end
      if (drag && drag.kind !== 'link' && drag.id === row.id) {
        if (drag.kind === 'move') {
          start += drag.deltaDays
          end += drag.deltaDays
        } else if (drag.kind === 'resize-start') {
          start = Math.min(start + drag.deltaDays, end)
        } else {
          end = Math.max(end + drag.deltaDays, start)
        }
      }
      const x = xForDay(timeline, start)
      const width = Math.max(timeline.dayWidth, (end - start + 1) * timeline.dayWidth)
      const index = rowIndex.get(row.id) ?? 0
      return { start, end, x, width, y: index * ROW_HEIGHT, mid: index * ROW_HEIGHT + ROW_HEIGHT / 2 }
    },
    [drag, rowIndex, timeline]
  )

  // ─── Pointer drags ────────────────────────────────────────────────────────

  const beginDrag = useCallback(
    (event: React.PointerEvent, kind: 'move' | 'resize-start' | 'resize-end', id: string) => {
      // Only the primary button drags; right-click must stay available and a
      // middle-click should not leave a bar stuck to the pointer.
      if (event.button !== 0) return
      event.stopPropagation()
      event.preventDefault()
      ;(event.target as Element).setPointerCapture?.(event.pointerId)
      onSelect(id)
      setDrag({ kind, id, originX: event.clientX, deltaDays: 0 })
    },
    [onSelect]
  )

  const beginLink = useCallback(
    (event: React.PointerEvent, fromId: string) => {
      if (event.button !== 0) return
      event.stopPropagation()
      event.preventDefault()
      ;(event.target as Element).setPointerCapture?.(event.pointerId)
      const rect = svgRef.current?.getBoundingClientRect()
      setDrag({
        kind: 'link',
        fromId,
        x: event.clientX - (rect?.left ?? 0),
        y: event.clientY - (rect?.top ?? 0),
        overId: null,
      })
    },
    []
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!drag) return
      if (drag.kind === 'link') {
        const rect = svgRef.current?.getBoundingClientRect()
        const y = event.clientY - (rect?.top ?? 0)
        const index = Math.floor(y / ROW_HEIGHT)
        const over = rows[index]
        setDrag({
          ...drag,
          x: event.clientX - (rect?.left ?? 0),
          y,
          overId: over && over.id !== drag.fromId ? over.id : null,
        })
        return
      }
      const deltaDays = Math.round((event.clientX - drag.originX) / timeline.dayWidth)
      if (deltaDays !== drag.deltaDays) setDrag({ ...drag, deltaDays })
    },
    [drag, rows, timeline.dayWidth]
  )

  const endDrag = useCallback(() => {
    if (!drag) return
    if (drag.kind === 'link') {
      if (drag.overId) onCreateLink(drag.fromId, drag.overId)
      setDrag(null)
      return
    }
    if (drag.deltaDays !== 0) {
      const row = schedule.byId.get(drag.id)
      if (row) {
        if (drag.kind === 'move') {
          onEdit(drag.id, { start: formatISODate(row.start + drag.deltaDays) })
        } else if (drag.kind === 'resize-start') {
          const start = Math.min(row.start + drag.deltaDays, row.end)
          onEdit(drag.id, { start: formatISODate(start) })
        } else {
          const end = Math.max(row.end + drag.deltaDays, row.start)
          onEdit(drag.id, { start: formatISODate(row.start), duration: end - row.start + 1 })
        }
      }
    }
    setDrag(null)
  }, [drag, onCreateLink, onEdit, schedule])

  // A drag that ends outside the SVG (or when the tab loses focus) would
  // otherwise leave the bar following the pointer forever.
  useEffect(() => {
    if (!drag) return
    const cancel = () => setDrag(null)
    window.addEventListener('blur', cancel)
    return () => window.removeEventListener('blur', cancel)
  }, [drag])

  // ─── Keyboard editing ─────────────────────────────────────────────────────

  const handleBarKeyDown = useCallback(
    (event: React.KeyboardEvent, row: ScheduledTask) => {
      if (row.isSummary) return
      const step = event.shiftKey ? 5 : 1
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const direction = event.key === 'ArrowRight' ? 1 : -1
        event.preventDefault()
        if (event.altKey) {
          // Alt resizes; a task cannot be dragged shorter than a single day.
          const duration = Math.max(row.task.duration === 0 ? 0 : 1, row.task.duration + direction * step)
          onFieldChange(row.id, { duration })
        } else {
          onEdit(row.id, { start: formatISODate(row.start + direction * step) })
        }
      }
    },
    [onEdit, onFieldChange]
  )

  // ─── Grid splitter ────────────────────────────────────────────────────────

  // Both listeners hang off one AbortController: a stop callback that removed
  // itself by name would have to reference its own binding inside its own
  // initialiser, and one signal tears down the pair with no such knot.
  const splitterAbort = useRef<AbortController | null>(null)
  const startSplitter = useCallback(
    (event: React.PointerEvent) => {
      splitterAbort.current?.abort()
      const controller = new AbortController()
      splitterAbort.current = controller
      const originX = event.clientX
      const originWidth = gridWidth
      window.addEventListener(
        'pointermove',
        (move: PointerEvent) => {
          onGridWidthChange(Math.min(720, Math.max(220, originWidth + (move.clientX - originX))))
        },
        { signal: controller.signal }
      )
      window.addEventListener('pointerup', () => controller.abort(), { signal: controller.signal })
    },
    [gridWidth, onGridWidthChange]
  )
  // A drag still live when the tool unmounts would keep resizing a gone pane.
  useEffect(() => () => splitterAbort.current?.abort(), [])

  // ─── Background bands ─────────────────────────────────────────────────────

  const offDays = useMemo(() => nonWorkingBands(timeline, workCalendar), [timeline, workCalendar])

  const linkAnchors = useCallback(
    (row: ScheduledTask, side: 'start' | 'end'): Anchor => {
      const geo = geometry(row)
      return side === 'end'
        ? { x: geo.x + geo.width, y: geo.mid, dir: 1 }
        : { x: geo.x, y: geo.mid, dir: -1 }
    },
    [geometry]
  )

  const links = useMemo(() => {
    if (!showLinks) return []
    const out: { key: string; fromId: string; toId: string; from: Anchor; to: Anchor; critical: boolean }[] = []
    for (const row of rows) {
      for (const dep of row.deps) {
        const pred = schedule.byId.get(dep.from)
        if (!pred || pred.hidden) continue
        // Finish-anchored links leave the predecessor's end; start-anchored
        // links leave its start, which is what the two-letter code says.
        const fromSide = dep.type === 'FS' || dep.type === 'FF' ? 'end' : 'start'
        const toSide = dep.type === 'FS' || dep.type === 'SS' ? 'start' : 'end'
        const from = linkAnchors(pred, fromSide)
        const to = linkAnchors(row, toSide)
        out.push({
          key: `${dep.from}->${row.id}-${dep.type}`,
          fromId: dep.from,
          toId: row.id,
          from,
          // The arrow points into the bar, so entry direction is the mirror of
          // the side it lands on.
          to: { ...to, dir: toSide === 'start' ? 1 : -1 },
          critical: showCritical && pred.critical && row.critical,
        })
      }
    }
    return out
  }, [linkAnchors, rows, schedule, showCritical, showLinks])

  const todayX = xForDay(timeline, today) + timeline.dayWidth / 2

  return (
    <div
      ref={scrollRef}
      className="overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ height }}
    >
      <div className="relative flex" style={{ width: gridWidth + timeline.width, minWidth: '100%' }}>
        {/* ─── Frozen task grid ─────────────────────────────────────────── */}
        <div
          className="sticky left-0 z-20 shrink-0 border-r border-[var(--color-border-dark)] bg-[var(--color-surface)]"
          style={{ width: gridWidth }}
        >
          <div
            className="sticky top-0 z-10 flex items-end border-b border-[var(--color-border-dark)] bg-[var(--color-surface)] px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-muted)]"
            style={{ height: HEADER_HEIGHT }}
          >
            <span className="flex-1">Task</span>
            <span className="w-[112px] shrink-0">Start</span>
            <span className="w-[44px] shrink-0 text-right">Days</span>
            <span className="w-[46px] shrink-0 text-right">%</span>
          </div>

          {rows.map((row) => (
            <GridRow
              key={row.id}
              row={row}
              selected={row.id === selectedId}
              hovered={row.id === hoverId}
              critical={showCritical && row.critical}
              onSelect={onSelect}
              onFieldChange={onFieldChange}
              onToggleCollapse={onToggleCollapse}
              onHover={setHoverId}
            />
          ))}
        </div>

        {/* Splitter */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize task columns"
          className="sticky z-20 w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-[var(--color-accent)]/40"
          style={{ left: gridWidth, marginLeft: -4, height: chartHeight + HEADER_HEIGHT }}
          onPointerDown={startSplitter}
        />

        {/* ─── Timeline ─────────────────────────────────────────────────── */}
        <div className="relative" style={{ width: timeline.width }}>
          <div
            className="sticky top-0 z-10 border-b border-[var(--color-border-dark)] bg-[var(--color-surface)]"
            style={{ height: HEADER_HEIGHT }}
          >
            <div className="relative h-[22px]">
              {timeline.upper.map((band) => (
                <div
                  key={band.key}
                  className="absolute top-0 flex h-full items-center overflow-hidden whitespace-nowrap border-l border-[var(--color-border)] px-1.5 text-[11px] font-medium text-[var(--color-ink-light)]"
                  style={{ left: band.x, width: band.width }}
                >
                  {band.label}
                </div>
              ))}
            </div>
            <div className="relative h-[21px]">
              {timeline.lower.map((band) => (
                <div
                  key={band.key}
                  className="absolute top-0 flex h-full items-center justify-center overflow-hidden whitespace-nowrap border-l border-[var(--color-border)] text-[10px] text-[var(--color-ink-muted)]"
                  style={{ left: band.x, width: band.width }}
                >
                  {band.width > 16 ? band.label : ''}
                </div>
              ))}
            </div>
          </div>

          <svg
            ref={svgRef}
            width={timeline.width}
            height={chartHeight}
            className="block touch-none"
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={() => setDrag(null)}
            onClick={(event) => {
              if (event.target === svgRef.current) onSelect(null)
            }}
          >
            {/* Non-working shading */}
            {offDays.map((band) => (
              <rect
                key={band.key}
                x={band.x}
                y={0}
                width={band.width}
                height={chartHeight}
                fill="var(--color-cream-dark)"
              />
            ))}

            {/* Period grid lines */}
            {timeline.lower.map((band) => (
              <line
                key={band.key}
                x1={band.x}
                x2={band.x}
                y1={0}
                y2={chartHeight}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
            ))}

            {/* Row separators */}
            {rows.map((row, index) => (
              <line
                key={row.id}
                x1={0}
                x2={timeline.width}
                y1={(index + 1) * ROW_HEIGHT}
                y2={(index + 1) * ROW_HEIGHT}
                stroke="var(--color-border)"
                strokeWidth={1}
              />
            ))}

            {/* Selected row band, so the eye can follow a long row across */}
            {selectedId && rowIndex.has(selectedId) && (
              <rect
                x={0}
                y={(rowIndex.get(selectedId) ?? 0) * ROW_HEIGHT}
                width={timeline.width}
                height={ROW_HEIGHT}
                fill="var(--color-accent)"
                opacity={0.07}
              />
            )}

            {/* Today */}
            {today >= timeline.origin && today <= timeline.end && (
              <line
                x1={todayX}
                x2={todayX}
                y1={0}
                y2={chartHeight}
                stroke="var(--color-error-icon)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            )}

            {/* Dependency links, under the bars */}
            <g fill="none" strokeLinejoin="round" strokeLinecap="round">
              {links.map((link) => {
                // With a task selected, its own links stay full strength and the
                // rest recede, so one task's chain is legible in a dense plan.
                const touchesSelection =
                  selectedId !== null && (link.fromId === selectedId || link.toId === selectedId)
                const stroke = link.critical
                  ? 'var(--color-error-icon)'
                  : touchesSelection
                    ? 'var(--color-ink)'
                    : 'var(--color-ink-muted)'
                return (
                  <g key={link.key} opacity={selectedId === null || touchesSelection ? 1 : 0.3}>
                    <path d={linkPath(link.from, link.to)} stroke={stroke} strokeWidth={1.4} />
                    <polygon points={arrowHead(link.to)} fill={stroke} />
                  </g>
                )
              })}
            </g>

            {/* Bars */}
            {rows.map((row) => (
              <Bar
                key={row.id}
                row={row}
                geo={geometry(row)}
                selected={row.id === selectedId}
                hovered={row.id === hoverId}
                critical={showCritical && row.critical}
                linkTarget={drag?.kind === 'link' && drag.overId === row.id}
                chartWidth={timeline.width}
                onPointerDownBody={(event) => beginDrag(event, 'move', row.id)}
                onPointerDownStart={(event) => beginDrag(event, 'resize-start', row.id)}
                onPointerDownEnd={(event) => beginDrag(event, 'resize-end', row.id)}
                onPointerDownLink={(event) => beginLink(event, row.id)}
                onSelect={() => onSelect(row.id)}
                onHover={setHoverId}
                onKeyDown={(event) => handleBarKeyDown(event, row)}
              />
            ))}

            {/* In-flight dependency line */}
            {drag?.kind === 'link' && (
              <g>
                <line
                  x1={linkAnchors(schedule.byId.get(drag.fromId) as ScheduledTask, 'end').x}
                  y1={linkAnchors(schedule.byId.get(drag.fromId) as ScheduledTask, 'end').y}
                  x2={drag.x}
                  y2={drag.y}
                  stroke="var(--color-accent)"
                  strokeWidth={1.6}
                  strokeDasharray="4 3"
                />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}

// ─── Grid row ─────────────────────────────────────────────────────────────────

/** Spinners eat the width a three-digit percentage needs in a dense grid. */
const NUMBER_CELL =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

const CELL_CLASS =
  'w-full bg-transparent px-1 py-0.5 text-[12px] text-[var(--color-ink)] rounded-sm border border-transparent ' +
  'hover:border-[var(--color-input-border)] focus:bg-[var(--color-input-bg)] focus:border-[var(--color-accent)]'

interface GridRowProps {
  row: ScheduledTask
  selected: boolean
  hovered: boolean
  critical: boolean
  onSelect: (id: string) => void
  onFieldChange: (id: string, patch: Partial<Task>) => void
  onToggleCollapse: (id: string) => void
  onHover: (id: string | null) => void
}

function GridRow({
  row,
  selected,
  hovered,
  critical,
  onSelect,
  onFieldChange,
  onToggleCollapse,
  onHover,
}: GridRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 border-b border-[var(--color-border)] px-2',
        selected && 'bg-[var(--color-accent)]/8',
        !selected && hovered && 'bg-[var(--color-cream-dark)]'
      )}
      style={{ height: ROW_HEIGHT }}
      onMouseEnter={() => onHover(row.id)}
      onMouseLeave={() => onHover(null)}
      onFocusCapture={() => onSelect(row.id)}
    >
      <div className="flex min-w-0 flex-1 items-center" style={{ paddingLeft: row.depth * 14 }}>
        {row.isSummary ? (
          <button
            type="button"
            onClick={() => onToggleCollapse(row.id)}
            aria-expanded={!row.task.collapsed}
            aria-label={`${row.task.collapsed ? 'Expand' : 'Collapse'} ${row.task.name}`}
            className="mr-0.5 shrink-0 rounded-sm p-0.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            {row.task.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
        ) : (
          <span className="mr-0.5 w-[18px] shrink-0" />
        )}
        {critical && (
          <span
            className="mr-1 h-3 w-[3px] shrink-0 rounded-full bg-[var(--color-error-icon)]"
            title="On the critical path"
          />
        )}
        <input
          value={row.task.name}
          onChange={(event) => onFieldChange(row.id, { name: event.target.value })}
          aria-label={`Name of ${row.task.name}`}
          className={cn(CELL_CLASS, 'min-w-0 flex-1 truncate', row.isSummary && 'font-medium')}
        />
      </div>
      <input
        type="date"
        value={formatISODate(row.start)}
        disabled={row.isSummary}
        onChange={(event) => onFieldChange(row.id, { start: event.target.value })}
        aria-label={`Start date of ${row.task.name}`}
        className={cn(CELL_CLASS, 'w-[112px] shrink-0 tabular-nums disabled:opacity-55')}
      />
      <input
        type="number"
        min={0}
        value={row.isSummary ? row.duration : row.task.duration}
        disabled={row.isSummary}
        onChange={(event) => onFieldChange(row.id, { duration: Math.max(0, Number(event.target.value)) })}
        aria-label={`Duration of ${row.task.name} in working days`}
        className={cn(CELL_CLASS, NUMBER_CELL, 'w-[44px] shrink-0 text-right tabular-nums disabled:opacity-55')}
      />
      <input
        type="number"
        min={0}
        max={100}
        value={row.task.progress}
        disabled={row.isSummary}
        onChange={(event) =>
          onFieldChange(row.id, { progress: Math.min(100, Math.max(0, Number(event.target.value))) })
        }
        aria-label={`Percent complete of ${row.task.name}`}
        className={cn(CELL_CLASS, NUMBER_CELL, 'w-[46px] shrink-0 text-right tabular-nums disabled:opacity-55')}
      />
    </div>
  )
}

// ─── Bar ──────────────────────────────────────────────────────────────────────

interface BarProps {
  row: ScheduledTask
  geo: { x: number; width: number; y: number; mid: number; start: number; end: number }
  selected: boolean
  hovered: boolean
  critical: boolean
  linkTarget: boolean
  /** Right-hand limit for label placement. */
  chartWidth: number
  onPointerDownBody: (event: React.PointerEvent) => void
  onPointerDownStart: (event: React.PointerEvent) => void
  onPointerDownEnd: (event: React.PointerEvent) => void
  onPointerDownLink: (event: React.PointerEvent) => void
  onSelect: () => void
  onHover: (id: string | null) => void
  onKeyDown: (event: React.KeyboardEvent) => void
}

function Bar({
  row,
  geo,
  selected,
  hovered,
  critical,
  linkTarget,
  chartWidth,
  onPointerDownBody,
  onPointerDownStart,
  onPointerDownEnd,
  onPointerDownLink,
  onSelect,
  onHover,
  onKeyDown,
}: BarProps) {
  // Critical tasks keep their category colour and gain a red outline. Filling
  // them red instead wiped out the palette entirely — on a typical plan most
  // tasks are critical, so the chart became a solid red block that encoded
  // nothing but itself.
  const fill = TASK_COLOR_VAR[row.task.color]
  const outline = critical ? 'var(--color-error-icon)' : selected ? 'var(--color-accent)' : fill
  const outlineWidth = critical || selected || linkTarget ? 2 : 1
  const milestone = row.duration === 0 && !row.isSummary
  const barY = geo.y + (ROW_HEIGHT - BAR_HEIGHT) / 2

  const label = `${row.task.name}: ${formatDayLabel(geo.start)} to ${formatDayLabel(geo.end)}, ${
    milestone ? 'milestone' : `${row.duration} working days`
  }${row.task.progress > 0 ? `, ${row.task.progress}% complete` : ''}${
    critical ? ', on the critical path' : ''
  }`

  const label2 = (() => {
    const text = row.isSummary ? '' : row.task.assignee.trim()
    if (!text) return null
    const gap = hovered || selected ? 19 : 9
    // ~5.8px per character at 10.5px in the app's stack; near enough to decide
    // which side of the bar the text fits on.
    const estimated = text.length * 5.8
    const right = geo.x + geo.width + gap
    if (right + estimated <= chartWidth) return { text, x: right, anchor: 'start' as const }
    const left = geo.x - gap
    if (left - estimated >= 0) return { text, x: left, anchor: 'end' as const }
    return null
  })()

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      onKeyDown={onKeyDown}
      onFocus={onSelect}
      onMouseEnter={() => onHover(row.id)}
      onMouseLeave={() => onHover(null)}
      className="cursor-grab focus:outline-2"
    >
      <title>{label}</title>

      {milestone ? (
        <g onPointerDown={onPointerDownBody}>
          <rect
            x={geo.x + geo.width / 2 - MILESTONE_SIZE}
            y={geo.mid - MILESTONE_SIZE}
            width={MILESTONE_SIZE * 2}
            height={MILESTONE_SIZE * 2}
            fill="transparent"
          />
          <path
            d={`M ${geo.x + geo.width / 2} ${geo.mid - MILESTONE_SIZE} L ${geo.x + geo.width / 2 + MILESTONE_SIZE} ${geo.mid} L ${geo.x + geo.width / 2} ${geo.mid + MILESTONE_SIZE} L ${geo.x + geo.width / 2 - MILESTONE_SIZE} ${geo.mid} Z`}
            fill={fill}
            stroke={critical || selected ? outline : 'var(--color-surface)'}
            strokeWidth={outlineWidth}
          />
        </g>
      ) : row.isSummary ? (
        // A summary is a bracket, not a bar: it is a roll-up of its children,
        // and drawing it as a solid bar invites dragging something that has no
        // dates of its own.
        <path
          d={`M ${geo.x} ${barY + 2} L ${geo.x} ${barY + 10} L ${geo.x + 4} ${barY + 6} L ${geo.x + geo.width - 4} ${barY + 6} L ${geo.x + geo.width} ${barY + 10} L ${geo.x + geo.width} ${barY + 2} Z`}
          fill={fill}
          opacity={0.9}
        />
      ) : (
        <g>
          <rect
            x={geo.x + 1}
            y={barY}
            width={Math.max(2, geo.width - 2)}
            height={BAR_HEIGHT}
            rx={4}
            fill={fill}
            opacity={0.4}
            onPointerDown={onPointerDownBody}
          />
          {row.task.progress > 0 && (
            <rect
              x={geo.x + 1}
              y={barY}
              width={Math.max(1, (geo.width - 2) * Math.min(100, row.task.progress) / 100)}
              height={BAR_HEIGHT}
              rx={4}
              fill={fill}
              className="pointer-events-none"
            />
          )}
          <rect
            x={geo.x + 1}
            y={barY}
            width={Math.max(2, geo.width - 2)}
            height={BAR_HEIGHT}
            rx={4}
            fill="none"
            stroke={linkTarget ? 'var(--color-accent)' : outline}
            strokeWidth={outlineWidth}
            className="pointer-events-none"
          />

          {/* Resize handles, revealed on hover or selection */}
          {(hovered || selected) && (
            <g>
              <rect
                x={geo.x}
                y={barY}
                width={HANDLE_WIDTH}
                height={BAR_HEIGHT}
                fill="transparent"
                className="cursor-ew-resize"
                onPointerDown={onPointerDownStart}
              />
              <rect
                x={geo.x + geo.width - HANDLE_WIDTH}
                y={barY}
                width={HANDLE_WIDTH}
                height={BAR_HEIGHT}
                fill="transparent"
                className="cursor-ew-resize"
                onPointerDown={onPointerDownEnd}
              />
              <circle
                cx={geo.x + geo.width + 9}
                cy={geo.mid}
                r={4.5}
                fill="var(--color-surface)"
                stroke="var(--color-accent)"
                strokeWidth={1.5}
                className="cursor-crosshair"
                onPointerDown={onPointerDownLink}
              >
                <title>Drag to link this task to another</title>
              </circle>
            </g>
          )}
        </g>
      )}

      {/* The task-name column is frozen, so every row is already labelled at the
          same height — repeating the name here would be clutter. The assignee
          is the one thing the grid does not show, and it flips to the inside of
          the bar rather than running off the right edge of the chart. */}
      {label2 && (
        <text
          x={label2.x}
          y={geo.mid + 4}
          textAnchor={label2.anchor}
          className="pointer-events-none select-none"
          fontSize={10.5}
          fill="var(--color-ink-muted)"
        >
          {label2.text}
        </text>
      )}
    </g>
  )
}

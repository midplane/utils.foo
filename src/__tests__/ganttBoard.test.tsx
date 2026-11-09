import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { GanttBoard } from '../tools/gantt-chart/components/GanttBoard'
import { TaskInspector } from '../tools/gantt-chart/components/TaskInspector'
import { buildSchedule } from '../tools/gantt-chart/schedule'
import { buildTimeline } from '../tools/gantt-chart/timeline'
import { DEFAULT_CALENDAR_CONFIG, Project, makeTask } from '../tools/gantt-chart/model'

// 2024-03-11 is a Monday.
function plan(): Project {
  return {
    name: 'Test',
    autoSchedule: true,
    calendar: DEFAULT_CALENDAR_CONFIG,
    tasks: [makeTask({ id: 'a', name: 'Alpha', start: '2024-03-11', duration: 5 })],
  }
}

function renderBoard(project: Project, onEdit = vi.fn()) {
  const schedule = buildSchedule(project)
  const timeline = buildTimeline(schedule.projectStart, schedule.projectEnd, 'day')
  const utils = render(
    <GanttBoard
      project={project}
      schedule={schedule}
      timeline={timeline}
      selectedId="a"
      onSelect={() => {}}
      onEdit={onEdit}
      onFieldChange={() => {}}
      onToggleCollapse={() => {}}
      onCreateLink={() => {}}
      showCritical
      showLinks
      height="400px"
      gridWidthOverride={null}
      onGridWidthChange={() => {}}
    />
  )
  return { ...utils, onEdit, timeline }
}

/** Drag a resize handle by a number of calendar days. */
function dragHandle(container: HTMLElement, index: number, days: number, dayWidth: number) {
  const handles = container.querySelectorAll('rect.cursor-ew-resize')
  const handle = handles[index] as Element
  const svg = container.querySelector('svg.touch-none') as Element
  fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 })
  fireEvent.pointerMove(svg, { clientX: 100 + days * dayWidth, pointerId: 1 })
  fireEvent.pointerUp(svg, { clientX: 100 + days * dayWidth, pointerId: 1 })
}

describe('gantt board — bar edits', () => {
  it('counts a dragged right edge in working days', () => {
    const { container, onEdit, timeline } = renderBoard(plan())
    // Friday the 15th to Tuesday the 19th: four calendar days, two working days.
    dragHandle(container, 1, 4, timeline.dayWidth)
    expect(onEdit).toHaveBeenCalledWith('a', { start: '2024-03-11', duration: 7 })
  })

  it('keeps the end in place when the left edge is dragged', () => {
    const { container, onEdit, timeline } = renderBoard(plan())
    // Monday the 11th forward to Wednesday the 13th: the task ends Friday still.
    dragHandle(container, 0, 2, timeline.dayWidth)
    expect(onEdit).toHaveBeenCalledWith('a', { start: '2024-03-13', duration: 3 })
  })

  it('moves a bar back across a weekend with the arrow key', () => {
    const { onEdit } = renderBoard(plan())
    const bar = screen.getByRole('button', { name: /^Alpha:/ })
    fireEvent.keyDown(bar, { key: 'ArrowLeft' })
    // One working day before Monday the 11th is Friday the 8th, not Sunday the
    // 10th, which the scheduler would snap straight back to Monday.
    expect(onEdit).toHaveBeenCalledWith('a', { start: '2024-03-08' })
  })
})

describe('gantt inspector — link picker', () => {
  it('offers neither the task’s own summary nor its own children', () => {
    const project: Project = {
      ...plan(),
      tasks: [
        makeTask({ id: 'phase', name: 'Phase' }),
        makeTask({ id: 'mid', name: 'Middle', parentId: 'phase' }),
        makeTask({ id: 'leaf', name: 'Leaf', parentId: 'mid', start: '2024-03-11', duration: 2 }),
        makeTask({ id: 'other', name: 'Other', start: '2024-03-11', duration: 2 }),
      ],
    }
    const schedule = buildSchedule(project)
    const onChange = vi.fn()
    const row = schedule.byId.get('mid')
    if (!row) throw new Error('no row')
    render(<TaskInspector row={row} schedule={schedule} onChange={onChange} onDelete={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Add link/ }))
    expect(onChange).toHaveBeenCalledWith({ deps: [{ from: 'other', type: 'FS', lag: 0 }] })
  })
})

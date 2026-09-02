import { describe, it, expect } from 'vitest'
import { formatISODate } from '../tools/gantt-chart/calendar'
import { buildSchedule } from '../tools/gantt-chart/schedule'
import {
  DEFAULT_CALENDAR_CONFIG,
  Dependency,
  DependencyType,
  Project,
  Task,
  makeTask,
} from '../tools/gantt-chart/model'

function task(id: string, partial: Partial<Task> = {}): Task {
  return makeTask({ ...partial, id, name: partial.name ?? id })
}

function link(from: string, type: DependencyType = 'FS', lag = 0): Dependency {
  return { from, type, lag }
}

function project(tasks: Task[], autoSchedule = true): Project {
  return { name: 'Test', tasks, calendar: DEFAULT_CALENDAR_CONFIG, autoSchedule }
}

/** Scheduled start/end of a task, as ISO strings, for readable assertions. */
function span(schedule: ReturnType<typeof buildSchedule>, id: string) {
  const row = schedule.byId.get(id)
  if (!row) throw new Error(`no row for ${id}`)
  return { start: formatISODate(row.start), end: formatISODate(row.end) }
}

// 2024-03-11 is a Monday; every fixture below starts there.
const MONDAY = '2024-03-11'

describe('gantt scheduler — dependencies', () => {
  it('places a finish-to-start successor on the next working day', () => {
    const schedule = buildSchedule(
      project([
        task('a', { start: MONDAY, duration: 5 }),
        task('b', { duration: 3, deps: [link('a')] }),
      ])
    )
    expect(span(schedule, 'a')).toEqual({ start: '2024-03-11', end: '2024-03-15' })
    // Friday finish → Monday start, skipping the weekend.
    expect(span(schedule, 'b')).toEqual({ start: '2024-03-18', end: '2024-03-20' })
  })

  it('applies positive lag in working days', () => {
    const schedule = buildSchedule(
      project([
        task('a', { start: MONDAY, duration: 5 }),
        task('b', { duration: 1, deps: [link('a', 'FS', 2)] }),
      ])
    )
    expect(span(schedule, 'b').start).toBe('2024-03-20')
  })

  it('applies negative lag as a lead, overlapping the predecessor', () => {
    const schedule = buildSchedule(
      project([
        task('a', { start: MONDAY, duration: 5 }),
        task('b', { duration: 2, deps: [link('a', 'FS', -2)] }),
      ])
    )
    expect(span(schedule, 'b').start).toBe('2024-03-14')
  })

  it('starts a start-to-start successor alongside its predecessor', () => {
    const schedule = buildSchedule(
      project([
        task('a', { start: MONDAY, duration: 5 }),
        task('b', { duration: 2, deps: [link('a', 'SS')] }),
      ])
    )
    expect(span(schedule, 'b')).toEqual({ start: '2024-03-11', end: '2024-03-12' })
  })

  it('aligns a finish-to-finish successor on its predecessor’s end', () => {
    const schedule = buildSchedule(
      project([
        task('a', { start: MONDAY, duration: 5 }),
        task('b', { duration: 2, deps: [link('a', 'FF')] }),
      ])
    )
    // Ends with A on Friday, so a 2-day task starts Thursday.
    expect(span(schedule, 'b')).toEqual({ start: '2024-03-14', end: '2024-03-15' })
  })

  it('ends a start-to-finish successor when its predecessor starts', () => {
    const schedule = buildSchedule(
      project([
        task('a', { start: '2024-03-18', duration: 5 }),
        task('b', { start: MONDAY, duration: 3, deps: [link('a', 'SF')] }),
      ])
    )
    expect(span(schedule, 'b').end).toBe('2024-03-18')
  })

  it('takes the latest of several predecessors', () => {
    const schedule = buildSchedule(
      project([
        task('a', { start: MONDAY, duration: 2 }),
        task('b', { start: MONDAY, duration: 8 }),
        task('c', { duration: 1, deps: [link('a'), link('b')] }),
      ])
    )
    // B is the binding constraint, not A.
    expect(span(schedule, 'c').start).toBe('2024-03-21')
  })

  it('treats the stored date as a floor, so links only push right', () => {
    const schedule = buildSchedule(
      project([
        task('a', { start: MONDAY, duration: 1 }),
        // Pinned well after its predecessor allows; it must not jump backwards.
        task('b', { start: '2024-04-01', duration: 2, deps: [link('a')] }),
      ])
    )
    expect(span(schedule, 'b').start).toBe('2024-04-01')
  })

  it('resolves a chain regardless of document order', () => {
    const schedule = buildSchedule(
      project([
        task('c', { duration: 1, deps: [link('b')] }),
        task('b', { duration: 2, deps: [link('a')] }),
        task('a', { start: MONDAY, duration: 1 }),
      ])
    )
    expect(span(schedule, 'a').start).toBe('2024-03-11')
    expect(span(schedule, 'b').start).toBe('2024-03-12')
    expect(span(schedule, 'c').start).toBe('2024-03-14')
  })
})

describe('gantt scheduler — summaries', () => {
  it('spans a summary across its children', () => {
    const schedule = buildSchedule(
      project([
        task('parent'),
        task('a', { parentId: 'parent', start: MONDAY, duration: 3 }),
        task('b', { parentId: 'parent', start: '2024-03-20', duration: 4 }),
      ])
    )
    expect(span(schedule, 'parent')).toEqual({ start: '2024-03-11', end: '2024-03-25' })
    expect(schedule.byId.get('parent')?.isSummary).toBe(true)
  })

  it('rolls a summary up through more than one level', () => {
    const schedule = buildSchedule(
      project([
        task('top'),
        task('mid', { parentId: 'top' }),
        task('leaf', { parentId: 'mid', start: MONDAY, duration: 10 }),
      ])
    )
    expect(span(schedule, 'top')).toEqual(span(schedule, 'leaf'))
  })

  it('hides children of a collapsed summary but still dates them', () => {
    const schedule = buildSchedule(
      project([
        task('parent', { collapsed: true }),
        task('a', { parentId: 'parent', start: MONDAY, duration: 3 }),
      ])
    )
    expect(schedule.byId.get('a')?.hidden).toBe(true)
    expect(schedule.visible.map((r) => r.id)).toEqual(['parent'])
    expect(span(schedule, 'parent').start).toBe('2024-03-11')
  })

  it('lets a dependency on a summary use its rolled-up dates', () => {
    const schedule = buildSchedule(
      project([
        task('parent'),
        task('a', { parentId: 'parent', start: MONDAY, duration: 5 }),
        task('after', { duration: 1, deps: [link('parent')] }),
      ])
    )
    expect(span(schedule, 'after').start).toBe('2024-03-18')
  })
})

describe('gantt scheduler — critical path', () => {
  const cpm = () =>
    buildSchedule(
      project([
        task('a', { start: MONDAY, duration: 5 }),
        task('b', { duration: 5, deps: [link('a')] }),
        task('c', { duration: 2, deps: [link('a')] }),
        task('d', { duration: 3, deps: [link('b'), link('c')] }),
      ])
    )

  it('marks the longest chain critical', () => {
    const schedule = cpm()
    expect(schedule.byId.get('a')?.critical).toBe(true)
    expect(schedule.byId.get('b')?.critical).toBe(true)
    expect(schedule.byId.get('d')?.critical).toBe(true)
  })

  it('gives the shorter parallel branch float', () => {
    const schedule = cpm()
    expect(schedule.byId.get('c')?.critical).toBe(false)
    // C is 3 working days shorter than B, so it can slip 3 days.
    expect(schedule.byId.get('c')?.totalFloat).toBe(3)
  })

  it('reports zero float on the critical chain', () => {
    const schedule = cpm()
    expect(schedule.byId.get('b')?.totalFloat).toBe(0)
  })

  it('ends the project on the last finish', () => {
    const schedule = cpm()
    expect(formatISODate(cpm().projectEnd)).toBe('2024-03-27')
    expect(formatISODate(schedule.projectStart)).toBe('2024-03-11')
  })
})

describe('gantt scheduler — milestones', () => {
  it('gives a zero-duration task no span', () => {
    const schedule = buildSchedule(project([task('m', { start: MONDAY, duration: 0 })]))
    expect(span(schedule, 'm')).toEqual({ start: '2024-03-11', end: '2024-03-11' })
  })

  it('lets a milestone gate a successor', () => {
    const schedule = buildSchedule(
      project([
        task('m', { start: MONDAY, duration: 0 }),
        task('after', { duration: 2, deps: [link('m')] }),
      ])
    )
    expect(span(schedule, 'after').start).toBe('2024-03-12')
  })
})

describe('gantt scheduler — invalid input', () => {
  it('detects a dependency loop and still dates every task', () => {
    const schedule = buildSchedule(
      project([
        task('a', { start: MONDAY, duration: 2, deps: [link('b')] }),
        task('b', { start: MONDAY, duration: 2, deps: [link('a')] }),
      ])
    )
    const cycle = schedule.issues.find((i) => i.kind === 'cycle')
    expect(cycle).toBeDefined()
    expect(cycle?.taskIds.sort()).toEqual(['a', 'b'])
    // Rows must still render, or the message points at tasks the user cannot see.
    expect(schedule.rows).toHaveLength(2)
    expect(span(schedule, 'a').start).toBe('2024-03-11')
  })

  it('detects a three-task loop', () => {
    const schedule = buildSchedule(
      project([
        task('a', { start: MONDAY, deps: [link('c')] }),
        task('b', { start: MONDAY, deps: [link('a')] }),
        task('c', { start: MONDAY, deps: [link('b')] }),
      ])
    )
    expect(schedule.issues.some((i) => i.kind === 'cycle')).toBe(true)
  })

  it('drops a self-dependency', () => {
    const schedule = buildSchedule(project([task('a', { start: MONDAY, deps: [link('a')] })]))
    expect(schedule.issues.some((i) => i.kind === 'self-dependency')).toBe(true)
    expect(schedule.byId.get('a')?.deps).toHaveLength(0)
  })

  it('drops a dependency on a task that no longer exists', () => {
    const schedule = buildSchedule(project([task('a', { start: MONDAY, deps: [link('ghost')] })]))
    expect(schedule.issues.some((i) => i.kind === 'missing-dependency')).toBe(true)
    expect(schedule.byId.get('a')?.deps).toHaveLength(0)
  })

  it('reports an unreadable date instead of dropping the task', () => {
    const schedule = buildSchedule(project([task('a', { start: '11/03/2024', duration: 2 })]))
    expect(schedule.issues.some((i) => i.kind === 'invalid-date')).toBe(true)
    expect(schedule.rows).toHaveLength(1)
  })

  it('re-roots a task whose parent was deleted', () => {
    const schedule = buildSchedule(project([task('a', { parentId: 'ghost', start: MONDAY })]))
    expect(schedule.rows).toHaveLength(1)
    expect(schedule.byId.get('a')?.depth).toBe(0)
  })

  it('survives a parent cycle without losing rows', () => {
    const schedule = buildSchedule(
      project([task('a', { parentId: 'b', start: MONDAY }), task('b', { parentId: 'a', start: MONDAY })])
    )
    expect(schedule.rows).toHaveLength(2)
  })

  it('schedules an empty project without throwing', () => {
    const schedule = buildSchedule(project([]))
    expect(schedule.rows).toHaveLength(0)
    expect(schedule.projectEnd).toBeGreaterThan(0)
  })
})

describe('gantt scheduler — manual mode', () => {
  it('leaves stored dates alone and reports the violated link', () => {
    const schedule = buildSchedule(
      project(
        [
          task('a', { start: MONDAY, duration: 5 }),
          task('b', { start: MONDAY, duration: 2, deps: [link('a')] }),
        ],
        false
      )
    )
    expect(span(schedule, 'b').start).toBe('2024-03-11')
    expect(schedule.issues.some((i) => i.kind === 'constraint-violation')).toBe(true)
  })

  it('reports nothing when the stored dates already satisfy the links', () => {
    const schedule = buildSchedule(
      project(
        [
          task('a', { start: MONDAY, duration: 5 }),
          task('b', { start: '2024-03-18', duration: 2, deps: [link('a')] }),
        ],
        false
      )
    )
    expect(schedule.issues).toHaveLength(0)
  })
})

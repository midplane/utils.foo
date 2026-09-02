import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SVG_OPTIONS,
  projectFromCSV,
  projectFromJSON,
  projectToCSV,
  projectToJSON,
  projectToMermaid,
  renderGanttSVG,
} from '../tools/gantt-chart/export'
import { buildSchedule } from '../tools/gantt-chart/schedule'
import { DEFAULT_CALENDAR_CONFIG, Project, makeTask } from '../tools/gantt-chart/model'
import { buildTimeline } from '../tools/gantt-chart/timeline'
import { parseISODate } from '../tools/gantt-chart/calendar'

const MONDAY = '2024-03-11'

function fixture(): Project {
  return {
    name: 'Launch',
    autoSchedule: true,
    calendar: DEFAULT_CALENDAR_CONFIG,
    tasks: [
      makeTask({ id: 'phase', name: 'Phase one', color: 'blue' }),
      makeTask({
        id: 'a', name: 'Design', parentId: 'phase', start: MONDAY, duration: 5,
        progress: 40, assignee: 'Ada', color: 'orange',
      }),
      makeTask({
        id: 'b', name: 'Build', parentId: 'phase', duration: 8,
        deps: [{ from: 'a', type: 'FS', lag: 2 }], color: 'aqua',
      }),
      makeTask({ id: 'm', name: 'Ship', duration: 0, deps: [{ from: 'b', type: 'FS', lag: 0 }] }),
    ],
  }
}

const scheduleOf = (project: Project) => buildSchedule(project)

describe('gantt CSV', () => {
  it('round-trips names, structure, durations and links', () => {
    const project = fixture()
    const csv = projectToCSV(project, scheduleOf(project))
    const { project: back } = projectFromCSV(csv)

    expect(back.tasks.map((t) => t.name)).toEqual(['Phase one', 'Design', 'Build', 'Ship'])
    const build = back.tasks.find((t) => t.id === 'b')
    expect(build?.parentId).toBe('phase')
    expect(build?.duration).toBe(8)
    expect(build?.deps).toEqual([{ from: 'a', type: 'FS', lag: 2 }])
    expect(back.tasks.find((t) => t.id === 'a')?.assignee).toBe('Ada')
    expect(back.tasks.find((t) => t.id === 'm')?.duration).toBe(0)
  })

  it('produces the same schedule after a round-trip', () => {
    const project = fixture()
    const before = scheduleOf(project)
    const { project: back } = projectFromCSV(projectToCSV(project, before))
    const after = scheduleOf(back)
    expect(after.projectStart).toBe(before.projectStart)
    expect(after.projectEnd).toBe(before.projectEnd)
  })

  it('accepts the column names other planners use', () => {
    const { project } = projectFromCSV(
      'Task Name,Start Date,Days,Owner,Predecessors\nKickoff,2024-03-11,3,Ada,\nBuild,2024-03-14,5,Kai,row1'
    )
    expect(project.tasks).toHaveLength(2)
    expect(project.tasks[0]?.name).toBe('Kickoff')
    expect(project.tasks[0]?.assignee).toBe('Ada')
    expect(project.tasks[1]?.deps[0]?.from).toBe('row1')
  })

  it('derives a duration from an end date when no duration column exists', () => {
    const { project } = projectFromCSV('name,start,end\nDesign,2024-03-11,2024-03-15')
    // Inclusive calendar span; the scheduler re-reads it in working days.
    expect(project.tasks[0]?.duration).toBe(5)
  })

  it('defaults a bare link to finish-to-start', () => {
    const { project } = projectFromCSV('id,name,dependencies\na,One,\nb,Two,a')
    expect(project.tasks[1]?.deps[0]).toEqual({ from: 'a', type: 'FS', lag: 0 })
  })

  it('reads a negative lag', () => {
    const { project } = projectFromCSV('id,name,dependencies\na,One,\nb,Two,a:SS-3')
    expect(project.tasks[1]?.deps[0]).toEqual({ from: 'a', type: 'SS', lag: -3 })
  })

  it('keeps duplicate ids distinct instead of silently merging rows', () => {
    const { project } = projectFromCSV('id,name\ndup,First\ndup,Second')
    expect(project.tasks).toHaveLength(2)
    expect(new Set(project.tasks.map((t) => t.id)).size).toBe(2)
  })

  it('drops an unparseable start rather than inventing one', () => {
    const { project } = projectFromCSV('name,start\nDesign,not-a-date')
    expect(project.tasks[0]?.start).toBe('')
  })

  it('rejects a file with no usable rows', () => {
    expect(() => projectFromCSV('alpha,beta\n1,2')).toThrow(/name/i)
  })

  it('survives quoted commas in a task name', () => {
    const csv = projectToCSV(
      { ...fixture(), tasks: [makeTask({ id: 'x', name: 'Design, review, ship', start: MONDAY })] },
      scheduleOf({ ...fixture(), tasks: [makeTask({ id: 'x', name: 'Design, review, ship', start: MONDAY })] })
    )
    expect(projectFromCSV(csv).project.tasks[0]?.name).toBe('Design, review, ship')
  })
})

describe('gantt JSON', () => {
  it('round-trips the whole document, calendar included', () => {
    const project: Project = {
      ...fixture(),
      calendar: { workdays: [true, true, true, true, true, true, false], holidays: ['2024-03-15'] },
      autoSchedule: false,
    }
    const back = projectFromJSON(projectToJSON(project))
    expect(back.name).toBe('Launch')
    expect(back.autoSchedule).toBe(false)
    expect(back.calendar.holidays).toEqual(['2024-03-15'])
    expect(back.tasks).toHaveLength(4)
  })

  it('rejects input that is not a plan', () => {
    expect(() => projectFromJSON('[]')).toThrow(/tasks/i)
    expect(() => projectFromJSON('"hello"')).toThrow()
    expect(() => projectFromJSON('{"tasks":"nope"}')).toThrow(/tasks/i)
  })

  it('repairs tasks that are missing fields', () => {
    const back = projectFromJSON('{"tasks":[{"name":"Bare"},{}]}')
    expect(back.tasks).toHaveLength(2)
    expect(back.tasks[0]?.name).toBe('Bare')
    expect(back.tasks[0]?.color).toBe('blue')
    expect(back.tasks[1]?.deps).toEqual([])
  })

  it('discards a dependency with an unknown link type', () => {
    const back = projectFromJSON('{"tasks":[{"id":"a","name":"A","deps":[{"from":"b","type":"ZZ"}]}]}')
    expect(back.tasks[0]?.deps).toEqual([])
  })
})

describe('gantt Mermaid', () => {
  const mermaid = () => {
    const project = fixture()
    return projectToMermaid(project, scheduleOf(project))
  }

  it('emits a gantt block with a date format', () => {
    expect(mermaid()).toMatch(/^gantt\n/)
    expect(mermaid()).toContain('dateFormat YYYY-MM-DD')
  })

  it('groups children under their summary as sections', () => {
    expect(mermaid()).toContain('section Phase one')
  })

  it('keeps a zero-lag FS chain relative with "after"', () => {
    expect(mermaid()).toMatch(/Ship :[^\n]*after b, 0d/)
  })

  it('falls back to an absolute date for a link Mermaid cannot express', () => {
    // Build depends on Design with two days of lag, and Mermaid has no lag, so
    // the relationship is resolved to a date rather than written as a wrong
    // "after".
    expect(mermaid()).toMatch(/Build :[^\n]*, 2024-03-20, 8d/)
    expect(mermaid()).not.toMatch(/Build :[^\n]*after/)
  })

  it('tags milestones and progress', () => {
    expect(mermaid()).toContain('milestone')
    expect(mermaid()).toMatch(/Design :active/)
  })

  it('does not emit a summary row, which Mermaid has no concept of', () => {
    expect(mermaid()).not.toMatch(/^ *Phase one :/m)
  })
})

describe('gantt SVG', () => {
  const theme = {
    surface: '#ffffff', ink: '#111111', inkLight: '#444444', inkMuted: '#888888',
    border: '#eeeeee', nonWorking: '#f7f7f7', critical: '#ef4444',
    bar: { blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a' },
  }
  const render = (project: Project) => {
    const schedule = scheduleOf(project)
    const timeline = buildTimeline(schedule.projectStart, schedule.projectEnd, 'week')
    return renderGanttSVG(schedule, timeline, theme, {
      ...DEFAULT_SVG_OPTIONS,
      title: project.name,
      calendar: project.calendar,
    })
  }

  it('renders a standalone document with the task names in it', () => {
    const svg = render(fixture())
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).toContain('Design')
    expect(svg).toContain('Launch')
  })

  it('bakes in concrete colours, since CSS variables do not survive the page', () => {
    const svg = render(fixture())
    expect(svg).not.toContain('var(--')
    expect(svg).toContain('#eb6834')
  })

  it('escapes markup in a task name', () => {
    const project = fixture()
    const first = project.tasks[1]
    if (first) first.name = 'Fix <script> & "quotes"'
    const svg = render(project)
    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
    expect(svg).toContain('&amp;')
  })

  it('renders an empty plan without throwing', () => {
    const empty: Project = { name: 'Empty', tasks: [], calendar: DEFAULT_CALENDAR_CONFIG, autoSchedule: true }
    expect(() => render(empty)).not.toThrow()
  })

  it('grows with the number of rows', () => {
    const small = render(fixture())
    const big = render({
      ...fixture(),
      tasks: [
        ...fixture().tasks,
        ...Array.from({ length: 10 }, (_, i) =>
          makeTask({ id: `x${i}`, name: `Extra ${i}`, start: MONDAY, duration: 2 })
        ),
      ],
    })
    const heightOf = (svg: string) => Number(/height="(\d+(?:\.\d+)?)"/.exec(svg)?.[1] ?? 0)
    expect(heightOf(big)).toBeGreaterThan(heightOf(small))
  })

  it('places the label column before the plotted area', () => {
    const svg = render(fixture())
    // The divider between the two panes sits at the label width.
    expect(svg).toContain(`x1="${DEFAULT_SVG_OPTIONS.labelWidth}"`)
  })
})

describe('gantt sample data', () => {
  it('anchors samples so today falls inside the plan', async () => {
    const { SAMPLES } = await import('../tools/gantt-chart/samples')
    for (const sample of SAMPLES) {
      const schedule = scheduleOf(sample.build())
      const today = Math.floor(Date.now() / 86_400_000)
      expect(schedule.projectStart).toBeLessThanOrEqual(today + 7)
      expect(schedule.projectEnd).toBeGreaterThan(today)
    }
  })

  it('ships samples that schedule without issues', async () => {
    const { SAMPLES } = await import('../tools/gantt-chart/samples')
    for (const sample of SAMPLES) {
      expect(scheduleOf(sample.build()).issues).toEqual([])
    }
  })

  it('gives every sample a critical path', async () => {
    const { SAMPLES } = await import('../tools/gantt-chart/samples')
    for (const sample of SAMPLES) {
      const schedule = scheduleOf(sample.build())
      expect(schedule.rows.some((row) => row.critical)).toBe(true)
    }
  })

  it('uses only dates the calendar can parse', async () => {
    const { SAMPLES } = await import('../tools/gantt-chart/samples')
    for (const sample of SAMPLES) {
      for (const task of sample.build().tasks) {
        if (task.start) expect(parseISODate(task.start)).not.toBeNull()
      }
    }
  })
})

describe('gantt CSV — duration defaults', () => {
  it('does not turn a task with no duration column into a milestone', () => {
    // Number('') is 0, so a missing column read as "zero days" and silently
    // made every imported row a milestone.
    const { project } = projectFromCSV('name,start\nDesign,2024-03-11')
    expect(project.tasks[0]?.duration).toBe(5)
  })

  it('still honours an explicit zero as a milestone', () => {
    const { project } = projectFromCSV('name,start,duration\nShip,2024-03-11,0')
    expect(project.tasks[0]?.duration).toBe(0)
  })

  it('honours an explicit duration over a derivable end date', () => {
    const { project } = projectFromCSV('name,start,end,duration\nDesign,2024-03-11,2024-03-29,3')
    expect(project.tasks[0]?.duration).toBe(3)
  })
})

/**
 * Turns a project document into laid-out, dated rows.
 *
 * Dependencies, summary roll-up and the critical path are all resolved over one
 * directed graph. Nodes are tasks; edges are `predecessor → successor` for each
 * dependency plus `child → summary` for each nesting relationship. A single
 * topological order therefore guarantees that when a node is visited every
 * input it needs — predecessors and, for a summary, its children — is already
 * final, so no fixed-point iteration is needed and one cycle check covers
 * dependency loops and parent/dependency tangles alike.
 */

import {
  WorkCalendar,
  endFromDuration,
  isWorkday,
  nextWorkday,
  parseISODate,
  shiftWorkdays,
  todayDayNumber,
  workdaysBetween,
} from './calendar'
import { CalendarConfig, Dependency, Project, Task, flattenTree } from './model'

export type IssueKind =
  | 'cycle'
  | 'missing-dependency'
  | 'self-dependency'
  | 'invalid-date'
  | 'constraint-violation'

export interface ScheduleIssue {
  kind: IssueKind
  /** Tasks the reader should look at; the UI links straight to them. */
  taskIds: string[]
  message: string
}

export interface ScheduledTask {
  id: string
  task: Task
  depth: number
  isSummary: boolean
  /** Inclusive day numbers. */
  start: number
  end: number
  /** Working days; 0 for a milestone. */
  duration: number
  /**
   * 0-100. A leaf reports its own figure; a summary reports its children's,
   * weighted by duration — a summary sitting at 0% while every child is done
   * says the opposite of the truth.
   */
  progress: number
  lateStart: number
  lateFinish: number
  /** Working days the task can slip without moving the project end. */
  totalFloat: number
  critical: boolean
  /** Nested under a collapsed ancestor, so absent from the grid. */
  hidden: boolean
  /** Dependencies that survived validation. */
  deps: Dependency[]
}

export interface Schedule {
  rows: ScheduledTask[]
  visible: ScheduledTask[]
  byId: Map<string, ScheduledTask>
  projectStart: number
  projectEnd: number
  issues: ScheduleIssue[]
}

export function toWorkCalendar(config: CalendarConfig): WorkCalendar {
  const holidays = new Set<number>()
  for (const iso of config.holidays) {
    const day = parseISODate(iso)
    if (day !== null) holidays.add(day)
  }
  return { workdays: config.workdays, holidays }
}

/** Signed working-day distance from `a` to `b`; 0 when they are the same day. */
function workdayDelta(calendar: WorkCalendar, a: number, b: number): number {
  if (b === a) return 0
  return b > a ? workdaysBetween(calendar, a, b) - 1 : -(workdaysBetween(calendar, b, a) - 1)
}

/** The start a task must not begin before, given one resolved predecessor. */
function constraintStart(
  calendar: WorkCalendar,
  type: Dependency['type'],
  lag: number,
  pred: { start: number; end: number },
  duration: number
): number {
  switch (type) {
    // The successor may begin the working day after the predecessor ends.
    case 'FS':
      return shiftWorkdays(calendar, pred.end, 1 + lag)
    case 'SS':
      return shiftWorkdays(calendar, pred.start, lag)
    // Finish-anchored links constrain the end, so they are converted back into
    // an implied start by walking the task's own duration backwards.
    case 'FF': {
      const finish = shiftWorkdays(calendar, pred.end, lag)
      return duration <= 0 ? finish : shiftWorkdays(calendar, finish, -(duration - 1))
    }
    case 'SF': {
      const finish = shiftWorkdays(calendar, pred.start, lag)
      return duration <= 0 ? finish : shiftWorkdays(calendar, finish, -(duration - 1))
    }
  }
}

/** The latest a predecessor may finish, given one resolved successor. */
function latestPredecessorFinish(
  calendar: WorkCalendar,
  type: Dependency['type'],
  lag: number,
  succ: { lateStart: number; lateFinish: number },
  predDuration: number
): number {
  switch (type) {
    case 'FS':
      return shiftWorkdays(calendar, succ.lateStart, -1 - lag)
    case 'FF':
      return shiftWorkdays(calendar, succ.lateFinish, -lag)
    // Start-anchored links bound the predecessor's *start*, converted forward
    // through its duration into the equivalent bound on its finish.
    case 'SS': {
      const start = shiftWorkdays(calendar, succ.lateStart, -lag)
      return predDuration <= 0 ? start : endFromDuration(calendar, start, predDuration)
    }
    case 'SF': {
      const start = shiftWorkdays(calendar, succ.lateFinish, -lag)
      return predDuration <= 0 ? start : endFromDuration(calendar, start, predDuration)
    }
  }
}

export function buildSchedule(project: Project): Schedule {
  const calendar = toWorkCalendar(project.calendar)
  const flat = flattenTree(project.tasks)
  const issues: ScheduleIssue[] = []

  const byId = new Map<string, Task>()
  for (const task of project.tasks) byId.set(task.id, task)

  const childIds = new Map<string, string[]>()
  for (const { task } of flat) {
    if (task.parentId !== null && byId.has(task.parentId)) {
      const bucket = childIds.get(task.parentId)
      if (bucket) bucket.push(task.id)
      else childIds.set(task.parentId, [task.id])
    }
  }

  // ─── Validate dependencies ──────────────────────────────────────────────
  const deps = new Map<string, Dependency[]>()
  for (const { task } of flat) {
    const kept: Dependency[] = []
    for (const dep of task.deps) {
      if (dep.from === task.id) {
        issues.push({
          kind: 'self-dependency',
          taskIds: [task.id],
          message: `"${task.name}" depends on itself; the link was ignored.`,
        })
        continue
      }
      if (!byId.has(dep.from)) {
        issues.push({
          kind: 'missing-dependency',
          taskIds: [task.id],
          message: `"${task.name}" depends on a task that no longer exists; the link was ignored.`,
        })
        continue
      }
      kept.push(dep)
    }
    deps.set(task.id, kept)
  }

  // ─── Topological order over dependency and roll-up edges ────────────────
  const indegree = new Map<string, number>()
  const successors = new Map<string, string[]>()
  for (const { task } of flat) {
    indegree.set(task.id, 0)
    successors.set(task.id, [])
  }
  const addEdge = (from: string, to: string) => {
    successors.get(from)?.push(to)
    indegree.set(to, (indegree.get(to) ?? 0) + 1)
  }
  for (const { task } of flat) {
    for (const dep of deps.get(task.id) ?? []) addEdge(dep.from, task.id)
    // A summary cannot be dated until its children are, so children come first.
    if (task.parentId !== null && byId.has(task.parentId)) addEdge(task.id, task.parentId)
  }

  // Document order seeds the queue so the result is stable across runs.
  const queue = flat.filter(({ task }) => (indegree.get(task.id) ?? 0) === 0).map(({ task }) => task.id)
  const topo: string[] = []
  while (queue.length > 0) {
    const id = queue.shift() as string
    topo.push(id)
    for (const next of successors.get(id) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1
      indegree.set(next, remaining)
      if (remaining === 0) queue.push(next)
    }
  }

  const inCycle = new Set<string>()
  if (topo.length < flat.length) {
    const scheduled = new Set(topo)
    for (const { task } of flat) if (!scheduled.has(task.id)) inCycle.add(task.id)
    const names = [...inCycle].map((id) => byId.get(id)?.name ?? id)
    issues.push({
      kind: 'cycle',
      taskIds: [...inCycle],
      message:
        names.length === 1
          ? `"${names[0]}" is part of a dependency loop; its links were ignored.`
          : `${names.length} tasks form a dependency loop (${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''}); their links were ignored.`,
    })
    // Cycle members still need dates, so they are appended and scheduled from
    // their stored start with their dependencies dropped. Leaving them out
    // would blank whole rows and hide the very tasks the message points at.
    for (const id of inCycle) topo.push(id)
  }

  // ─── Anchor for tasks with no usable start date ─────────────────────────
  const explicitStarts: number[] = []
  for (const { task } of flat) {
    const parsed = task.start.trim() === '' ? null : parseISODate(task.start)
    if (parsed !== null) explicitStarts.push(parsed)
    else if (task.start.trim() !== '') {
      issues.push({
        kind: 'invalid-date',
        taskIds: [task.id],
        message: `"${task.name}" has an unreadable start date (${task.start}); it was placed at the project start.`,
      })
    }
  }
  const anchor = explicitStarts.length > 0 ? Math.min(...explicitStarts) : todayDayNumber()

  // ─── Forward pass ───────────────────────────────────────────────────────
  const placed = new Map<string, { start: number; end: number; duration: number }>()
  const progress = new Map<string, number>()

  for (const id of topo) {
    const task = byId.get(id)
    if (!task) continue
    const children = childIds.get(id) ?? []

    if (children.length > 0) {
      // Summary: span whatever the children ended up occupying.
      let start = Infinity
      let end = -Infinity
      for (const child of children) {
        const span = placed.get(child)
        if (!span) continue
        start = Math.min(start, span.start)
        end = Math.max(end, span.end)
      }
      if (!isFinite(start)) {
        start = nextWorkday(calendar, anchor)
        end = start
      }
      placed.set(id, { start, end, duration: workdaysBetween(calendar, start, end) })

      // Weighted by working days, so a two-day task finishing does not count
      // as much as a twenty-day one. Milestones carry a weight of one rather
      // than zero, which would drop them out of the average entirely.
      let weighted = 0
      let weight = 0
      for (const child of children) {
        const span = placed.get(child)
        if (!span) continue
        const childWeight = Math.max(1, span.duration)
        weighted += (progress.get(child) ?? 0) * childWeight
        weight += childWeight
      }
      progress.set(id, weight > 0 ? Math.round(weighted / weight) : 0)
      continue
    }

    const duration = Math.max(0, Math.round(task.duration))
    const parsedStart = task.start.trim() === '' ? null : parseISODate(task.start)
    const manualStart = nextWorkday(calendar, parsedStart ?? anchor)

    let start = manualStart
    if (!inCycle.has(id)) {
      for (const dep of deps.get(id) ?? []) {
        const pred = placed.get(dep.from)
        if (!pred) continue
        const required = constraintStart(calendar, dep.type, dep.lag, pred, duration)
        if (project.autoSchedule) {
          // Links only ever push a task later: the stored date stays a floor,
          // so a task pinned to a date does not silently jump backwards when
          // an unrelated predecessor is shortened.
          if (required > start) start = required
        } else if (required > manualStart) {
          issues.push({
            kind: 'constraint-violation',
            taskIds: [id, dep.from],
            message: `"${task.name}" starts before its ${dep.type} link from "${byId.get(dep.from)?.name ?? dep.from}" allows. Turn on auto-scheduling to fix it.`,
          })
        }
      }
    }

    const end = duration <= 0 ? start : endFromDuration(calendar, start, duration)
    placed.set(id, { start, end, duration })
    progress.set(id, Math.min(100, Math.max(0, task.progress)))
  }

  const spans = [...placed.values()]
  const projectStart = spans.length > 0 ? Math.min(...spans.map((s) => s.start)) : anchor
  const projectEnd = spans.length > 0 ? Math.max(...spans.map((s) => s.end)) : anchor

  // ─── Backward pass (critical path) ──────────────────────────────────────
  const late = new Map<string, { lateStart: number; lateFinish: number }>()

  for (let i = topo.length - 1; i >= 0; i--) {
    const id = topo[i]
    if (id === undefined) continue
    const task = byId.get(id)
    const span = placed.get(id)
    if (!task || !span) continue

    let lateFinish = projectEnd
    if (!inCycle.has(id)) {
      for (const succId of successors.get(id) ?? []) {
        const succ = late.get(succId)
        if (!succ) continue
        // Roll-up edges carry the parent's own deadline down to the child; a
        // dependency edge carries the successor's link semantics.
        const link = (deps.get(succId) ?? []).find((d) => d.from === id)
        const bound = link
          ? latestPredecessorFinish(calendar, link.type, link.lag, succ, span.duration)
          : succ.lateFinish
        if (bound < lateFinish) lateFinish = bound
      }
    }
    const lateStart =
      span.duration <= 0 ? lateFinish : shiftWorkdays(calendar, lateFinish, -(span.duration - 1))
    late.set(id, { lateStart, lateFinish })
  }

  // ─── Assemble rows ──────────────────────────────────────────────────────
  const collapsedAncestor = new Set<string>()
  for (const { task } of flat) {
    const parent = task.parentId
    if (parent === null) continue
    const parentTask = byId.get(parent)
    if (!parentTask) continue
    if (parentTask.collapsed || collapsedAncestor.has(parent)) collapsedAncestor.add(task.id)
  }

  const rows: ScheduledTask[] = flat.map(({ task, depth }) => {
    const span = placed.get(task.id) ?? { start: anchor, end: anchor, duration: 0 }
    const bounds = late.get(task.id) ?? { lateStart: span.start, lateFinish: span.end }
    const totalFloat = workdayDelta(calendar, span.start, bounds.lateStart)
    return {
      id: task.id,
      task,
      depth,
      isSummary: (childIds.get(task.id) ?? []).length > 0,
      start: span.start,
      end: span.end,
      duration: span.duration,
      progress: progress.get(task.id) ?? 0,
      lateStart: bounds.lateStart,
      lateFinish: bounds.lateFinish,
      totalFloat,
      critical: totalFloat <= 0,
      hidden: collapsedAncestor.has(task.id),
      deps: deps.get(task.id) ?? [],
    }
  })

  return {
    rows,
    visible: rows.filter((row) => !row.hidden),
    byId: new Map(rows.map((row) => [row.id, row])),
    projectStart,
    projectEnd,
    issues,
  }
}

/** Working days in the project span, for the summary strip. */
export function projectWorkdays(schedule: Schedule, config: CalendarConfig): number {
  return workdaysBetween(toWorkCalendar(config), schedule.projectStart, schedule.projectEnd)
}

/** True when the day is non-working, used to shade the timeline background. */
export function isNonWorkingDay(calendar: WorkCalendar, day: number): boolean {
  return !isWorkday(calendar, day)
}

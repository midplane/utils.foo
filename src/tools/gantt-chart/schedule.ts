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

/**
 * The start a task must not begin before, given one resolved predecessor.
 *
 * A task occupies whole days, so it starts at the beginning of its first day
 * and finishes at the end of its last day. A milestone sits at the end of its
 * day. Thus a link into a finish (FS into a milestone, FF, SF) and a link out
 * of a start (SS, SF) do not add a day.
 */
function constraintStart(
  calendar: WorkCalendar,
  type: Dependency['type'],
  lag: number,
  pred: { start: number; end: number },
  duration: number
): number {
  switch (type) {
    // The successor may begin the working day after the predecessor ends. A
    // milestone successor marks that end, so it lands on the same day.
    case 'FS':
      return shiftWorkdays(calendar, pred.end, duration <= 0 ? lag : 1 + lag)
    case 'SS':
      return shiftWorkdays(calendar, pred.start, lag)
    // Finish-anchored links constrain the end, so they are converted back into
    // an implied start by walking the task's own duration backwards.
    case 'FF': {
      const finish = shiftWorkdays(calendar, pred.end, lag)
      return duration <= 0 ? finish : shiftWorkdays(calendar, finish, -(duration - 1))
    }
    // The successor must finish by the time the predecessor starts, which is
    // the end of the working day before that start.
    case 'SF': {
      const finish = shiftWorkdays(calendar, pred.start, lag - 1)
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
  predDuration: number,
  succDuration: number
): number {
  switch (type) {
    case 'FS':
      return shiftWorkdays(calendar, succ.lateStart, succDuration <= 0 ? -lag : -1 - lag)
    case 'FF':
      return shiftWorkdays(calendar, succ.lateFinish, -lag)
    // Start-anchored links bound the predecessor's *start*, converted forward
    // through its duration into the equivalent bound on its finish.
    case 'SS': {
      const start = shiftWorkdays(calendar, succ.lateStart, -lag)
      return predDuration <= 0 ? start : endFromDuration(calendar, start, predDuration)
    }
    case 'SF': {
      const start = shiftWorkdays(calendar, succ.lateFinish, 1 - lag)
      return predDuration <= 0 ? start : endFromDuration(calendar, start, predDuration)
    }
  }
}

/**
 * Members of every dependency loop among `nodes`: strongly connected
 * components with more than one node, or one node that links to itself.
 *
 * Tasks that are only downstream of a loop are not members. They keep their
 * links and are scheduled after the loop.
 */
function loopMembers(nodes: readonly string[], edges: ReadonlyMap<string, readonly Edge[]>): Set<string> {
  const allowed = new Set(nodes)
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const members = new Set<string>()
  let counter = 0

  const visit = (id: string) => {
    index.set(id, counter)
    low.set(id, counter)
    counter++
    stack.push(id)
    onStack.add(id)
    let selfLoop = false
    for (const edge of edges.get(id) ?? []) {
      if (!allowed.has(edge.to)) continue
      if (edge.to === id) selfLoop = true
      if (!index.has(edge.to)) {
        visit(edge.to)
        low.set(id, Math.min(low.get(id) ?? 0, low.get(edge.to) ?? 0))
      } else if (onStack.has(edge.to)) {
        low.set(id, Math.min(low.get(id) ?? 0, index.get(edge.to) ?? 0))
      }
    }
    if (low.get(id) !== index.get(id)) return
    const component: string[] = []
    let member: string | undefined
    do {
      member = stack.pop()
      if (member === undefined) break
      onStack.delete(member)
      component.push(member)
    } while (member !== id)
    if (component.length > 1 || selfLoop) for (const m of component) members.add(m)
  }

  for (const id of nodes) if (!index.has(id)) visit(id)
  return members
}

/** A scheduling edge. `dep` is null for the roll-up edge from a child to its summary. */
interface Edge {
  from: string
  to: string
  dep: Dependency | null
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

  // ─── Links that a summary passes down to its tasks ──────────────────────
  // A summary has no dates of its own, so a link into a summary applies to
  // each leaf task under it. Links from inside the summary's own subtree are
  // not passed down: a summary cannot wait for one of its own parts.
  const ancestorIds = (id: string): string[] => {
    const out: string[] = []
    const guard = new Set<string>([id])
    let cursor = byId.get(id)?.parentId ?? null
    while (cursor !== null && byId.has(cursor) && !guard.has(cursor)) {
      out.push(cursor)
      guard.add(cursor)
      cursor = byId.get(cursor)?.parentId ?? null
    }
    return out
  }
  const scheduleDeps = new Map<string, Dependency[]>()
  for (const { task } of flat) {
    if ((childIds.get(task.id) ?? []).length > 0) continue
    const own = [...(deps.get(task.id) ?? [])]
    for (const summary of ancestorIds(task.id)) {
      for (const dep of deps.get(summary) ?? []) {
        if (dep.from === task.id || ancestorIds(dep.from).includes(summary)) continue
        own.push(dep)
      }
    }
    scheduleDeps.set(task.id, own)
  }

  // ─── Topological order over dependency and roll-up edges ────────────────
  const outEdges = new Map<string, Edge[]>()
  const inEdges = new Map<string, Edge[]>()
  for (const { task } of flat) {
    outEdges.set(task.id, [])
    inEdges.set(task.id, [])
  }
  const addEdge = (edge: Edge) => {
    outEdges.get(edge.from)?.push(edge)
    inEdges.get(edge.to)?.push(edge)
  }
  for (const { task } of flat) {
    for (const dep of scheduleDeps.get(task.id) ?? []) addEdge({ from: dep.from, to: task.id, dep })
    // A summary cannot be dated until its children are, so children come first.
    if (task.parentId !== null && byId.has(task.parentId)) {
      addEdge({ from: task.id, to: task.parentId, dep: null })
    }
  }

  // Kahn's algorithm over the edges that `counts` accepts. Document order
  // seeds the queue so the result is stable across runs.
  const order = (nodes: readonly string[], counts: (edge: Edge) => boolean): string[] => {
    const allowed = new Set(nodes)
    const indegree = new Map<string, number>()
    for (const id of nodes) {
      indegree.set(id, (inEdges.get(id) ?? []).filter((e) => allowed.has(e.from) && counts(e)).length)
    }
    const queue = nodes.filter((id) => indegree.get(id) === 0)
    const out: string[] = []
    while (queue.length > 0) {
      const id = queue.shift() as string
      out.push(id)
      for (const edge of outEdges.get(id) ?? []) {
        if (!allowed.has(edge.to) || !counts(edge)) continue
        const remaining = (indegree.get(edge.to) ?? 0) - 1
        indegree.set(edge.to, remaining)
        if (remaining === 0) queue.push(edge.to)
      }
    }
    return out
  }

  const flatIds = flat.map(({ task }) => task.id)
  const topo = order(flatIds, () => true)

  const inCycle = new Set<string>()
  if (topo.length < flat.length) {
    const scheduled = new Set(topo)
    const rest = flatIds.filter((id) => !scheduled.has(id))
    for (const id of loopMembers(rest, outEdges)) inCycle.add(id)
    const members = rest.filter((id) => inCycle.has(id))
    const names = members.map((id) => byId.get(id)?.name ?? id)
    if (members.length > 0) issues.push({
      kind: 'cycle',
      taskIds: members,
      message:
        names.length === 1
          ? `"${names[0]}" is part of a dependency loop; its links were ignored.`
          : `${names.length} tasks form a dependency loop (${names.slice(0, 4).join(', ')}${names.length > 4 ? '…' : ''}); their links were ignored.`,
    })
    // Loop members still need dates, so they are scheduled from their stored
    // start with their links dropped. Leaving them out would blank whole rows
    // and hide the very tasks the message points at. Roll-up edges stay, so a
    // summary is still dated after its children, and tasks downstream of the
    // loop keep their links.
    const resumed = order(rest, (edge) => edge.dep === null || !inCycle.has(edge.to))
    topo.push(...resumed)
    // Only a parent loop (A inside B inside A) is left at this point.
    const placedIds = new Set(topo)
    for (const id of rest) if (!placedIds.has(id)) topo.push(id)
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
      for (const dep of scheduleDeps.get(id) ?? []) {
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
            message: `"${task.name}" starts before the ${dep.type} link from "${byId.get(dep.from)?.name ?? dep.from}" allows. Turn on auto-scheduling to fix it.`,
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
    for (const edge of outEdges.get(id) ?? []) {
      // The forward pass ignored the links of loop members, so this does too.
      if (edge.dep !== null && inCycle.has(edge.to)) continue
      const succ = late.get(edge.to)
      if (!succ) continue
      // Roll-up edges carry the parent's own deadline down to the child; a
      // dependency edge carries the successor's link semantics.
      const bound = edge.dep
        ? latestPredecessorFinish(
            calendar,
            edge.dep.type,
            edge.dep.lag,
            succ,
            span.duration,
            placed.get(edge.to)?.duration ?? 1
          )
        : succ.lateFinish
      if (bound < lateFinish) lateFinish = bound
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

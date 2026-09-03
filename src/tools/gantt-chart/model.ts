/** The project document: tasks, the working calendar, and scheduling mode. */

export const DEPENDENCY_TYPES = ['FS', 'SS', 'FF', 'SF'] as const
export type DependencyType = (typeof DEPENDENCY_TYPES)[number]

export const DEPENDENCY_LABELS: Record<DependencyType, string> = {
  FS: 'Finish → Start',
  SS: 'Start → Start',
  FF: 'Finish → Finish',
  SF: 'Start → Finish',
}

export interface Dependency {
  /** Id of the predecessor task. */
  from: string
  type: DependencyType
  /** Working days of delay; negative pulls the successor earlier (lead). */
  lag: number
}

/**
 * The palette keys a bar may be tinted with. Names, not hexes, so a saved
 * project re-resolves against the theme tokens rather than freezing a
 * light-mode colour into the document.
 *
 * Three, not seven: any two bars in a chart can be compared, and these are the
 * hues that clear colour-vision and normal-vision separation against both the
 * light and dark surfaces. Accent is absent on purpose — in this codebase it
 * means selection and focus, so spending it on a category would leave the
 * selected bar indistinguishable from an orange one.
 */
export const TASK_COLORS = ['blue', 'orange', 'aqua'] as const
export type TaskColor = (typeof TASK_COLORS)[number]

export const TASK_COLOR_LABELS: Record<TaskColor, string> = {
  blue: 'Blue',
  orange: 'Orange',
  aqua: 'Aqua',
}

/** CSS variable backing each palette key. */
export const TASK_COLOR_VAR: Record<TaskColor, string> = {
  blue: 'var(--color-gantt-blue)',
  orange: 'var(--color-gantt-orange)',
  aqua: 'var(--color-gantt-aqua)',
}

export interface Task {
  id: string
  name: string
  /** ISO `YYYY-MM-DD`. Under auto-scheduling this is a "no earlier than" floor. */
  start: string
  /** Working days. 0 marks a milestone, which renders as a diamond. */
  duration: number
  /** 0-100. */
  progress: number
  deps: Dependency[]
  /** Id of the summary task this nests under, or null at the top level. */
  parentId: string | null
  /** Children hidden in the grid and rolled into the parent's bar. */
  collapsed: boolean
  assignee: string
  color: TaskColor
  notes: string
}

export interface CalendarConfig {
  /** Indexed by weekday, 0 = Sunday. */
  workdays: boolean[]
  /** ISO dates excluded on top of the weekly pattern. */
  holidays: string[]
}

export interface Project {
  name: string
  tasks: Task[]
  calendar: CalendarConfig
  /**
   * When true, dependencies push successors right; when false the stored
   * dates are used verbatim and any violated link is reported instead.
   */
  autoSchedule: boolean
}

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = {
  workdays: [false, true, true, true, true, true, false],
  holidays: [],
}

// ─── Construction ─────────────────────────────────────────────────────────────

/**
 * Ids are generated rather than derived from the name: names are edited freely
 * and duplicated often, while a dependency has to keep pointing at the same row
 * across a rename.
 */
let idCounter = 0
export function newTaskId(): string {
  idCounter += 1
  return `t${Date.now().toString(36)}${idCounter.toString(36)}`
}

export function makeTask(partial: Partial<Task> = {}): Task {
  return {
    id: partial.id ?? newTaskId(),
    name: partial.name ?? 'New task',
    start: partial.start ?? '',
    duration: partial.duration ?? 5,
    progress: partial.progress ?? 0,
    deps: partial.deps ?? [],
    parentId: partial.parentId ?? null,
    collapsed: partial.collapsed ?? false,
    assignee: partial.assignee ?? '',
    color: partial.color ?? 'blue',
    notes: partial.notes ?? '',
  }
}

// ─── Hierarchy ────────────────────────────────────────────────────────────────

/** Direct children of each task id, in document order. */
export function childrenByParent(tasks: readonly Task[]): Map<string | null, Task[]> {
  const ids = new Set(tasks.map((t) => t.id))
  const map = new Map<string | null, Task[]>()
  for (const task of tasks) {
    // A parent that no longer exists would orphan the row out of the tree walk
    // entirely, so those tasks are re-rooted rather than dropped.
    const parent = task.parentId !== null && ids.has(task.parentId) ? task.parentId : null
    const bucket = map.get(parent)
    if (bucket) bucket.push(task)
    else map.set(parent, [task])
  }
  return map
}

/**
 * Depth-first document order with each task's depth.
 *
 * Guards against a parent cycle (A parented to B parented to A): such a group
 * is unreachable from the roots, so it is appended at the top level instead of
 * vanishing from the grid with no explanation.
 */
export function flattenTree(tasks: readonly Task[]): { task: Task; depth: number }[] {
  const children = childrenByParent(tasks)
  const out: { task: Task; depth: number }[] = []
  const seen = new Set<string>()

  const walk = (parent: string | null, depth: number) => {
    for (const task of children.get(parent) ?? []) {
      if (seen.has(task.id)) continue
      seen.add(task.id)
      out.push({ task, depth })
      walk(task.id, depth + 1)
    }
  }
  walk(null, 0)

  for (const task of tasks) {
    if (!seen.has(task.id)) {
      seen.add(task.id)
      out.push({ task, depth: 0 })
    }
  }
  return out
}

/** True when the task has at least one child and so is scheduled by roll-up. */
export function isSummary(tasks: readonly Task[], id: string): boolean {
  return tasks.some((t) => t.parentId === id)
}

/** A task's ancestor ids, nearest first. */
export function ancestorsOf(tasks: readonly Task[], id: string): string[] {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const out: string[] = []
  let cursor = byId.get(id)?.parentId ?? null
  const guard = new Set<string>([id])
  while (cursor !== null && !guard.has(cursor)) {
    out.push(cursor)
    guard.add(cursor)
    cursor = byId.get(cursor)?.parentId ?? null
  }
  return out
}

/** The task and everything nested beneath it. */
export function subtreeIds(tasks: readonly Task[], id: string): string[] {
  const children = childrenByParent(tasks)
  const out: string[] = []
  const walk = (current: string) => {
    out.push(current)
    for (const child of children.get(current) ?? []) walk(child.id)
  }
  walk(id)
  return out
}

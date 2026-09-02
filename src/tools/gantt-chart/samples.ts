/**
 * Starter projects.
 *
 * A Gantt chart is unreadable until it has dependencies and a hierarchy, so an
 * empty grid teaches nothing about what the tool does. Each sample is small
 * enough to take in at a glance but exercises summaries, all four link types,
 * milestones and a real critical path.
 */

import { DEFAULT_CALENDAR_CONFIG, Project, Task, makeTask } from './model'
import { formatISODate, todayDayNumber } from './calendar'
import { startOfWeek } from './timeline'

export interface GanttSample {
  id: string
  label: string
  description: string
  build: () => Project
}

/**
 * Samples are anchored to the Monday of the current week rather than a fixed
 * date, so the today marker always lands inside the chart instead of the
 * sample opening scrolled years away from it.
 */
function weekMonday(offsetWeeks = 0): string {
  return formatISODate(startOfWeek(todayDayNumber()) + offsetWeeks * 7)
}

function task(id: string, name: string, partial: Partial<Task> = {}): Task {
  return makeTask({ ...partial, id, name })
}

function productLaunch(): Project {
  const start = weekMonday(0)
  return {
    name: 'Product launch',
    autoSchedule: true,
    calendar: DEFAULT_CALENDAR_CONFIG,
    tasks: [
      task('discovery', 'Discovery', { color: 'blue' }),
      task('interviews', 'Customer interviews', {
        parentId: 'discovery', start, duration: 8, progress: 100, color: 'blue', assignee: 'Priya',
      }),
      task('synthesis', 'Synthesis & problem framing', {
        parentId: 'discovery', duration: 4, progress: 100, color: 'blue', assignee: 'Priya',
        deps: [{ from: 'interviews', type: 'FS', lag: 0 }],
      }),
      task('scope-locked', 'Scope locked', {
        parentId: 'discovery', duration: 0, color: 'blue',
        deps: [{ from: 'synthesis', type: 'FS', lag: 0 }],
      }),

      task('build', 'Build', { color: 'orange' }),
      task('design', 'Interface design', {
        parentId: 'build', duration: 10, progress: 70, color: 'orange', assignee: 'Marco',
        deps: [{ from: 'scope-locked', type: 'FS', lag: 0 }],
      }),
      task('api', 'API & data model', {
        parentId: 'build', duration: 14, progress: 45, color: 'orange', assignee: 'Dana',
        deps: [{ from: 'scope-locked', type: 'FS', lag: 0 }],
      }),
      task('frontend', 'Frontend implementation', {
        parentId: 'build', duration: 12, progress: 10, color: 'orange', assignee: 'Sam',
        // Starts a week into design rather than waiting for it to finish.
        deps: [{ from: 'design', type: 'SS', lag: 5 }],
      }),
      task('integration', 'Integration & hardening', {
        parentId: 'build', duration: 6, color: 'orange', assignee: 'Dana',
        deps: [
          { from: 'api', type: 'FS', lag: 0 },
          { from: 'frontend', type: 'FS', lag: 0 },
        ],
      }),

      task('launch', 'Launch', { color: 'aqua' }),
      task('docs', 'Docs & release notes', {
        parentId: 'launch', duration: 5, color: 'aqua', assignee: 'Priya',
        // Must be finished by the time hardening is, not after it.
        deps: [{ from: 'integration', type: 'FF', lag: 0 }],
      }),
      task('beta', 'Private beta', {
        parentId: 'launch', duration: 10, color: 'aqua', assignee: 'Sam',
        deps: [{ from: 'integration', type: 'FS', lag: 0 }],
      }),
      task('ga', 'General availability', {
        parentId: 'launch', duration: 0, color: 'aqua',
        deps: [
          { from: 'beta', type: 'FS', lag: 2 },
          { from: 'docs', type: 'FS', lag: 0 },
        ],
      }),
    ],
  }
}

function websiteRedesign(): Project {
  const start = weekMonday(0)
  return {
    name: 'Website redesign',
    autoSchedule: true,
    calendar: DEFAULT_CALENDAR_CONFIG,
    tasks: [
      task('audit', 'Content audit', { start, duration: 5, progress: 100, color: 'blue', assignee: 'Ivy' }),
      task('ia', 'Information architecture', {
        duration: 4, progress: 60, color: 'blue', assignee: 'Ivy',
        deps: [{ from: 'audit', type: 'FS', lag: 0 }],
      }),
      task('wireframes', 'Wireframes', {
        duration: 6, color: 'orange', assignee: 'Leo',
        deps: [{ from: 'ia', type: 'FS', lag: 0 }],
      }),
      task('visual', 'Visual design', {
        duration: 8, color: 'orange', assignee: 'Leo',
        deps: [{ from: 'wireframes', type: 'SS', lag: 3 }],
      }),
      task('copy', 'Copywriting', {
        duration: 10, color: 'aqua', assignee: 'Nia',
        deps: [{ from: 'ia', type: 'FS', lag: 0 }],
      }),
      task('build-pages', 'Page build', {
        duration: 12, color: 'aqua', assignee: 'Otto',
        deps: [
          { from: 'visual', type: 'FS', lag: 0 },
          { from: 'copy', type: 'FS', lag: 0 },
        ],
      }),
      task('qa', 'Cross-browser QA', {
        duration: 4, color: 'aqua', assignee: 'Otto',
        deps: [{ from: 'build-pages', type: 'FS', lag: 0 }],
      }),
      task('golive', 'Go live', {
        duration: 0, color: 'aqua',
        deps: [{ from: 'qa', type: 'FS', lag: 1 }],
      }),
    ],
  }
}

function sprint(): Project {
  const start = weekMonday(0)
  return {
    name: 'Two-week sprint',
    autoSchedule: true,
    calendar: DEFAULT_CALENDAR_CONFIG,
    tasks: [
      task('plan', 'Sprint planning', { start, duration: 1, progress: 100, color: 'blue' }),
      task('feat-a', 'Bulk import', {
        duration: 5, progress: 80, color: 'orange', assignee: 'Ada',
        deps: [{ from: 'plan', type: 'FS', lag: 0 }],
      }),
      task('feat-b', 'Audit log', {
        duration: 4, progress: 25, color: 'orange', assignee: 'Kai',
        deps: [{ from: 'plan', type: 'FS', lag: 0 }],
      }),
      task('bugfix', 'Bug backlog', {
        duration: 8, progress: 40, color: 'aqua', assignee: 'Rae',
        deps: [{ from: 'plan', type: 'FS', lag: 0 }],
      }),
      task('review', 'Code review & QA', {
        duration: 2, color: 'blue', assignee: 'Kai',
        deps: [
          { from: 'feat-a', type: 'FS', lag: 0 },
          { from: 'feat-b', type: 'FS', lag: 0 },
        ],
      }),
      task('demo', 'Demo', {
        duration: 0, color: 'blue',
        deps: [{ from: 'review', type: 'FS', lag: 0 }],
      }),
    ],
  }
}

export const SAMPLES: GanttSample[] = [
  {
    id: 'product-launch',
    label: 'Product launch',
    description: 'Three phases, all four link types, two milestones',
    build: productLaunch,
  },
  {
    id: 'website-redesign',
    label: 'Website redesign',
    description: 'A single flat plan with one overlapping hand-off',
    build: websiteRedesign,
  },
  {
    id: 'sprint',
    label: 'Two-week sprint',
    description: 'Parallel work converging on a demo',
    build: sprint,
  },
]

export function emptyProject(): Project {
  const start = weekMonday(0)
  return {
    name: 'Untitled plan',
    autoSchedule: true,
    calendar: DEFAULT_CALENDAR_CONFIG,
    tasks: [
      makeTask({ name: 'First task', start, duration: 5, color: 'blue' }),
    ],
  }
}

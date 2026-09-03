import { Plus, Trash2 } from 'lucide-react'
import { Badge, Button, Input, SectionLabel, Select, Textarea } from '../../../components/ui'
import { cn } from '../../../lib/utils'
import { formatISODate } from '../calendar'
import {
  DEPENDENCY_LABELS,
  DEPENDENCY_TYPES,
  Dependency,
  DependencyType,
  TASK_COLORS,
  TASK_COLOR_LABELS,
  TASK_COLOR_VAR,
  Task,
} from '../model'
import { Schedule, ScheduledTask } from '../schedule'
import { formatDayLabel } from '../timeline'

interface TaskInspectorProps {
  row: ScheduledTask
  schedule: Schedule
  onChange: (patch: Partial<Task>) => void
  onDelete: () => void
}

export function TaskInspector({ row, schedule, onChange, onDelete }: TaskInspectorProps) {
  const { task } = row
  const milestone = task.duration === 0

  const candidates = schedule.rows.filter(
    (other) =>
      other.id !== row.id &&
      // Linking to a task's own descendant makes a loop through the roll-up
      // edge, so those are kept out of the picker rather than reported after.
      !isDescendant(schedule, other.id, row.id)
  )

  const updateDep = (index: number, patch: Partial<Dependency>) => {
    const deps = task.deps.map((dep, i) => (i === index ? { ...dep, ...patch } : dep))
    onChange({ deps })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SectionLabel>Selected task</SectionLabel>
        {row.isSummary && <Badge>Summary</Badge>}
        {milestone && !row.isSummary && <Badge>Milestone</Badge>}
        {row.critical && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-error-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-error-text)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-error-icon)]" />
            Critical path
          </span>
        )}
        {!row.critical && (
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            {row.totalFloat} day{row.totalFloat === 1 ? '' : 's'} of slack
          </span>
        )}
      </div>

      <Input
        label="Name"
        value={task.name}
        onChange={(event) => onChange({ name: event.target.value })}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Input
          label="Start"
          type="date"
          value={formatISODate(row.start)}
          disabled={row.isSummary}
          onChange={(event) => onChange({ start: event.target.value })}
        />
        <Input
          label="Working days"
          type="number"
          min={0}
          value={row.isSummary ? row.duration : task.duration}
          disabled={row.isSummary}
          onChange={(event) => onChange({ duration: Math.max(0, Number(event.target.value)) })}
        />
        <Input
          label="Complete %"
          type="number"
          min={0}
          max={100}
          value={task.progress}
          disabled={row.isSummary}
          onChange={(event) =>
            onChange({ progress: Math.min(100, Math.max(0, Number(event.target.value))) })
          }
        />
        <Input
          label="Assignee"
          value={task.assignee}
          onChange={(event) => onChange({ assignee: event.target.value })}
        />
      </div>

      <div>
        <SectionLabel>Colour</SectionLabel>
        <div className="mt-1.5 flex gap-2">
          {TASK_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange({ color })}
              aria-pressed={task.color === color}
              aria-label={TASK_COLOR_LABELS[color]}
              title={TASK_COLOR_LABELS[color]}
              className={cn(
                'h-7 w-7 rounded-full border-2',
                task.color === color
                  ? 'border-[var(--color-accent)]'
                  : 'border-transparent hover:border-[var(--color-border-dark)]'
              )}
            >
              <span
                className="block h-full w-full rounded-full"
                style={{ background: TASK_COLOR_VAR[color] }}
              />
            </button>
          ))}
          {!row.isSummary && (
            <button
              type="button"
              onClick={() => onChange({ duration: milestone ? 5 : 0 })}
              className="ml-2 rounded-lg border border-[var(--color-border-dark)] px-2.5 text-xs text-[var(--color-ink-light)] hover:border-[var(--color-ink-muted)]"
            >
              {milestone ? 'Make it a task' : 'Make it a milestone'}
            </button>
          )}
        </div>
      </div>

      {/* ─── Dependencies ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between">
          <SectionLabel>Depends on</SectionLabel>
          <Button
            variant="ghost"
            size="sm"
            disabled={candidates.length === 0}
            onClick={() => {
              const first = candidates[0]
              if (first) onChange({ deps: [...task.deps, { from: first.id, type: 'FS', lag: 0 }] })
            }}
          >
            <Plus size={13} className="mr-1" /> Add link
          </Button>
        </div>

        {task.deps.length === 0 ? (
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
            No predecessors. Drag the circle on the right of a bar onto another task to link them.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-2">
            {task.deps.map((dep, index) => (
              <li key={`${dep.from}-${index}`} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[150px] flex-1">
                  <Select
                    label="Predecessor"
                    value={dep.from}
                    onChange={(event) => updateDep(index, { from: event.target.value })}
                    options={candidates.map((other) => ({ value: other.id, label: other.task.name }))}
                  />
                </div>
                <div className="w-[150px]">
                  <Select
                    label="Type"
                    value={dep.type}
                    onChange={(event) =>
                      updateDep(index, { type: event.target.value as DependencyType })
                    }
                    options={DEPENDENCY_TYPES.map((type) => ({
                      value: type,
                      label: `${type} — ${DEPENDENCY_LABELS[type]}`,
                    }))}
                  />
                </div>
                <div className="w-[86px]">
                  <Input
                    label="Lag"
                    type="number"
                    value={dep.lag}
                    onChange={(event) => updateDep(index, { lag: Number(event.target.value) || 0 })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove the link from ${schedule.byId.get(dep.from)?.task.name ?? dep.from}`}
                  onClick={() => onChange({ deps: task.deps.filter((_, i) => i !== index) })}
                >
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Textarea
        label="Notes"
        rows={2}
        value={task.notes}
        onChange={(event) => onChange({ notes: event.target.value })}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)] pt-3">
        <p className="text-xs text-[var(--color-ink-muted)]">
          Scheduled {formatDayLabel(row.start)} → {formatDayLabel(row.end)}
          {row.isSummary ? ' (rolled up from its children)' : ''}
        </p>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 size={14} className="mr-1" />
          Delete task
        </Button>
      </div>
    </div>
  )
}

/** True when `candidateId` sits anywhere beneath `rootId`. */
function isDescendant(schedule: Schedule, candidateId: string, rootId: string): boolean {
  let cursor: string | null = schedule.byId.get(candidateId)?.task.parentId ?? null
  const guard = new Set<string>()
  while (cursor !== null && !guard.has(cursor)) {
    if (cursor === rootId) return true
    guard.add(cursor)
    cursor = schedule.byId.get(cursor)?.task.parentId ?? null
  }
  return false
}

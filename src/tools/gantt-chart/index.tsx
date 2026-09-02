import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Diamond,
  Download,
  GanttChartSquare,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  ExpandHint,
  ExpandToggleButton,
  ExpandableCard,
  ExpandableCardContent,
  ExpandableCardHeader,
  EXPANDED_PANE_HEIGHT,
  DEFAULT_PANE_HEIGHT,
  Input,
  Modal,
  SectionLabel,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  Textarea,
  ToolHeader,
  Toggle,
  useExpandable,
} from '../../components/ui'
import { cn } from '../../lib/utils'
import { GanttBoard, ROW_HEIGHT, TaskEdit } from './components/GanttBoard'
import { TaskInspector } from './components/TaskInspector'
import { formatISODate, parseISODate, workdaysBetween } from './calendar'
import {
  DEFAULT_SVG_OPTIONS,
  copyPNGToClipboard,
  downloadPNG,
  downloadSVG,
  projectFromCSV,
  projectFromJSON,
  projectToCSV,
  projectToJSON,
  projectToMermaid,
  readTheme,
  renderGanttSVG,
} from './export'
import {
  Project,
  Task,
  ancestorsOf,
  flattenTree,
  makeTask,
  subtreeIds,
} from './model'
import { SAMPLES, emptyProject } from './samples'
import { buildSchedule, toWorkCalendar } from './schedule'
import { ZOOM_LABELS, ZOOM_LEVELS, ZoomLevel, buildTimeline } from './timeline'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const HISTORY_LIMIT = 80

interface History {
  past: Project[]
  present: Project
  future: Project[]
}

export default function GanttChartTool() {
  const [history, setHistory] = useState<History>(() => {
    const first = SAMPLES[0]
    return { past: [], present: first ? first.build() : emptyProject(), future: [] }
  })
  const project = history.present

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState<ZoomLevel>('week')
  const [showCritical, setShowCritical] = useState(true)
  const [showLinks, setShowLinks] = useState(true)
  const [gridWidth, setGridWidth] = useState(384)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [importWarnings, setImportWarnings] = useState<string[]>([])
  const [exportScale, setExportScale] = useState('2')
  const [exportNote, setExportNote] = useState('')
  const { expanded, setExpanded } = useExpandable()

  // ─── History ──────────────────────────────────────────────────────────────

  const commit = useCallback((next: Project | ((current: Project) => Project)) => {
    setHistory((state) => {
      const value = typeof next === 'function' ? next(state.present) : next
      if (value === state.present) return state
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: value,
        future: [],
      }
    })
  }, [])

  const undo = useCallback(() => {
    setHistory((state) => {
      const previous = state.past[state.past.length - 1]
      if (!previous) return state
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, HISTORY_LIMIT),
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((state) => {
      const next = state.future[0]
      if (!next) return state
      return {
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        present: next,
        future: state.future.slice(1),
      }
    })
  }, [])

  const replaceProject = useCallback((next: Project) => {
    setHistory({ past: [], present: next, future: [] })
    setSelectedId(null)
  }, [])

  // ─── Derived ──────────────────────────────────────────────────────────────

  const schedule = useMemo(() => buildSchedule(project), [project])
  const timeline = useMemo(
    () => buildTimeline(schedule.projectStart, schedule.projectEnd, zoom),
    [schedule.projectEnd, schedule.projectStart, zoom]
  )
  const selectedRow = selectedId ? schedule.byId.get(selectedId) : undefined
  const criticalCount = schedule.rows.filter((row) => row.critical && !row.isSummary).length
  const totalWorkdays = workdaysBetween(
    toWorkCalendar(project.calendar),
    schedule.projectStart,
    schedule.projectEnd
  )

  // ─── Task operations ──────────────────────────────────────────────────────

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      commit((current) => ({
        ...current,
        tasks: current.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
      }))
    },
    [commit]
  )

  /** A drag on the chart: the start moves, and a resize also sets the duration. */
  const applyEdit = useCallback(
    (id: string, edit: TaskEdit) => {
      commit((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                ...(edit.start !== undefined ? { start: edit.start } : {}),
                // A milestone stays a milestone however it is dragged.
                ...(edit.duration !== undefined && task.duration > 0
                  ? { duration: Math.max(1, edit.duration) }
                  : {}),
              }
            : task
        ),
      }))
    },
    [commit]
  )

  const addTask = useCallback(
    (milestone: boolean) => {
      const anchor = selectedId ? schedule.byId.get(selectedId) : undefined
      const created = makeTask({
        name: milestone ? 'New milestone' : 'New task',
        duration: milestone ? 0 : 5,
        // Siblings of the selection, or top level when nothing is selected.
        parentId: anchor?.task.parentId ?? null,
        start: anchor ? formatISODate(anchor.end) : formatISODate(schedule.projectStart),
        color: anchor?.task.color ?? 'blue',
      })
      commit((current) => {
        if (!anchor) return { ...current, tasks: [...current.tasks, created] }
        // Insert after the whole subtree of the anchor, so a new sibling does
        // not land in the middle of the anchor's children.
        const block = new Set(subtreeIds(current.tasks, anchor.id))
        let insertAt = current.tasks.length
        for (let i = current.tasks.length - 1; i >= 0; i--) {
          const task = current.tasks[i]
          if (task && block.has(task.id)) {
            insertAt = i + 1
            break
          }
        }
        const tasks = [...current.tasks]
        tasks.splice(insertAt, 0, created)
        return { ...current, tasks }
      })
      setSelectedId(created.id)
    },
    [commit, schedule, selectedId]
  )

  const deleteTask = useCallback(
    (id: string) => {
      commit((current) => {
        const doomed = new Set(subtreeIds(current.tasks, id))
        return {
          ...current,
          tasks: current.tasks
            .filter((task) => !doomed.has(task.id))
            // Links into a deleted task would otherwise dangle; the scheduler
            // reports those, but silently pruning them is what the user meant.
            .map((task) => ({ ...task, deps: task.deps.filter((dep) => !doomed.has(dep.from)) })),
        }
      })
      setSelectedId(null)
    },
    [commit]
  )

  const indent = useCallback(
    (id: string) => {
      commit((current) => {
        const flat = flattenTree(current.tasks)
        const index = flat.findIndex((entry) => entry.task.id === id)
        const row = flat[index]
        if (!row || index <= 0) return current
        // The nearest task above at the same depth is the previous sibling, and
        // that is what the task becomes a child of.
        let sibling: string | null = null
        for (let i = index - 1; i >= 0; i--) {
          const candidate = flat[i]
          if (!candidate) continue
          if (candidate.depth === row.depth) {
            sibling = candidate.task.id
            break
          }
          if (candidate.depth < row.depth) break
        }
        if (sibling === null) return current
        return {
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === id ? { ...task, parentId: sibling } : task
          ),
        }
      })
    },
    [commit]
  )

  const outdent = useCallback(
    (id: string) => {
      commit((current) => {
        const parents = ancestorsOf(current.tasks, id)
        if (parents.length === 0) return current
        const grandparent = parents[1] ?? null
        return {
          ...current,
          tasks: current.tasks.map((task) =>
            task.id === id ? { ...task, parentId: grandparent } : task
          ),
        }
      })
    },
    [commit]
  )

  const createLink = useCallback(
    (fromId: string, toId: string) => {
      commit((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === toId && !task.deps.some((dep) => dep.from === fromId)
            ? { ...task, deps: [...task.deps, { from: fromId, type: 'FS' as const, lag: 0 }] }
            : task
        ),
      }))
      setSelectedId(toId)
    },
    [commit]
  )

  const toggleCollapse = useCallback(
    (id: string) => {
      commit((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === id ? { ...task, collapsed: !task.collapsed } : task
        ),
      }))
    },
    [commit]
  )

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      const meta = event.metaKey || event.ctrlKey

      // Undo inside a text field is the browser's job, not ours.
      if (meta && event.key.toLowerCase() === 'z' && !typing) {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (meta && event.key.toLowerCase() === 'y' && !typing) {
        event.preventDefault()
        redo()
        return
      }
      if (typing || !selectedId) return
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteTask(selectedId)
      }
      if (event.altKey && event.key === 'ArrowRight' && event.shiftKey) {
        event.preventDefault()
        indent(selectedId)
      }
      if (event.altKey && event.key === 'ArrowLeft' && event.shiftKey) {
        event.preventDefault()
        outdent(selectedId)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [deleteTask, indent, outdent, redo, selectedId, undo])

  // ─── Import / export ──────────────────────────────────────────────────────

  const runImport = useCallback(() => {
    const text = importText.trim()
    if (!text) {
      setImportError('Paste some CSV or JSON first.')
      return
    }
    try {
      if (text.startsWith('{')) {
        replaceProject(projectFromJSON(text))
        setImportWarnings([])
      } else {
        const result = projectFromCSV(text)
        replaceProject(result.project)
        setImportWarnings(result.warnings)
      }
      setImportError('')
      setImportOpen(false)
      setImportText('')
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'That could not be read.')
    }
  }, [importText, replaceProject])

  const fileRef = useRef<HTMLInputElement>(null)
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => setImportText(String(reader.result ?? ''))
    reader.readAsText(file)
  }, [])

  const buildSVG = useCallback(
    () =>
      renderGanttSVG(schedule, timeline, readTheme(), {
        ...DEFAULT_SVG_OPTIONS,
        title: project.name,
        showCritical,
        showLinks,
        calendar: project.calendar,
      }),
    [project.calendar, project.name, schedule, showCritical, showLinks, timeline]
  )

  const withNote = useCallback(async (message: string, action: () => void | Promise<void>) => {
    try {
      await action()
      setExportNote(message)
    } catch (error) {
      setExportNote(error instanceof Error ? error.message : 'That export failed.')
    }
  }, [])

  const fileStem = (project.name.trim() || 'gantt').replace(/[^\w-]+/g, '-').toLowerCase()

  // ─── Calendar settings ────────────────────────────────────────────────────

  const toggleWorkday = useCallback(
    (index: number) => {
      commit((current) => ({
        ...current,
        calendar: {
          ...current.calendar,
          workdays: current.calendar.workdays.map((on, i) => (i === index ? !on : on)),
        },
      }))
    },
    [commit]
  )

  const [holidayDraft, setHolidayDraft] = useState('')
  const addHoliday = useCallback(() => {
    if (parseISODate(holidayDraft) === null) return
    commit((current) =>
      current.calendar.holidays.includes(holidayDraft)
        ? current
        : {
            ...current,
            calendar: {
              ...current.calendar,
              holidays: [...current.calendar.holidays, holidayDraft].sort(),
            },
          }
    )
    setHolidayDraft('')
  }, [commit, holidayDraft])

  // A six-row plan in a 760px pane is mostly empty space, so the collapsed
  // board shrinks to its content and only then starts scrolling. The slack
  // above the rows leaves room for the header and the horizontal scrollbar,
  // which would otherwise force a vertical one on an exactly-fitting plan.
  const boardHeight = expanded
    ? EXPANDED_PANE_HEIGHT
    : `max(240px, min(${schedule.visible.length * ROW_HEIGHT + 64}px, ${DEFAULT_PANE_HEIGHT}))`

  return (
    <div className="space-y-4">
      <ToolHeader icon={<GanttChartSquare size={20} />} title="Gantt" accentedSuffix="Chart Builder" />

      {/* ─── Toolbar ───────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[190px] flex-1">
              <Input
                label="Plan name"
                value={project.name}
                onChange={(event) => commit((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="w-[190px]">
              <Select
                label="Start from"
                value=""
                onChange={(event) => {
                  const sample = SAMPLES.find((entry) => entry.id === event.target.value)
                  if (sample) replaceProject(sample.build())
                  else if (event.target.value === 'blank') replaceProject(emptyProject())
                }}
                options={[
                  { value: '', label: 'Load a sample…' },
                  ...SAMPLES.map((sample) => ({ value: sample.id, label: sample.label })),
                  { value: 'blank', label: 'Blank plan' },
                ]}
              />
            </div>
            <div>
              <SectionLabel>Zoom</SectionLabel>
              <SegmentedControl
                className="mt-1.5"
                label="Timeline zoom"
                value={zoom}
                onChange={(value) => setZoom(value as ZoomLevel)}
              >
                {ZOOM_LEVELS.map((level) => (
                  <SegmentedControlItem key={level} value={level}>
                    {ZOOM_LABELS[level]}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--color-border)] pt-3">
            <Button variant="secondary" size="sm" onClick={() => addTask(false)}>
              <Plus size={14} className="mr-1" /> Task
            </Button>
            <Button variant="secondary" size="sm" onClick={() => addTask(true)}>
              <Diamond size={13} className="mr-1" /> Milestone
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={!selectedId}
                onClick={() => selectedId && outdent(selectedId)}
                title="Outdent (Shift+Alt+←)"
              >
                <ChevronsLeft size={15} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!selectedId}
                onClick={() => selectedId && indent(selectedId)}
                title="Indent (Shift+Alt+→)"
              >
                <ChevronsRight size={15} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!selectedId}
                onClick={() => selectedId && deleteTask(selectedId)}
                title="Delete task (Del)"
              >
                <Trash2 size={14} />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={history.past.length === 0}
                onClick={undo}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
              >
                <Undo2 size={15} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={history.future.length === 0}
                onClick={redo}
                title="Redo (Ctrl+Shift+Z)"
                aria-label="Redo"
              >
                <Redo2 size={15} />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Toggle
                id="gantt-auto"
                checked={project.autoSchedule}
                onChange={(event) =>
                  commit((current) => ({ ...current, autoSchedule: event.target.checked }))
                }
                label="Auto-schedule"
              />
              <Toggle
                id="gantt-critical"
                checked={showCritical}
                onChange={(event) => setShowCritical(event.target.checked)}
                label="Critical path"
              />
              <Toggle
                id="gantt-links"
                checked={showLinks}
                onChange={(event) => setShowLinks(event.target.checked)}
                label="Links"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)}>
                <Upload size={14} className="mr-1" /> Import
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                <Download size={14} className="mr-1" /> Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Issues ────────────────────────────────────────────────────────── */}
      {schedule.issues.length > 0 && (
        <Alert variant={schedule.issues.some((i) => i.kind === 'cycle') ? 'error' : 'warning'} size="sm">
          <ul className="space-y-1">
            {schedule.issues.slice(0, 4).map((issue, index) => (
              <li key={`${issue.kind}-${index}`}>
                <button
                  type="button"
                  className="text-left underline decoration-dotted underline-offset-2"
                  onClick={() => setSelectedId(issue.taskIds[0] ?? null)}
                >
                  {issue.message}
                </button>
              </li>
            ))}
            {schedule.issues.length > 4 && <li>…and {schedule.issues.length - 4} more.</li>}
          </ul>
        </Alert>
      )}

      {/* ─── Chart ─────────────────────────────────────────────────────────── */}
      <ExpandableCard expanded={expanded} onExpandedChange={setExpanded}>
        <ExpandableCardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
            <Badge>{schedule.rows.length} tasks</Badge>
            <span>
              {formatISODate(schedule.projectStart)} → {formatISODate(schedule.projectEnd)}
            </span>
            <span>·</span>
            <span>{totalWorkdays} working days</span>
            {showCritical && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-error-icon)]" />
                  {criticalCount} on the critical path
                </span>
              </>
            )}
          </div>
          <ExpandToggleButton />
        </ExpandableCardHeader>
        <ExpandableCardContent>
          <GanttBoard
            project={project}
            schedule={schedule}
            timeline={timeline}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={applyEdit}
            onFieldChange={updateTask}
            onToggleCollapse={toggleCollapse}
            onCreateLink={createLink}
            showCritical={showCritical}
            showLinks={showLinks}
            height={boardHeight}
            gridWidth={gridWidth}
            onGridWidthChange={setGridWidth}
          />
          <ExpandHint />
        </ExpandableCardContent>
      </ExpandableCard>

      {/* ─── Inspector and calendar ────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardContent>
            {selectedRow ? (
              <TaskInspector
                row={selectedRow}
                schedule={schedule}
                onChange={(patch) => updateTask(selectedRow.id, patch)}
                onDelete={() => deleteTask(selectedRow.id)}
              />
            ) : (
              <div className="py-6 text-center text-sm text-[var(--color-ink-muted)]">
                <p>Select a bar or a row to edit it here.</p>
                <p className="mt-1 text-xs">
                  Drag a bar to move it, its edges to resize, and the circle on its right onto
                  another task to link them.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div>
              <SectionLabel>Working days</SectionLabel>
              <div className="mt-1.5 flex gap-1">
                {WEEKDAY_LABELS.map((label, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleWorkday(index)}
                    aria-pressed={project.calendar.workdays[index] === true}
                    aria-label={
                      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
                        index
                      ]
                    }
                    className={cn(
                      'h-8 w-8 rounded-md border text-xs font-medium',
                      project.calendar.workdays[index]
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/12 text-[var(--color-ink)]'
                        : 'border-[var(--color-border-dark)] text-[var(--color-ink-muted)]'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">
                Durations are counted in working days, so non-working days never shorten a task.
              </p>
            </div>

            <div>
              <SectionLabel>Holidays</SectionLabel>
              <div className="mt-1.5 flex items-end gap-2">
                <Input
                  type="date"
                  value={holidayDraft}
                  aria-label="Holiday date"
                  onChange={(event) => setHolidayDraft(event.target.value)}
                />
                <Button variant="secondary" size="sm" onClick={addHoliday} disabled={!holidayDraft}>
                  Add
                </Button>
              </div>
              {project.calendar.holidays.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {project.calendar.holidays.map((holiday) => (
                    <li key={holiday}>
                      <button
                        type="button"
                        onClick={() =>
                          commit((current) => ({
                            ...current,
                            calendar: {
                              ...current.calendar,
                              holidays: current.calendar.holidays.filter((day) => day !== holiday),
                            },
                          }))
                        }
                        className="rounded-full border border-[var(--color-border-dark)] px-2 py-0.5 text-[11px] text-[var(--color-ink-light)] hover:border-[var(--color-error-border)] hover:text-[var(--color-error-text)]"
                        aria-label={`Remove the holiday on ${holiday}`}
                      >
                        {holiday} ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Import ────────────────────────────────────────────────────────── */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import a plan">
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-ink-light)]">
            Paste CSV or JSON, or choose a file. A <code>name</code> column is the only requirement;
            <code> id</code>, <code>parent</code>, <code>start</code>, <code>duration</code>,{' '}
            <code>progress</code>, <code>assignee</code> and <code>dependencies</code> are used when
            present. Dependencies look like <code>setup:FS+2</code>.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.json,text/csv,application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload size={14} className="mr-1" /> Choose a file
          </Button>
          <Textarea
            label="CSV or JSON"
            rows={9}
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder={'name,start,duration,dependencies\nDesign,2024-03-11,5,\nBuild,,8,Design'}
          />
          {importError && <Alert variant="error" size="sm">{importError}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button onClick={runImport}>Import</Button>
          </div>
        </div>
      </Modal>

      {importWarnings.length > 0 && (
        <Alert variant="warning" size="sm">
          Imported with {importWarnings.length} warning{importWarnings.length === 1 ? '' : 's'}:{' '}
          {importWarnings.slice(0, 2).join('; ')}
        </Alert>
      )}

      {/* ─── Export ────────────────────────────────────────────────────────── */}
      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Export">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-ink-light)]">
            Images are rendered fresh at the current zoom and follow your theme — they are not a
            screenshot of the pane.
          </p>
          <div className="w-[150px]">
            <Select
              label="Image scale"
              value={exportScale}
              onChange={(event) => setExportScale(event.target.value)}
              options={[
                { value: '1', label: '1× (screen)' },
                { value: '2', label: '2× (retina)' },
                { value: '3', label: '3× (print)' },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                withNote('PNG downloaded.', () =>
                  downloadPNG(buildSVG(), Number(exportScale), readTheme().surface, `${fileStem}.png`)
                )
              }
            >
              PNG
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => withNote('SVG downloaded.', () => downloadSVG(buildSVG(), `${fileStem}.svg`))}
            >
              SVG
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                withNote('Copied the chart as a PNG.', async () => {
                  const ok = await copyPNGToClipboard(buildSVG(), Number(exportScale), readTheme().surface)
                  if (!ok) throw new Error('This browser will not allow copying images.')
                })
              }
            >
              <Copy size={13} className="mr-1" /> Copy image
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                withNote('CSV copied.', () =>
                  navigator.clipboard.writeText(projectToCSV(project, schedule))
                )
              }
            >
              Copy CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                withNote('JSON copied.', () => navigator.clipboard.writeText(projectToJSON(project)))
              }
            >
              Copy JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                withNote('Mermaid copied — paste it into the Mermaid tool.', () =>
                  navigator.clipboard.writeText(projectToMermaid(project, schedule))
                )
              }
            >
              Copy Mermaid
            </Button>
          </div>
          {exportNote && <Alert variant="success" size="sm">{exportNote}</Alert>}
        </div>
      </Modal>
    </div>
  )
}

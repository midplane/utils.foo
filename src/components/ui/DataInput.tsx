import { useCallback, useRef, useState } from 'react'
import { Upload, FileSpreadsheet, ChevronDown, ChevronUp, FileDown } from 'lucide-react'
import { Card, CardContent, CardHeader } from './Card'
import { Button } from './Button'
import { Alert } from './Alert'
import { SectionLabel } from './SectionLabel'
import { Spinner } from './Spinner'
import { cn } from '../../lib/utils'

/** Reading much more than this in the browser is not a good experience. */
const MAX_FILE_BYTES = 25 * 1024 * 1024

/** Above this many samples, the picker becomes a select rather than buttons. */
const SAMPLE_BUTTON_LIMIT = 3

/** The shape DataInput needs; callers pass richer objects and get them back. */
interface SampleOption {
  id: string
  label: string
  description: string
}

interface DataInputProps<S extends SampleOption> {
  value: string
  onChange: (value: string) => void
  error: string
  warning: string
  samples: readonly S[]
  onLoadSample: (sample: S) => void
  /** A sample CSV is being fetched. */
  loadingSample?: boolean
  sampleError?: string
  /** Summary shown once the data has parsed, so the editor can collapse. */
  recordCount: number
  fieldCount: number
  sourceLabel: string
  /**
   * Distinguishes instances in the DOM. Shared by more than one tool, so the
   * ids cannot be hardcoded to any single one of them.
   */
  inputId?: string
  /** Heading above the editor. */
  label?: string
}

export function DataInput<S extends SampleOption>({
  value,
  onChange,
  error,
  warning,
  samples,
  onLoadSample,
  loadingSample = false,
  sampleError = '',
  recordCount,
  fieldCount,
  sourceLabel,
  inputId = 'data-input',
  label = 'CSV Data',
}: DataInputProps<S>) {
  const [fileError, setFileError] = useState('')
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [userExpanded, setUserExpanded] = useState(false)

  // Collapse once there is usable data. Anything unresolved - no rows yet, or a
  // problem to fix - keeps the editor open, since that is when it is needed.
  // Staying collapsed while the first sample loads avoids opening the editor
  // only to shut it again a moment later.
  const hasData = recordCount > 0 && !error
  const expanded =
    userExpanded || (!hasData && !loadingSample) || !!fileError || !!sampleError

  /** One ingest path, so the picker and a drop cannot diverge. */
  const ingest = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_BYTES) {
        setFileError(
          `"${file.name}" is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_FILE_BYTES)}.`
        )
        return
      }

      setFileError('')
      setLoading(true)

      const reader = new FileReader()
      reader.onload = (ev) => {
        setLoading(false)
        onChange(String(ev.target?.result ?? ''))
      }
      reader.onerror = () => {
        setLoading(false)
        setFileError(`Could not read "${file.name}".`)
      }
      reader.readAsText(file)
    },
    [onChange]
  )

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      // Reset immediately so the same file can be re-selected.
      e.target.value = ''
      if (file) ingest(file)
    },
    [ingest]
  )

  // ── Drag and drop ─────────────────────────────────────────────────────────
  // dragenter/dragleave also fire when crossing child elements, so a boolean
  // flickers as the pointer moves over the card's contents. Counting depth is
  // what keeps the highlight steady.
  const dragDepth = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    e.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    // Without this the browser navigates to the file instead of dropping it.
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDragLeave = useCallback(() => {
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragDepth.current = 0
      setDragging(false)

      const file = e.dataTransfer.files?.[0]
      if (!file) return

      // Extensions rather than MIME: browsers report CSV variously as text/csv,
      // application/vnd.ms-excel or an empty string depending on the OS.
      if (!/\.(csv|tsv|txt|tab)$/i.test(file.name)) {
        setFileError(`"${file.name}" is not a CSV, TSV or text file.`)
        return
      }
      ingest(file)
    },
    [ingest]
  )

  return (
    <Card
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative transition-colors',
        dragging && 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
      )}
    >
      {dragging && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-[var(--color-surface)]/85 pointer-events-none">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)]">
            <FileDown className="w-4 h-4" aria-hidden="true" />
            Drop a CSV or TSV file
          </span>
        </div>
      )}

      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[var(--color-ink-muted)]" aria-hidden="true" />
          <SectionLabel htmlFor={inputId}>{label}</SectionLabel>

          {loadingSample ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-ink-muted)]">
              <Spinner className="w-3 h-3" />
              Loading sample…
            </span>
          ) : (
            hasData && (
              <span className="text-[11px] text-[var(--color-ink-muted)]">
                {recordCount.toLocaleString()} rows × {fieldCount} columns
                {sourceLabel && ` · ${sourceLabel}`}
              </span>
            )
          )}

          <div className="flex-1" />

          {hasData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUserExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={`${inputId}-editor`}
              className="gap-1"
            >
              {expanded ? (
                <ChevronUp className="w-3 h-3" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3 h-3" aria-hidden="true" />
              )}
              {expanded ? 'Hide' : 'Change data'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {/* Alerts stay outside the collapsible region: a warning about the data
            is exactly what you need to see when the editor is shut. */}
        {sampleError && (
          <Alert variant="error" size="sm">
            {sampleError}
          </Alert>
        )}
        {fileError && (
          <Alert variant="error" size="sm">
            {fileError}
          </Alert>
        )}
        {error && (
          <Alert variant="error" size="sm">
            {error}
          </Alert>
        )}
        {!error && warning && (
          <Alert variant="warning" size="sm">
            {warning}
          </Alert>
        )}

        {expanded && (
          <div id={`${inputId}-editor`} className="space-y-2">
            <textarea
              id={inputId}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={5}
              placeholder={loadingSample ? 'Loading sample…' : 'Paste CSV data here…'}
              spellCheck={false}
              className="w-full px-3 py-2 text-xs font-mono bg-[var(--color-input-bg)] border border-[var(--color-input-border)] shadow-[var(--shadow-input-inset)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:border-[var(--color-accent)] resize-y transition-all"
            />

            <div className="flex flex-wrap items-center gap-2">
              <label
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border cursor-pointer transition-all',
                  'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]',
                  'focus-within:ring-1 focus-within:ring-[var(--color-accent)]',
                  loading && 'opacity-60 pointer-events-none'
                )}
              >
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv"
                  className="sr-only"
                  onChange={handleFile}
                />
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                {loading ? 'Reading…' : 'Upload file'}
              </label>

              {/* Drag and drop is invisible unless advertised. Hidden on touch,
                  where there is nothing to drag from. */}
              <span className="hidden sm:inline text-[11px] text-[var(--color-ink-muted)]">
                or drop one anywhere here
              </span>

              <span className="ml-1 text-[11px] text-[var(--color-ink-muted)]">
                or load a sample:
              </span>
              {/* A handful of samples read better as buttons; past that they
                  become a wall, and the descriptions - the useful part - are
                  stuck in tooltips. A select shows them inline.

                  Width is fixed because a select sizes itself to its widest
                  option, and the descriptions would otherwise stretch it across
                  the card. The open list is unaffected. */}
              {samples.length > SAMPLE_BUTTON_LIMIT ? (
                <select
                  aria-label="Load sample data"
                  disabled={loadingSample}
                  value=""
                  onChange={(e) => {
                    const picked = samples.find((s) => s.id === e.target.value)
                    if (picked) onLoadSample(picked)
                  }}
                  className="w-44 max-w-full truncate px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] shadow-[var(--shadow-input-inset)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)] focus:border-[var(--color-accent)] cursor-pointer transition-all disabled:cursor-not-allowed disabled:text-[var(--color-ink-muted)]"
                >
                  <option value="" disabled>
                    Load a sample…
                  </option>
                  {samples.map((sample) => (
                    <option key={sample.id} value={sample.id}>
                      {sample.label} — {sample.description}
                    </option>
                  ))}
                </select>
              ) : (
                samples.map((sample) => (
                  <Button
                    key={sample.id}
                    variant="ghost"
                    disabled={loadingSample}
                    title={sample.description}
                    onClick={() => onLoadSample(sample)}
                  >
                    {sample.label}
                  </Button>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

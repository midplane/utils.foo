import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Alert,
  SectionLabel,
  Spinner,
} from '../../../components/ui'
import { cn } from '../../../lib/utils'

/** Reading much more than this in the browser is not a good experience. */
const MAX_FILE_BYTES = 25 * 1024 * 1024

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
}: DataInputProps<S>) {
  const [fileError, setFileError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userExpanded, setUserExpanded] = useState(false)

  // Collapse once there is usable data. Anything unresolved - no rows yet, or a
  // problem to fix - keeps the editor open, since that is when it is needed.
  // Staying collapsed while the first sample loads avoids opening the editor
  // only to shut it again a moment later.
  const hasData = recordCount > 0 && !error
  const expanded =
    userExpanded || (!hasData && !loadingSample) || !!fileError || !!sampleError

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      // Reset immediately so the same file can be re-selected.
      e.target.value = ''
      if (!file) return

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[var(--color-ink-muted)]" aria-hidden="true" />
          <SectionLabel htmlFor="pivot-csv">CSV Data</SectionLabel>

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
              aria-controls="pivot-csv-editor"
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
          <div id="pivot-csv-editor" className="space-y-2">
            <textarea
              id="pivot-csv"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={5}
              placeholder={loadingSample ? 'Loading sample…' : 'Paste CSV data here…'}
              spellCheck={false}
              className="w-full px-3 py-2 text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 resize-y transition-all"
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

              <span className="ml-1 text-[11px] text-[var(--color-ink-muted)]">
                or load a sample:
              </span>
              {samples.map((sample) => (
                <Button
                  key={sample.id}
                  variant="ghost"
                  disabled={loadingSample}
                  title={sample.description}
                  onClick={() => onLoadSample(sample)}
                >
                  {sample.label}
                </Button>
              ))}
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

import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet } from 'lucide-react'
import { Card, CardContent, CardHeader, Button, Alert, SectionLabel } from '../../../components/ui'
import { cn } from '../../../lib/utils'

/** Reading much more than this in the browser is not a good experience. */
const MAX_FILE_BYTES = 25 * 1024 * 1024

interface DataInputProps {
  value: string
  onChange: (value: string) => void
  error: string
  warning: string
  onLoadSample: () => void
}

export function DataInput({ value, onChange, error, warning, onLoadSample }: DataInputProps) {
  const [fileError, setFileError] = useState('')
  const [loading, setLoading] = useState(false)

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
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <textarea
          id="pivot-csv"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          placeholder="Paste CSV data here…"
          spellCheck={false}
          className="w-full px-3 py-2 text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 resize-y transition-all"
        />

        {fileError && <Alert variant="error" size="sm">{fileError}</Alert>}
        {error && <Alert variant="error" size="sm">{error}</Alert>}
        {!error && warning && <Alert variant="warning" size="sm">{warning}</Alert>}

        <div className="flex flex-wrap gap-2">
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
          <Button variant="ghost" onClick={onLoadSample}>
            Load sample
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

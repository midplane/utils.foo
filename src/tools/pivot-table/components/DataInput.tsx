import { useCallback } from 'react'
import { Upload, FileSpreadsheet, X } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'

interface DataInputProps {
  value: string
  onChange: (value: string) => void
  error: string
  onLoadSample: () => void
}

export function DataInput({ value, onChange, error, onLoadSample }: DataInputProps) {
  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        onChange(text)
      }
      reader.readAsText(file)
      // Reset so same file can be re-uploaded
      e.target.value = ''
    },
    [onChange]
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[var(--color-ink-muted)]" />
          <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
            CSV Data
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          placeholder="Paste CSV data here..."
          spellCheck={false}
          className="w-full px-3 py-2 text-xs font-mono bg-[var(--color-cream)] border border-[var(--color-border)] rounded-lg text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 resize-y transition-all"
        />

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-600">
            <X className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              className="sr-only"
              onChange={handleFile}
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--color-border)] bg-[var(--color-cream)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)] transition-all cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Upload File
            </span>
          </label>
          <Button variant="ghost" onClick={onLoadSample}>
            Load Sample
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

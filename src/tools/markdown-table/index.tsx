import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { Input } from '../../components/ui/Input'
import { Table, Plus, Trash2, AlignLeft, AlignCenter, AlignRight, RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type Alignment = 'left' | 'center' | 'right'

interface Column {
  id: string
  header: string
  align: Alignment
}

interface Row {
  id: string
  cells: Record<string, string>   // column id → cell value
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0
function uid() { return String(++_id) }

function buildMarkdown(columns: Column[], rows: Row[]): string {
  if (columns.length === 0) return ''

  // Column widths: max of header length and any cell length (min 3)
  const widths = columns.map(col => {
    const headerLen = col.header.length || col.id.length
    const cellMax = rows.reduce((max, row) => {
      return Math.max(max, (row.cells[col.id] ?? '').length)
    }, 0)
    return Math.max(3, headerLen, cellMax)
  })

  const pad = (s: string, w: number, align: Alignment) => {
    if (align === 'right')  return s.padStart(w)
    if (align === 'center') return s.padStart(Math.ceil((w + s.length) / 2)).padEnd(w)
    return s.padEnd(w)
  }

  const headerRow = '| ' + columns.map((col, i) =>
    pad(col.header || `Col ${i + 1}`, widths[i]!, col.align)
  ).join(' | ') + ' |'

  const sepRow = '| ' + columns.map((col, i) => {
    const w = widths[i]!
    if (col.align === 'center') return ':' + '-'.repeat(w - 2) + ':'
    if (col.align === 'right')  return '-'.repeat(w - 1) + ':'
    return '-'.repeat(w)
  }).join(' | ') + ' |'

  const dataRows = rows.map(row =>
    '| ' + columns.map((col, i) =>
      pad(row.cells[col.id] ?? '', widths[i]!, col.align)
    ).join(' | ') + ' |'
  )

  return [headerRow, sepRow, ...dataRows].join('\n')
}

// ─── Default data ─────────────────────────────────────────────────────────────

function makeDefaultState(): { columns: Column[]; rows: Row[] } {
  const c1 = uid(), c2 = uid(), c3 = uid()
  const columns: Column[] = [
    { id: c1, header: 'Name',    align: 'left' },
    { id: c2, header: 'Type',    align: 'left' },
    { id: c3, header: 'Default', align: 'center' },
  ]
  const rows: Row[] = [
    { id: uid(), cells: { [c1]: 'gfm',    [c2]: 'boolean', [c3]: 'true'  } },
    { id: uid(), cells: { [c1]: 'breaks', [c2]: 'boolean', [c3]: 'false' } },
    { id: uid(), cells: { [c1]: 'silent', [c2]: 'boolean', [c3]: 'false' } },
  ]
  return { columns, rows }
}

// ─── Alignment cycle button ───────────────────────────────────────────────────

const ALIGN_CYCLE: Alignment[] = ['left', 'center', 'right']
const ALIGN_ICONS: Record<Alignment, React.ReactNode> = {
  left:   <AlignLeft   className="w-3 h-3" />,
  center: <AlignCenter className="w-3 h-3" />,
  right:  <AlignRight  className="w-3 h-3" />,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarkdownTableTool() {
  const [columns, setColumns] = useState<Column[]>(() => makeDefaultState().columns)
  const [rows, setRows]       = useState<Row[]>(() => makeDefaultState().rows)

  // ── Column operations ───────────────────────────────────────────────────────

  const addColumn = useCallback(() => {
    const id = uid()
    setColumns(cols => [...cols, { id, header: '', align: 'left' }])
    setRows(rs => rs.map(r => ({ ...r, cells: { ...r.cells, [id]: '' } })))
  }, [])

  const removeColumn = useCallback((colId: string) => {
    setColumns(cols => cols.filter(c => c.id !== colId))
    setRows(rs => rs.map(r => {
      const cells = { ...r.cells }
      delete cells[colId]
      return { ...r, cells }
    }))
  }, [])

  const updateHeader = useCallback((colId: string, value: string) => {
    setColumns(cols => cols.map(c => c.id === colId ? { ...c, header: value } : c))
  }, [])

  const cycleAlign = useCallback((colId: string) => {
    setColumns(cols => cols.map(c => {
      if (c.id !== colId) return c
      const next = ALIGN_CYCLE[(ALIGN_CYCLE.indexOf(c.align) + 1) % ALIGN_CYCLE.length]!
      return { ...c, align: next }
    }))
  }, [])

  // ── Row operations ──────────────────────────────────────────────────────────

  const addRow = useCallback(() => {
    const cells: Record<string, string> = {}
    columns.forEach(c => { cells[c.id] = '' })
    setRows(rs => [...rs, { id: uid(), cells }])
  }, [columns])

  const removeRow = useCallback((rowId: string) => {
    setRows(rs => rs.filter(r => r.id !== rowId))
  }, [])

  const updateCell = useCallback((rowId: string, colId: string, value: string) => {
    setRows(rs => rs.map(r =>
      r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r
    ))
  }, [])

  // ── Reset ───────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    const { columns: c, rows: r } = makeDefaultState()
    setColumns(c)
    setRows(r)
  }, [])

  // ── Markdown output ─────────────────────────────────────────────────────────

  const markdown = useMemo(() => buildMarkdown(columns, rows), [columns, rows])

  // ── Rendered preview (re-use marked from markdown-preview approach) ─────────
  // Simple inline rendering — no dep on marked needed; just pre-formatted text

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb & Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
          <Table className="w-3.5 h-3.5" />
        </div>
        <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
          Markdown <span className="text-[var(--color-accent)]">Table</span>
        </h1>
      </div>

      {/* Editor card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-[var(--color-ink)]">
              {columns.length} {columns.length === 1 ? 'column' : 'columns'} · {rows.length} {rows.length === 1 ? 'row' : 'rows'}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 text-xs h-7 px-2">
                <RefreshCw className="w-3 h-3" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Table editor */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              {/* Header row */}
              <thead>
                <tr>
                  {columns.map((col, ci) => (
                    <th
                      key={col.id}
                      className="border border-[var(--color-border)] bg-[var(--color-cream-dark)] px-1 py-1 min-w-[120px]"
                    >
                      <div className="flex items-center gap-1">
                        <Input
                          value={col.header}
                          onChange={e => updateHeader(col.id, e.target.value)}
                          placeholder={`Col ${ci + 1}`}
                          className="h-6 text-xs font-semibold px-1.5 flex-1 min-w-0"
                        />
                        {/* Alignment cycle */}
                        <button
                          onClick={() => cycleAlign(col.id)}
                          title={`Align: ${col.align}`}
                          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] hover:bg-orange-50 transition-colors cursor-pointer"
                        >
                          {ALIGN_ICONS[col.align]}
                        </button>
                        {/* Remove column */}
                        {columns.length > 1 && (
                          <button
                            onClick={() => removeColumn(col.id)}
                            title="Remove column"
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-[var(--color-ink-muted)] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  {/* Add column button */}
                  <th className="border border-[var(--color-border)] bg-[var(--color-cream-dark)] px-1 py-1 w-8">
                    <button
                      onClick={addColumn}
                      title="Add column"
                      className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] hover:bg-orange-50 transition-colors cursor-pointer mx-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </th>
                </tr>
              </thead>

              {/* Data rows */}
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="group">
                    {columns.map(col => (
                      <td
                        key={col.id}
                        className={cn(
                          'border border-[var(--color-border)] px-1 py-1',
                          col.align === 'center' && 'text-center',
                          col.align === 'right'  && 'text-right',
                        )}
                      >
                        <Input
                          value={row.cells[col.id] ?? ''}
                          onChange={e => updateCell(row.id, col.id, e.target.value)}
                          placeholder="—"
                          className={cn(
                            'h-6 text-xs px-1.5',
                            col.align === 'center' && 'text-center',
                            col.align === 'right'  && 'text-right',
                          )}
                        />
                      </td>
                    ))}
                    {/* Remove row */}
                    <td className="border border-[var(--color-border)] px-1 py-1 w-8">
                      {rows.length > 1 && (
                        <button
                          onClick={() => removeRow(row.id)}
                          title="Remove row"
                          className="w-6 h-6 flex items-center justify-center rounded text-[var(--color-ink-muted)] hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer mx-auto opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add row */}
          <Button variant="secondary" size="sm" onClick={addRow} className="gap-1.5 text-xs h-7">
            <Plus className="w-3 h-3" />
            Add row
          </Button>
        </CardContent>
      </Card>

      {/* Output card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-ink)]">Markdown Output</span>
            <CopyButton text={markdown} />
          </div>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono text-[var(--color-ink)] bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded-lg px-4 py-3 overflow-x-auto whitespace-pre leading-relaxed select-all">
            {markdown || <span className="text-[var(--color-ink-muted)] italic">Add columns and rows to generate output</span>}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

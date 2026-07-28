import { useMemo } from 'react'
import { X, Download } from 'lucide-react'
import { Modal, Button, Alert, CopyButton } from '../../../components/ui'
import { AxisExclusions, DataRecord, PivotConfig } from '../types'
import { findSourceRecords } from '../engine/drilldown'
import { escapeCsv } from '../engine/export'

/** Enough to inspect a cell without rendering an entire dataset into a dialog. */
const DRILL_LIMIT = 200

export interface DrillTarget {
  rowPath: string[]
  colPath: string[]
  rowLabel: string
  colLabel: string
  formatted: string
}

interface DrillDownModalProps {
  open: boolean
  onClose: () => void
  target: DrillTarget
  records: DataRecord[]
  config: PivotConfig
  columns: string[]
  exclusions?: AxisExclusions
}

/** Excel's double-click drill-down: the source rows behind one cell. */
export function DrillDownModal({
  open,
  onClose,
  target,
  records,
  config,
  columns,
  exclusions,
}: DrillDownModalProps) {
  const { rows, total } = useMemo(
    () =>
      findSourceRecords(
        records,
        config,
        target.rowPath,
        target.colPath,
        DRILL_LIMIT,
        exclusions
      ),
    [records, config, target, exclusions]
  )

  const tsv = useMemo(
    () =>
      [
        columns.join('\t'),
        ...rows.map((record) =>
          columns.map((c) => String(record[c] ?? '').replace(/[\t\r\n]+/g, ' ')).join('\t')
        ),
      ].join('\n'),
    [rows, columns]
  )

  const title = [target.rowLabel, target.colLabel].filter(Boolean).join(' · ')

  return (
    <Modal open={open} onClose={onClose} title={`Source rows — ${title || 'all'}`}>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--color-ink-muted)]">
            {total.toLocaleString()} record{total === 1 ? '' : 's'} · cell value{' '}
            <span className="font-mono text-[var(--color-ink)]">{target.formatted}</span>
          </span>
          <div className="flex-1" />
          <CopyButton text={tsv} />
        </div>

        {total > rows.length && (
          <Alert variant="info" size="sm">
            Showing the first {rows.length.toLocaleString()} of{' '}
            {total.toLocaleString()} records.
          </Alert>
        )}

        {rows.length === 0 ? (
          <Alert variant="warning" size="sm">
            No source records match this cell.
          </Alert>
        ) : (
          <div className="max-h-72 overflow-auto border border-[var(--color-border)] rounded-lg">
            <table className="w-full text-[11px] font-mono border-collapse">
              <thead className="sticky top-0 bg-[var(--color-cream-dark)]">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="px-2 py-1.5 text-left font-semibold border-b border-r border-[var(--color-border)] whitespace-nowrap"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((record, i) => (
                  <tr
                    key={i}
                    className={i % 2 === 1 ? 'bg-[var(--color-cream-dark)]/30' : undefined}
                  >
                    {columns.map((column) => (
                      <td
                        key={column}
                        className="px-2 py-1 border-b border-r border-[var(--color-border)] whitespace-nowrap"
                      >
                        {record[column] === null || record[column] === undefined
                          ? ''
                          : String(record[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            Close
          </Button>
          <Button
            onClick={() => {
              // Built from the raw values, not by swapping tabs for commas:
              // any field containing a comma would otherwise split the row.
              const csv = [
                columns.map(escapeCsv).join(','),
                ...rows.map((record) =>
                  columns.map((c) => escapeCsv(String(record[c] ?? ''))).join(',')
                ),
              ].join('\r\n')

              const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `drilldown-${safeFileName(title)}.csv`
              link.click()
              URL.revokeObjectURL(url)
            }}
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Download
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** Cell labels contain slashes and spaces, neither of which belong in a filename. */
function safeFileName(label: string): string {
  const cleaned = label.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '')
  return cleaned || 'cell'
}

import { useState, useCallback } from 'react'
import { X, Check, CalendarRange, Ruler } from 'lucide-react'
import { Modal, Button, Checkbox, Alert, Input, SectionLabel } from '../../../components/ui'
import { DatePart, DATE_PART_ORDER, FieldGrouping } from '../types'
import { DATE_PART_LABELS, datePartField, binnedField } from '../engine/grouping'

interface GroupingModalProps {
  open: boolean
  onClose: () => void
  field: string
  kind: 'date' | 'number'
  grouping: FieldGrouping | undefined
  onApply: (grouping: FieldGrouping | null) => void
}

/**
 * Excel's "Group Field" dialog.
 *
 * Grouping adds virtual fields rather than replacing the source column, so a
 * single date can be broken into Years *and* Months and placed on two different
 * axes at once.
 */
export function GroupingModal({
  open,
  onClose,
  field,
  kind,
  grouping,
  onApply,
}: GroupingModalProps) {
  const [parts, setParts] = useState<Set<DatePart>>(
    () => new Set(grouping?.kind === 'date' ? grouping.parts : [])
  )
  const [binSize, setBinSize] = useState(
    () => String(grouping?.kind === 'number' ? grouping.binSize : 10)
  )

  const togglePart = useCallback((part: DatePart, checked: boolean) => {
    setParts((prev) => {
      const next = new Set(prev)
      if (checked) next.add(part)
      else next.delete(part)
      return next
    })
  }, [])

  const parsedBin = Number(binSize)
  const binValid = isFinite(parsedBin) && parsedBin > 0

  const handleApply = () => {
    if (kind === 'date') {
      onApply(
        parts.size === 0
          ? null
          : { kind: 'date', parts: DATE_PART_ORDER.filter((p) => parts.has(p)) }
      )
    } else {
      onApply(binValid ? { kind: 'number', binSize: parsedBin } : null)
    }
    onClose()
  }

  const preview =
    kind === 'date'
      ? DATE_PART_ORDER.filter((p) => parts.has(p)).map((p) => datePartField(field, p))
      : binValid
        ? [binnedField(field, parsedBin)]
        : []

  return (
    <Modal open={open} onClose={onClose} title={`Group: ${field}`}>
      <div className="space-y-3">
        {kind === 'date' ? (
          <>
            <div className="flex items-center gap-1.5">
              <CalendarRange
                className="w-3.5 h-3.5 text-[var(--color-ink-muted)]"
                aria-hidden="true"
              />
              <SectionLabel>Group dates by</SectionLabel>
            </div>
            <div
              role="group"
              aria-label={`Date parts for ${field}`}
              className="grid grid-cols-2 gap-1 border border-[var(--color-border)] rounded-lg p-1"
            >
              {DATE_PART_ORDER.map((part) => (
                <label
                  key={part}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[var(--color-cream-dark)] cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={parts.has(part)}
                    onChange={(e) => togglePart(part, e.target.checked)}
                  />
                  <span className="text-xs">{DATE_PART_LABELS[part]}</span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" aria-hidden="true" />
              <SectionLabel htmlFor="bin-size">Bucket size</SectionLabel>
            </div>
            <Input
              id="bin-size"
              type="number"
              min="0"
              step="any"
              value={binSize}
              onChange={(e) => setBinSize(e.target.value)}
            />
            {!binValid && (
              <Alert variant="error" size="sm">
                Enter a bucket size greater than zero.
              </Alert>
            )}
          </>
        )}

        {preview.length > 0 ? (
          <Alert variant="info" size="sm">
            Adds {preview.length === 1 ? 'the field' : 'the fields'}{' '}
            {preview.map((name) => (
              <code key={name} className="font-mono">
                {name}
              </code>
            ))}{' '}
            to the field list. The original column is left untouched.
          </Alert>
        ) : (
          <Alert variant="warning" size="sm">
            Nothing selected — applying will remove this grouping.
          </Alert>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={kind === 'number' && !binValid}>
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  )
}

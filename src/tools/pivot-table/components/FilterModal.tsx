import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { X, Check, Search } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Checkbox } from '../../../components/ui/Checkbox'
import { naturalSort } from '../engine/sorters'

interface FilterModalProps {
  open: boolean
  onClose: () => void
  fieldName: string
  allValues: string[]
  excludedValues: Set<string>
  onApply: (excluded: Set<string>) => void
}

export function FilterModal({
  open,
  onClose,
  fieldName,
  allValues,
  excludedValues,
  onApply,
}: FilterModalProps) {
  // Initialize with prop value - component is remounted when modal is shown
  // because parent conditionally renders based on filterModalField
  const [localExcluded, setLocalExcluded] = useState<Set<string>>(() => new Set(excludedValues))
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // Focus search input on mount
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => searchRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [open])

  // Sort values naturally
  const sortedValues = useMemo(
    () => [...allValues].sort((a, b) => naturalSort(a, b)),
    [allValues]
  )

  // Filter by search
  const filteredValues = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sortedValues
    return sortedValues.filter((v) => v.toLowerCase().includes(q))
  }, [sortedValues, search])

  const handleToggle = useCallback((value: string, checked: boolean) => {
    setLocalExcluded((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setLocalExcluded((prev) => {
      const next = new Set(prev)
      for (const v of filteredValues) {
        next.delete(v)
      }
      return next
    })
  }, [filteredValues])

  const handleSelectNone = useCallback(() => {
    setLocalExcluded((prev) => {
      const next = new Set(prev)
      for (const v of filteredValues) {
        next.add(v)
      }
      return next
    })
  }, [filteredValues])

  const handleApply = useCallback(() => {
    onApply(localExcluded)
    onClose()
  }, [onApply, onClose, localExcluded])

  const handleCancel = useCallback(() => {
    // Reset to original and close
    setLocalExcluded(new Set(excludedValues))
    setSearch('')
    onClose()
  }, [excludedValues, onClose])

  const selectedCount = allValues.length - localExcluded.size

  return (
    <Modal open={open} onClose={handleCancel} title={`Filter: ${fieldName}`}>
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search values..."
            className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleSelectAll}
            className="text-[var(--color-accent)] hover:underline"
          >
            Select All
          </button>
          <span className="text-[var(--color-ink-muted)]">|</span>
          <button
            onClick={handleSelectNone}
            className="text-[var(--color-accent)] hover:underline"
          >
            Select None
          </button>
          <span className="ml-auto text-[var(--color-ink-muted)]">
            {selectedCount} of {allValues.length} selected
          </span>
        </div>

        {/* Value list */}
        <div className="max-h-64 overflow-y-auto border border-[var(--color-border)] rounded-lg divide-y divide-[var(--color-border)]">
          {filteredValues.length === 0 ? (
            <p className="px-3 py-4 text-xs text-[var(--color-ink-muted)] text-center">
              No values match your search
            </p>
          ) : (
            filteredValues.map((value) => {
              const isChecked = !localExcluded.has(value)
              return (
                <label
                  key={value}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-cream-dark)] cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={isChecked}
                    onChange={(e) => handleToggle(value, e.target.checked)}
                  />
                  <span className="text-xs font-mono text-[var(--color-ink)] truncate">
                    {value || '(empty)'}
                  </span>
                </label>
              )
            })
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={handleCancel}>
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
          <Button onClick={handleApply}>
            <Check className="w-3.5 h-3.5" />
            Apply
          </Button>
        </div>
      </div>
    </Modal>
  )
}

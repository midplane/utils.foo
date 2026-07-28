import { CellValue, HeatmapMode } from '../types'
import { compositeKey } from './sorters'
import { RowLine, ColSlot } from './axis'

interface ValueRange {
  min: number
  max: number
}

/**
 * Precomputed heatmap shading for the rows and columns the grid will actually
 * draw. Building it from the rendered lines - rather than from the raw cell map
 * - keeps shading correct in every layout, including rows-only and
 * columns-only pivots where the visible numbers are totals.
 *
 * Subtotal and grand-total lines are excluded from the ranges; including them
 * would compress the body of the table into a single shade.
 */
export class Heatmap {
  private constructor(
    private mode: HeatmapMode,
    private ranges: Map<string, ValueRange>
  ) {}

  static build(
    cells: Map<string, CellValue>,
    lines: RowLine[],
    slots: ColSlot[],
    mode: HeatmapMode,
    numValues: number
  ): Heatmap | null {
    if (mode === 'none' || numValues === 0) return null

    const ranges = new Map<string, ValueRange>()

    const track = (groupKey: string, value: number | null | undefined) => {
      if (value === null || value === undefined || !isFinite(value)) return
      const existing = ranges.get(groupKey)
      if (!existing) {
        ranges.set(groupKey, { min: value, max: value })
      } else {
        if (value < existing.min) existing.min = value
        if (value > existing.max) existing.max = value
      }
    }

    for (const line of lines) {
      if (!line.showsValues || line.kind === 'subtotal' || line.kind === 'grand') continue

      for (const slot of slots) {
        if (slot.kind === 'subtotal' || slot.kind === 'grand') continue

        const cell = cells.get(compositeKey(line.node.flatKey, slot.node.flatKey))
        if (!cell) continue

        for (let vi = 0; vi < numValues; vi++) {
          track(groupKeyFor(mode, line.key, slot.key, vi), cell.values[vi])
        }
      }
    }

    return new Heatmap(mode, ranges)
  }

  /** Background colour for a cell, or undefined when it should not be shaded. */
  background(
    lineKey: string,
    slotKey: string,
    valueIndex: number,
    value: number | null
  ): string | undefined {
    if (value === null || !isFinite(value)) return undefined
    const range = this.ranges.get(groupKeyFor(this.mode, lineKey, slotKey, valueIndex))
    if (!range) return undefined

    const ratio =
      range.max === range.min ? 0.5 : (value - range.min) / (range.max - range.min)
    const alpha = MIN_ALPHA + ratio * (MAX_ALPHA - MIN_ALPHA)

    // color-mix keeps the heatmap tied to the theme accent, so it follows the
    // accent colour and adapts to dark mode instead of being hardcoded blue.
    return `color-mix(in srgb, var(--color-accent) ${(alpha * 100).toFixed(1)}%, transparent)`
  }
}

function groupKeyFor(
  mode: HeatmapMode,
  lineKey: string,
  slotKey: string,
  valueIndex: number
): string {
  if (mode === 'row') return `r\u001E${lineKey}\u001E${valueIndex}`
  if (mode === 'col') return `c\u001E${slotKey}\u001E${valueIndex}`
  return `f\u001E${valueIndex}`
}

// Kept low enough that cell text retains comfortable contrast in both themes.
const MIN_ALPHA = 0.08
const MAX_ALPHA = 0.55

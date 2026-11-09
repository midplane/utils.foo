// ─── Types ────────────────────────────────────────────────────────────────────

export type Alignment = 'left' | 'center' | 'right'

export interface Column {
  id: string
  header: string
  align: Alignment
}

export interface Row {
  id: string
  cells: Record<string, string>   // column id → cell value
}

// ─── Cell text ────────────────────────────────────────────────────────────────

/** An unescaped `|` ends the cell in GFM, so a literal pipe must be `\|`. */
export function escapeCell(value: string): string {
  return value.replace(/\r\n|\r|\n/g, ' ').replace(/\|/g, '\\|')
}

const WIDE = /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6\u{20000}-\u{3FFFD}]|\p{Emoji_Presentation}/u
const ZERO_WIDTH = /\p{M}|\p{Cf}/u

/**
 * Monospace column count of a string. Wide CJK characters and emoji count as
 * two columns, and combining marks as zero. `String.length` counts UTF-16
 * units, which gives the wrong value for these.
 */
export function displayWidth(s: string): number {
  let w = 0
  for (const ch of s) {
    if (ZERO_WIDTH.test(ch)) continue
    w += WIDE.test(ch) ? 2 : 1
  }
  return w
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

function pad(s: string, w: number, align: Alignment): string {
  const gap = Math.max(0, w - displayWidth(s))
  if (align === 'right')  return ' '.repeat(gap) + s
  if (align === 'center') {
    const left = Math.ceil(gap / 2)
    return ' '.repeat(left) + s + ' '.repeat(gap - left)
  }
  return s + ' '.repeat(gap)
}

export function buildMarkdown(columns: Column[], rows: Row[]): string {
  if (columns.length === 0) return ''

  const headers = columns.map((col, i) => escapeCell(col.header || `Col ${i + 1}`))
  const body = rows.map(row => columns.map(col => escapeCell(row.cells[col.id] ?? '')))

  // Column widths: max of header width and any cell width (min 3)
  const widths = columns.map((_col, i) =>
    Math.max(3, displayWidth(headers[i]!), ...body.map(cells => displayWidth(cells[i]!)))
  )

  const line = (cells: string[]) => '| ' + cells.join(' | ') + ' |'

  const headerRow = line(headers.map((h, i) => pad(h, widths[i]!, columns[i]!.align)))

  const sepRow = line(columns.map((col, i) => {
    const w = widths[i]!
    if (col.align === 'center') return ':' + '-'.repeat(w - 2) + ':'
    if (col.align === 'right')  return '-'.repeat(w - 1) + ':'
    return '-'.repeat(w)
  }))

  const dataRows = body.map(cells =>
    line(cells.map((c, i) => pad(c, widths[i]!, columns[i]!.align)))
  )

  return [headerRow, sepRow, ...dataRows].join('\n')
}

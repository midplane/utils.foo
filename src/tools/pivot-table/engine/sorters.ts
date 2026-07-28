// ─── Natural Sort ─────────────────────────────────────────────────────────────
// Handles mixed alphanumeric strings intelligently (e.g., "item2" < "item10")

const RX_CHUNKS = /(\d+)|(\D+)/g
const RX_DIGIT = /\d/

export function naturalSort(a: unknown, b: unknown): number {
  // Handle nulls/undefined first
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1

  // Handle NaN
  if (typeof a === 'number' && isNaN(a)) return -1
  if (typeof b === 'number' && isNaN(b)) return 1

  // Try numeric comparison first
  const numA = Number(a)
  const numB = Number(b)

  if (!isNaN(numA) && !isNaN(numB)) {
    if (numA < numB) return -1
    if (numA > numB) return 1
    // True numbers come before numeric strings
    if (typeof a === 'number' && typeof b !== 'number') return -1
    if (typeof b === 'number' && typeof a !== 'number') return 1
    return 0
  }

  // One is numeric, one is not
  if (!isNaN(numA)) return -1
  if (!isNaN(numB)) return 1

  // String comparison with smart digit handling
  const strA = String(a)
  const strB = String(b)

  if (strA === strB) return 0

  // Fast path: no digits in either string
  if (!RX_DIGIT.test(strA) || !RX_DIGIT.test(strB)) {
    return strA > strB ? 1 : -1
  }

  // Smart comparison: split into digit and non-digit chunks
  const chunksA = strA.match(RX_CHUNKS) || []
  const chunksB = strB.match(RX_CHUNKS) || []

  const len = Math.min(chunksA.length, chunksB.length)
  for (let i = 0; i < len; i++) {
    const chunkA = chunksA[i]!
    const chunkB = chunksB[i]!

    if (chunkA !== chunkB) {
      // Both are digit chunks - compare numerically
      if (RX_DIGIT.test(chunkA) && RX_DIGIT.test(chunkB)) {
        const diff = parseInt(chunkA, 10) - parseInt(chunkB, 10)
        if (diff !== 0) return diff
        // Same numeric value but different string (e.g., "01" vs "1")
        // Shorter string first
        if (chunkA.length !== chunkB.length) {
          return chunkA.length - chunkB.length
        }
      }
      // Otherwise lexicographic
      return chunkA > chunkB ? 1 : -1
    }
  }

  return chunksA.length - chunksB.length
}

// ─── Sort Order Comparators ───────────────────────────────────────────────────

export type Comparator<T> = (a: T, b: T) => number

export function createKeyComparator(descending: boolean): Comparator<string[]> {
  return (a, b) => {
    const len = Math.min(a.length, b.length)
    for (let i = 0; i < len; i++) {
      const cmp = naturalSort(a[i], b[i])
      if (cmp !== 0) return descending ? -cmp : cmp
    }
    return descending ? b.length - a.length : a.length - b.length
  }
}

/**
 * Sort keys by an associated numeric value.
 *
 * Uses a Schwartzian transform: `valueGetter` is invoked exactly once per key
 * rather than O(n log n) times from inside the comparator. This matters a lot
 * because value lookup can be expensive (e.g. median requires sorting).
 */
export function sortKeysByValue(
  keys: string[][],
  valueGetter: (key: string[]) => number | null,
  descending: boolean
): string[][] {
  const decorated = keys.map((key, index) => ({
    key,
    index,
    value: valueGetter(key),
  }))

  decorated.sort((a, b) => {
    const valA = a.value
    const valB = b.value

    // Nulls always sort to the end, regardless of direction
    if (valA === null && valB === null) return a.index - b.index
    if (valA === null) return 1
    if (valB === null) return -1

    if (valA === valB) return a.index - b.index
    const diff = valA - valB
    return descending ? -diff : diff
  })

  return decorated.map((d) => d.key)
}

// ─── Key Utilities ────────────────────────────────────────────────────────────

// Unit separator - a control character that cannot appear in CSV field values.
const KEY_DELIMITER = '\u001F'

// Record separator - distinct from KEY_DELIMITER so composite keys are unambiguous.
const COMPOSITE_DELIMITER = '\u001E'

export function flattenKey(key: string[]): string {
  return key.join(KEY_DELIMITER)
}

export function compositeKey(rowKey: string, colKey: string): string {
  return `${rowKey}${COMPOSITE_DELIMITER}${colKey}`
}


// ─── Null / Blank Handling ────────────────────────────────────────────────────

/**
 * Sentinel used for null, undefined and empty values. Uses a control-character
 * prefix so it can never collide with a genuine data value such as the literal
 * string "null".
 */
export const BLANK_KEY = '\u0000blank'

/** Label shown to the user wherever BLANK_KEY appears. */
export const BLANK_LABEL = '(blank)'

/**
 * Separates a sort prefix from the label in an ordered key.
 *
 * Grouped values such as month names have to sort chronologically but display
 * as "Jan", "Feb". Encoding the ordinal into the key keeps a single sort path -
 * plain natural sort - rather than threading a parallel sort value through the
 * whole axis tree.
 */
const ORDER_SEPARATOR = '\u0001'

// Encode the sort ordinal as a fixed-width, always-positive integer.
//
// Padding a signed decimal with '-' reverses the ordering of negatives (more
// dashes sorts earlier, so -60 landed after -50), and truncating discards
// fractional bin boundaries. Scaling then biasing avoids both: every key is the
// same width and strictly monotonic in `order`.
const ORDER_SCALE = 1e6
const ORDER_BIAS = 4e15 // Keeps ORDER_BIAS + order * ORDER_SCALE under 2^53.
const ORDER_WIDTH = 16

/**
 * Build a key that sorts by `order` but displays as `label`.
 * Handles negative and fractional ordinals.
 */
export function orderedKey(order: number, label: string): string {
  const scaled = Math.round(order * ORDER_SCALE) + ORDER_BIAS
  const padded = String(scaled).padStart(ORDER_WIDTH, '0')
  return `${padded}${ORDER_SEPARATOR}${label}`
}

/** Normalise a raw record value into a stable string grouping key. */
export function normalizeKey(value: unknown): string {
  if (value === null || value === undefined) return BLANK_KEY
  const str = String(value)
  return str === '' ? BLANK_KEY : str
}

/** Convert a grouping key back into something displayable. */
export function keyLabel(key: string): string {
  if (key === BLANK_KEY) return BLANK_LABEL
  const at = key.indexOf(ORDER_SEPARATOR)
  return at === -1 ? key : key.slice(at + 1)
}

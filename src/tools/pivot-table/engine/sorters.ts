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

export function createValueComparator(
  valueGetter: (key: string[]) => number | null,
  descending: boolean
): Comparator<string[]> {
  return (a, b) => {
    const valA = valueGetter(a)
    const valB = valueGetter(b)

    // Nulls go to the end
    if (valA === null && valB === null) return 0
    if (valA === null) return 1
    if (valB === null) return -1

    const diff = valA - valB
    return descending ? -diff : diff
  }
}

// ─── Key Utilities ────────────────────────────────────────────────────────────

// Use null character as delimiter (won't appear in normal data)
const KEY_DELIMITER = '\0'

export function flattenKey(key: string[]): string {
  return key.join(KEY_DELIMITER)
}

export function expandKey(flatKey: string): string[] {
  return flatKey.split(KEY_DELIMITER)
}

export function compositeKey(rowKey: string, colKey: string): string {
  return `${rowKey}|${colKey}`
}

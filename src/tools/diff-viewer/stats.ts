import { diffLines } from 'diff'

export interface DiffStats {
  added: number
  removed: number
}

/**
 * Counts added and removed lines between two texts using a real line diff.
 *
 * Comparing line N to line N positionally is not a diff — it only agrees for
 * in-place edits. Inserting a single line at the top of a file shifts every
 * subsequent line, which a positional comparison reports as the whole file
 * having been rewritten.
 */
export function countLineChanges(left: string, right: string): DiffStats {
  let added = 0
  let removed = 0
  for (const part of diffLines(left, right)) {
    if (part.added) added += part.count ?? 0
    else if (part.removed) removed += part.count ?? 0
  }
  return { added, removed }
}

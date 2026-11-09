import { diffArrays } from 'diff'

export interface DiffStats {
  added: number
  removed: number
}

// An empty text has no lines. Otherwise each line break starts a new line, the
// same as in the editor, so a final line break gives a final empty line.
const toLines = (text: string) => (text === '' ? [] : text.split(/\r\n?|\n/))

/**
 * Counts added and removed lines between two texts using a real line diff.
 *
 * Comparing line N to line N positionally is not a diff — it only agrees for
 * in-place edits. Inserting a single line at the top of a file shifts every
 * subsequent line, which a positional comparison reports as the whole file
 * having been rewritten.
 *
 * Lines are compared without their line terminators. A newline-terminated diff
 * (`diffLines`) sees "b" at end of file and "b\n" as different lines, so adding
 * one line after a last line without a newline gave +2/-1. The merge view shows
 * that edit as one added line.
 */
export function countLineChanges(left: string, right: string): DiffStats {
  let added = 0
  let removed = 0
  for (const part of diffArrays(toLines(left), toLines(right))) {
    if (part.added) added += part.count ?? part.value.length
    else if (part.removed) removed += part.count ?? part.value.length
  }
  return { added, removed }
}

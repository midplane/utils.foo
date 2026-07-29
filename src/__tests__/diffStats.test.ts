import { describe, it, expect } from 'vitest'
import { countLineChanges } from '../tools/diff-viewer/stats'

const lines = (n: number) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join('\n')

describe('countLineChanges — in-place edits', () => {
  it('identical text reports no changes', () =>
    expect(countLineChanges('a\nb\nc', 'a\nb\nc')).toEqual({ added: 0, removed: 0 }))

  it('one changed line in the middle', () =>
    expect(countLineChanges('a\nb\nc\nd\ne', 'a\nb\nCHANGED\nd\ne')).toEqual({ added: 1, removed: 1 }))
})

describe('countLineChanges — shifts (regression: positional comparison)', () => {
  // A positional line-by-line comparison shifts out of alignment here and
  // reported +11/-10 for what is a single inserted line.
  it('inserting one line at the top of a 10-line file is +1/-0', () =>
    expect(countLineChanges(lines(10), `NEW\n${lines(10)}`)).toEqual({ added: 1, removed: 0 }))

  // Previously reported +4/-5.
  it('deleting the first line is +0/-1', () =>
    expect(countLineChanges('a\nb\nc\nd\ne', 'b\nc\nd\ne')).toEqual({ added: 0, removed: 1 }))

  it('appending two lines is +2/-0', () =>
    expect(countLineChanges('a\nb\nc\n', 'a\nb\nc\nd\ne\n')).toEqual({ added: 2, removed: 0 }))
})

describe('countLineChanges — empty inputs', () => {
  it('both empty', () =>
    expect(countLineChanges('', '')).toEqual({ added: 0, removed: 0 }))

  it('adding content to an empty left side counts every line', () =>
    expect(countLineChanges('', 'a\nb\nc')).toEqual({ added: 3, removed: 0 }))

  it('clearing the right side removes every line', () =>
    expect(countLineChanges('a\nb\nc', '')).toEqual({ added: 0, removed: 3 }))
})

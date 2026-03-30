import { describe, it, expect } from 'vitest'
import {
  naturalSort,
  flattenKey,
  expandKey,
  compositeKey,
  createKeyComparator,
  createValueComparator,
} from '../engine/sorters'

describe('naturalSort', () => {
  describe('nulls', () => {
    it('sorts null before any value', () => {
      expect(naturalSort(null, 'a')).toBeLessThan(0)
      expect(naturalSort('a', null)).toBeGreaterThan(0)
    })

    it('treats null === null as equal', () => {
      expect(naturalSort(null, null)).toBe(0)
    })
  })

  describe('pure numbers', () => {
    it('sorts numbers numerically', () => {
      expect(naturalSort(2, 10)).toBeLessThan(0)
      expect(naturalSort(10, 2)).toBeGreaterThan(0)
      expect(naturalSort(5, 5)).toBe(0)
    })

    it('sorts numeric strings numerically', () => {
      expect(naturalSort('2', '10')).toBeLessThan(0)
      expect(naturalSort('10', '2')).toBeGreaterThan(0)
    })

    it('places numbers before non-numeric strings', () => {
      expect(naturalSort(1, 'abc')).toBeLessThan(0)
      expect(naturalSort('abc', 1)).toBeGreaterThan(0)
    })
  })

  describe('alphanumeric (natural order)', () => {
    it('sorts item2 before item10', () => {
      expect(naturalSort('item2', 'item10')).toBeLessThan(0)
      expect(naturalSort('item10', 'item2')).toBeGreaterThan(0)
    })

    it('handles version strings correctly', () => {
      expect(naturalSort('v1.2', 'v1.10')).toBeLessThan(0)
      expect(naturalSort('v1.10', 'v1.2')).toBeGreaterThan(0)
    })

    it('handles file names', () => {
      const files = ['file10', 'file2', 'file1']
      const sorted = [...files].sort(naturalSort)
      expect(sorted).toEqual(['file1', 'file2', 'file10'])
    })
  })

  describe('pure strings (no digits)', () => {
    it('sorts lexicographically', () => {
      expect(naturalSort('apple', 'banana')).toBeLessThan(0)
      expect(naturalSort('banana', 'apple')).toBeGreaterThan(0)
      expect(naturalSort('apple', 'apple')).toBe(0)
    })
  })

  describe('NaN handling', () => {
    it('sorts NaN before other numbers', () => {
      expect(naturalSort(NaN, 1)).toBeLessThan(0)
      expect(naturalSort(1, NaN)).toBeGreaterThan(0)
    })
  })
})

describe('key utilities', () => {
  it('flattenKey joins parts with null delimiter', () => {
    const key = ['North', 'Q1', '2024']
    const flat = flattenKey(key)
    expect(flat).toBe('North\x00Q1\x002024')
  })

  it('expandKey splits on null delimiter', () => {
    expect(expandKey('North\x00Q1\x002024')).toEqual(['North', 'Q1', '2024'])
  })

  it('flattenKey / expandKey round-trip', () => {
    const key = ['Region A', 'Sub B', '2020']
    expect(expandKey(flattenKey(key))).toEqual(key)
  })

  it('handles single-element key', () => {
    expect(expandKey(flattenKey(['only']))).toEqual(['only'])
  })

  it('compositeKey separates row and col with pipe', () => {
    expect(compositeKey('row', 'col')).toBe('row|col')
  })

  it('compositeKey works with empty strings', () => {
    expect(compositeKey('', '')).toBe('|')
  })
})

describe('createKeyComparator', () => {
  it('sorts single-element keys ascending', () => {
    const cmp = createKeyComparator(false)
    const keys = [['banana'], ['apple'], ['cherry']]
    const sorted = [...keys].sort(cmp)
    expect(sorted.map((k) => k[0])).toEqual(['apple', 'banana', 'cherry'])
  })

  it('sorts single-element keys descending', () => {
    const cmp = createKeyComparator(true)
    const keys = [['banana'], ['apple'], ['cherry']]
    const sorted = [...keys].sort(cmp)
    expect(sorted.map((k) => k[0])).toEqual(['cherry', 'banana', 'apple'])
  })

  it('sorts multi-element keys by first element, then second', () => {
    const cmp = createKeyComparator(false)
    const keys = [
      ['B', '2'],
      ['A', '10'],
      ['A', '2'],
    ]
    const sorted = [...keys].sort(cmp)
    expect(sorted).toEqual([['A', '2'], ['A', '10'], ['B', '2']])
  })

  it('uses natural sort (item2 < item10)', () => {
    const cmp = createKeyComparator(false)
    expect(cmp([['item10']][0]!, [['item2']][0]!)).toBeGreaterThan(0)
  })
})

describe('createValueComparator', () => {
  const makeGetter = (map: Record<string, number | null>) =>
    (key: string[]) => map[key[0]!] ?? null

  it('sorts ascending', () => {
    const getter = makeGetter({ a: 10, b: 5, c: 20 })
    const cmp = createValueComparator(getter, false)
    const keys = [['a'], ['b'], ['c']]
    const sorted = [...keys].sort(cmp)
    expect(sorted.map((k) => k[0])).toEqual(['b', 'a', 'c'])
  })

  it('sorts descending', () => {
    const getter = makeGetter({ a: 10, b: 5, c: 20 })
    const cmp = createValueComparator(getter, true)
    const keys = [['a'], ['b'], ['c']]
    const sorted = [...keys].sort(cmp)
    expect(sorted.map((k) => k[0])).toEqual(['c', 'a', 'b'])
  })

  it('places nulls at the end regardless of sort direction', () => {
    const getter = makeGetter({ a: 10, b: null, c: 5 })
    const cmpAsc = createValueComparator(getter, false)
    const cmpDesc = createValueComparator(getter, true)
    const keys = [['a'], ['b'], ['c']]

    const sortedAsc = [...keys].sort(cmpAsc).map((k) => k[0])
    const sortedDesc = [...keys].sort(cmpDesc).map((k) => k[0])

    expect(sortedAsc[2]).toBe('b') // null at end
    expect(sortedDesc[2]).toBe('b') // null at end
  })

  it('treats null === null as equal', () => {
    const getter = makeGetter({ a: null, b: null })
    const cmp = createValueComparator(getter, false)
    expect(cmp(['a'], ['b'])).toBe(0)
  })
})

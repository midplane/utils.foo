import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CurrencyCodesTool from '../tools/currency-codes'

const search = (value: string) =>
  fireEvent.change(screen.getByRole('searchbox'), { target: { value } })

const bodyRows = () => screen.queryAllByRole('row').slice(1)

const rowCells = () =>
  bodyRows().map((row) => Array.from(row.querySelectorAll('td')).map((td) => td.textContent ?? ''))

const codes = () => rowCells().map((cells) => cells[0])

describe('currency codes', () => {
  it('has no duplicate alphabetic or numeric codes', () => {
    render(<CurrencyCodesTool />)
    const cells = rowCells()
    const alpha = cells.map((c) => c[0])
    const numeric = cells.map((c) => c[1])

    expect(new Set(alpha).size).toBe(alpha.length)
    expect(new Set(numeric).size).toBe(numeric.length)
    for (const code of alpha) expect(code).toMatch(/^[A-Z]{3}$/)
    for (const num of numeric) expect(num).toMatch(/^\d{3}$/)
  })

  it('does not list currencies that ISO 4217 moved to the historic list', () => {
    render(<CurrencyCodesTool />)
    const listed = codes()

    // BGN: amendment 180 (2026-01-01). ZWL: amendment 177 (2024-09-01).
    // ANG: amendment 176 (2025-03-31).
    for (const code of ['BGN', 'ZWL', 'ANG']) expect(listed).not.toContain(code)
  })

  it('lists the replacement currencies with the correct numeric codes', () => {
    render(<CurrencyCodesTool />)
    const byCode = new Map(rowCells().map((c) => [c[0], c]))

    expect(byCode.get('ZWG')?.[1]).toBe('924')
    expect(byCode.get('XCG')?.[1]).toBe('532')
  })

  it('counts Bulgaria in the euro area', () => {
    render(<CurrencyCodesTool />)
    search('EUR')

    const eur = rowCells().find((c) => c[0] === 'EUR')
    expect(eur?.[4]).toMatch(/21 countries/)
  })

  it('finds names with diacritics from plain ASCII queries', () => {
    render(<CurrencyCodesTool />)

    const cases: [string, string][] = [
      ['zloty', 'PLN'],
      ['colon', 'CRC'],
      ['cordoba', 'NIO'],
      ['guarani', 'PYG'],
      ['dong', 'VND'],
      ['sao tome', 'STN'],
      ['togrog', 'MNT'],
      ['tala', 'WST'],
    ]
    for (const [query, code] of cases) {
      search(query)
      expect(codes(), query).toContain(code)
    }
  })

  it('still matches a query that has diacritics', () => {
    render(<CurrencyCodesTool />)
    search('Złoty')
    expect(codes()).toEqual(['PLN'])
  })

  it('shows the full list for a whitespace-only query', () => {
    render(<CurrencyCodesTool />)
    const total = bodyRows().length
    search('   ')
    expect(bodyRows().length).toBe(total)
  })
})

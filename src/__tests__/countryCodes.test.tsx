import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CountryCodesTool from '../tools/country-codes'

const search = (value: string) =>
  fireEvent.change(screen.getByRole('searchbox'), { target: { value } })

const rowCells = () =>
  screen
    .queryAllByRole('row')
    .slice(1)
    .map((row) => Array.from(row.querySelectorAll('td')).map((td) => td.textContent ?? ''))

const names = () => rowCells().map((c) => c[0])

describe('country codes', () => {
  it('has no duplicate codes and every code has the correct shape', () => {
    render(<CountryCodesTool />)
    const cells = rowCells()
    const alpha2 = cells.map((c) => c[1])
    const alpha3 = cells.map((c) => c[2])
    const numeric = cells.map((c) => c[3]).filter((n) => n !== '—')

    expect(new Set(alpha2).size).toBe(alpha2.length)
    expect(new Set(alpha3).size).toBe(alpha3.length)
    expect(new Set(numeric).size).toBe(numeric.length)
    for (const code of alpha2) expect(code).toMatch(/^[A-Z]{2}$/)
    for (const code of alpha3) expect(code).toMatch(/^[A-Z]{3}$/)
    for (const num of numeric) expect(num).toMatch(/^\d{3}$/)
  })

  it('lists all 249 ISO 3166-1 entries plus Kosovo', () => {
    render(<CountryCodesTool />)
    expect(rowCells()).toHaveLength(250)

    const alpha2 = new Set(rowCells().map((c) => c[1]))
    for (const code of ['VA', 'PR', 'GU', 'IM', 'JE', 'GG', 'BM', 'KY', 'EH', 'AX', 'XK', 'NA', 'GB']) {
      expect(alpha2).toContain(code)
    }
  })

  it('shows the correct data for rows that were wrong or missing', () => {
    render(<CountryCodesTool />)
    const byAlpha2 = new Map(rowCells().map((c) => [c[1], c]))

    expect(byAlpha2.get('SS')).toEqual(['South Sudan', 'SS', 'SSD', '728', '+211'])
    expect(byAlpha2.get('VA')).toEqual(['Vatican City (Holy See)', 'VA', 'VAT', '336', '+39'])
    expect(byAlpha2.get('NA')).toEqual(['Namibia', 'NA', 'NAM', '516', '+264'])
    expect(byAlpha2.get('AF')?.[3]).toBe('004')
  })

  it('finds names with diacritics when the query has none', () => {
    render(<CountryCodesTool />)

    search('cote')
    expect(names()).toContain("Côte d'Ivoire")

    search('curacao')
    expect(names()).toEqual(['Curaçao'])

    search('Sao Tome')
    expect(names()).toEqual(['São Tomé and Príncipe'])
  })

  it('finds a country by dial code with or without the plus sign', () => {
    render(<CountryCodesTool />)

    search('+211')
    expect(names()).toEqual(['South Sudan'])

    search(' 211 ')
    expect(names()).toContain('South Sudan')
  })
})

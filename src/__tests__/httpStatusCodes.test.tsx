import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HttpStatusCodesTool from '../tools/http-status-codes'

const search = (value: string) =>
  fireEvent.change(screen.getByLabelText('Search'), { target: { value } })

const cardText = (code: number) => {
  const codeEl = screen.getByText(String(code), { selector: 'span' })
  return codeEl.closest('div')?.parentElement?.textContent ?? ''
}

describe('http status codes', () => {
  it('does not call 418 an official status code', () => {
    render(<HttpStatusCodesTool />)
    search('418')

    const text = cardText(418)
    expect(text).not.toMatch(/official/i)
    expect(text).toMatch(/unused/i)
  })

  it('still finds 418 with the query "teapot"', () => {
    render(<HttpStatusCodesTool />)
    search('teapot')

    expect(screen.getByText('1 result')).toBeTruthy()
    expect(cardText(418)).toMatch(/teapot/i)
  })

  it('marks 510 as obsolete', () => {
    render(<HttpStatusCodesTool />)
    search('510')

    expect(cardText(510)).toMatch(/obsolete/i)
  })

  it('describes 208 as a part of the same multistatus response', () => {
    render(<HttpStatusCodesTool />)
    search('208')

    const text = cardText(208)
    expect(text).toMatch(/multistatus response/i)
    expect(text).not.toMatch(/previous reply/i)
  })

  it('shows the full list for a whitespace-only query', () => {
    render(<HttpStatusCodesTool />)
    search('   ')

    expect(screen.queryByText(/No results/)).toBeNull()
    expect(screen.getByText('Server Error')).toBeTruthy()
  })
})

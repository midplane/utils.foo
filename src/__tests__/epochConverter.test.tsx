import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EpochConverter from '../tools/epoch-converter'

const timestampInput = () => screen.getByLabelText('Unix Timestamp') as HTMLInputElement
const dateInput = () => screen.getByLabelText('Human Date') as HTMLInputElement

describe('epoch converter', () => {
  it('rejects timestamps with trailing non-numeric characters', () => {
    render(<EpochConverter />)

    fireEvent.change(timestampInput(), { target: { value: '1700000000xyz' } })

    expect(dateInput().value).toBe('')
    expect(screen.getByRole('alert').textContent).toMatch(/digits only/)
    expect(timestampInput().getAttribute('aria-invalid')).toBe('true')
  })

  it('does not throw when UTC is selected for an out-of-range timestamp', () => {
    render(<EpochConverter />)
    fireEvent.change(timestampInput(), { target: { value: '9999999999999999' } })

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'UTC' }))).not.toThrow()
    expect(dateInput().value).toBe('')
    expect(screen.getByRole('alert').textContent).toMatch(/Too many digits/)
  })

  it('shows errors in an alert, not in the other field', () => {
    render(<EpochConverter />)
    fireEvent.change(dateInput(), { target: { value: 'not a date' } })

    expect(timestampInput().value).toBe('')
    expect(dateInput().value).toBe('not a date')
    expect(screen.getByRole('alert').textContent).toMatch(/Cannot read this date/)
  })

  it('reads a date without an offset in the selected zone', () => {
    render(<EpochConverter />)
    fireEvent.click(screen.getByRole('button', { name: 'UTC' }))
    fireEvent.change(dateInput(), { target: { value: '2023-11-13T12:00:00' } })

    expect(timestampInput().value).toBe('1699876800')
  })

  it('keeps a milliseconds timestamp in milliseconds after a date edit', () => {
    render(<EpochConverter />)
    fireEvent.click(screen.getByRole('button', { name: 'UTC' }))
    fireEvent.change(timestampInput(), { target: { value: '1699900800123' } })
    expect(dateInput().value).toBe('2023-11-13T18:40:00.123Z')

    fireEvent.change(dateInput(), { target: { value: '2023-11-13T18:40:00.456Z' } })
    expect(timestampInput().value).toBe('1699900800456')
  })

  it('keeps milliseconds when the zone changes', () => {
    render(<EpochConverter />)
    fireEvent.change(timestampInput(), { target: { value: '1699900800123' } })
    fireEvent.click(screen.getByRole('button', { name: 'UTC' }))

    expect(dateInput().value).toBe('2023-11-13T18:40:00.123Z')
  })
})

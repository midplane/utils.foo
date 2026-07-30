import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataInput } from '../components/ui/DataInput'

const SAMPLES = [{ id: 's', label: 'Sample', description: 'A sample' }]

function setup(onChange = vi.fn()) {
  render(
    <DataInput
      value=""
      onChange={onChange}
      error=""
      warning=""
      samples={SAMPLES}
      onLoadSample={() => {}}
      recordCount={0}
      fieldCount={0}
      sourceLabel=""
      inputId="test-csv"
    />
  )
  return onChange
}

/** A DataTransfer stub: jsdom does not construct real ones. */
const transfer = (files: File[]) => ({
  files,
  items: files.map((f) => ({ kind: 'file', type: f.type, getAsFile: () => f })),
  types: files.length ? ['Files'] : [],
  dropEffect: 'none',
})

const csv = (name = 'data.csv') =>
  new File(['Month,Revenue\nJan,100'], name, { type: 'text/csv' })

describe('DataInput drag and drop', () => {
  it('reads a dropped CSV', async () => {
    const onChange = setup()
    const zone = screen.getByText(/Upload file/).closest('div.relative')!

    fireEvent.drop(zone, { dataTransfer: transfer([csv()]) })

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('Month,Revenue\nJan,100'))
  })

  it('highlights while a file is over the card, and stops on leave', () => {
    setup()
    const zone = screen.getByText(/Upload file/).closest('div.relative')!

    fireEvent.dragEnter(zone, { dataTransfer: transfer([csv()]) })
    expect(screen.getByText(/Drop a CSV or TSV file/)).toBeDefined()

    fireEvent.dragLeave(zone)
    expect(screen.queryByText(/Drop a CSV or TSV file/)).toBeNull()
  })

  it('stays highlighted when the pointer crosses a child element', () => {
    // dragenter/dragleave bubble from children too; a plain boolean flickers.
    setup()
    const zone = screen.getByText(/Upload file/).closest('div.relative')!

    fireEvent.dragEnter(zone, { dataTransfer: transfer([csv()]) })
    fireEvent.dragEnter(zone, { dataTransfer: transfer([csv()]) }) // onto a child
    fireEvent.dragLeave(zone) // off that child, still inside the card
    expect(screen.queryByText(/Drop a CSV or TSV file/)).not.toBeNull()

    fireEvent.dragLeave(zone)
    expect(screen.queryByText(/Drop a CSV or TSV file/)).toBeNull()
  })

  it('rejects a file that is not delimited text', async () => {
    const onChange = setup()
    const zone = screen.getByText(/Upload file/).closest('div.relative')!

    fireEvent.drop(zone, {
      dataTransfer: transfer([new File(['x'], 'photo.png', { type: 'image/png' })]),
    })

    await waitFor(() => expect(screen.getByText(/is not a CSV, TSV or text file/)).toBeDefined())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('accepts .tsv and .txt, whose MIME type browsers report inconsistently', async () => {
    for (const name of ['data.tsv', 'data.txt']) {
      const onChange = setup()
      const zone = screen.getAllByText(/Upload file/).at(-1)!.closest('div.relative')!
      fireEvent.drop(zone, { dataTransfer: transfer([new File(['a\tb'], name, { type: '' })]) })
      await waitFor(() => expect(onChange).toHaveBeenCalled())
    }
  })

  it('ignores a drop with no file', () => {
    const onChange = setup()
    const zone = screen.getByText(/Upload file/).closest('div.relative')!
    fireEvent.drop(zone, { dataTransfer: transfer([]) })
    expect(onChange).not.toHaveBeenCalled()
  })
})

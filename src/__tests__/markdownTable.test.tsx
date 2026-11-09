import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MarkdownTableTool from '../tools/markdown-table'
import { buildMarkdown, displayWidth, escapeCell, type Column, type Row } from '../tools/markdown-table/markdown'

const col = (id: string, header: string, align: Column['align'] = 'left'): Column => ({ id, header, align })
const row = (cells: Record<string, string>): Row => ({ id: Math.random().toString(), cells })

describe('escapeCell', () => {
  it('escapes pipes so that they do not split the cell', () => {
    expect(escapeCell('a|b')).toBe('a\\|b')
  })

  it('replaces line breaks, which would end the row', () => {
    expect(escapeCell('a\nb\r\nc')).toBe('a b c')
  })
})

describe('displayWidth', () => {
  it('counts wide CJK characters and emoji as two columns', () => {
    expect(displayWidth('abc')).toBe(3)
    expect(displayWidth('日本')).toBe(4)
    expect(displayWidth('👍')).toBe(2)
  })

  it('counts a base character with a combining mark as one column', () => {
    expect(displayWidth('e\u0301')).toBe(1)
  })
})

describe('buildMarkdown', () => {
  it('returns an empty string with no columns', () => {
    expect(buildMarkdown([], [])).toBe('')
  })

  it('writes header and separator rows when there are no data rows', () => {
    expect(buildMarkdown([col('a', 'Name')], [])).toBe('| Name |\n| ---- |')
  })

  it('writes the alignment markers', () => {
    const out = buildMarkdown(
      [col('a', 'L'), col('b', 'C', 'center'), col('c', 'R', 'right')],
      [row({ a: 'x', b: 'y', c: 'z' })],
    )
    expect(out).toBe([
      '| L   |  C  |   R |',
      '| --- | :-: | --: |',
      '| x   |  y  |   z |',
    ].join('\n'))
  })

  it('escapes pipes in headers and cells', () => {
    const out = buildMarkdown([col('a', 'a|b')], [row({ a: 'x|y' })])
    expect(out).toBe([
      '| a\\|b |',
      '| ---- |',
      '| x\\|y |',
    ].join('\n'))
  })

  it('sizes a column for the "Col N" placeholder of an empty header', () => {
    const out = buildMarkdown([col('a', ''), col('b', 'B')], [row({ a: 'x', b: 'y' })])
    expect(out).toBe([
      '| Col 1 | B   |',
      '| ----- | --- |',
      '| x     | y   |',
    ].join('\n'))
  })

  it('pads by display width for wide characters', () => {
    const out = buildMarkdown([col('a', 'A')], [row({ a: '日本語' }), row({ a: 'abc' })])
    expect(out).toBe([
      '| A      |',
      '| ------ |',
      '| 日本語 |',
      '| abc    |',
    ].join('\n'))
  })

  it('treats a missing cell as empty', () => {
    const out = buildMarkdown([col('a', 'A'), col('b', 'B')], [row({ a: 'x' })])
    expect(out.split('\n')[2]).toBe('| x   |     |')
  })
})

describe('MarkdownTableTool', () => {
  it('shows the sample data in the editor and in the output', () => {
    const { container } = render(<MarkdownTableTool />)
    expect(screen.getByDisplayValue('gfm')).toBeTruthy()
    expect(container.querySelector('pre')?.textContent).toBe([
      '| Name   | Type    | Default |',
      '| ------ | ------- | :-----: |',
      '| gfm    | boolean |   true  |',
      '| breaks | boolean |  false  |',
      '| silent | boolean |  false  |',
    ].join('\n'))
  })

  it('escapes a pipe typed into a cell', () => {
    const { container } = render(<MarkdownTableTool />)
    fireEvent.change(screen.getByDisplayValue('gfm'), { target: { value: 'a|b' } })
    expect(container.querySelector('pre')?.textContent).toContain('| a\\|b ')
  })
})

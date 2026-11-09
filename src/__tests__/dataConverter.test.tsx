import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
import DataConverterTool from '../tools/data-converter'
import { convert, coerceScalar } from '../tools/data-converter/convert'

function json(id: Parameters<typeof convert>[0], input: string): unknown {
  const { output, error } = convert(id, input)
  expect(error).toBeUndefined()
  return JSON.parse(output)
}

describe('coerceScalar', () => {
  it('changes only values that print back to the same text', () => {
    expect(coerceScalar('42')).toBe(42)
    expect(coerceScalar('-3.5')).toBe(-3.5)
    expect(coerceScalar('true')).toBe(true)
    expect(coerceScalar('02134')).toBe('02134')
    expect(coerceScalar('1.10')).toBe('1.10')
    expect(coerceScalar('0x1F')).toBe('0x1F')
    expect(coerceScalar('1e3')).toBe('1e3')
    expect(coerceScalar('12345678901234567890')).toBe('12345678901234567890')
    expect(coerceScalar('')).toBe('')
  })
})

describe('CSV → JSON', () => {
  it('converts a CSV with one column', () => {
    expect(json('csv-json', 'name\nalice\nbob')).toEqual([{ name: 'alice' }, { name: 'bob' }])
  })

  it('keeps leading zeros, large integers and dates as text', () => {
    expect(json('csv-json', 'zip,id,at,n,ok,empty\n02134,12345678901234567890,2024-01-01T10:00:00+05:00,7,TRUE,'))
      .toEqual([{ zip: '02134', id: '12345678901234567890', at: '2024-01-01T10:00:00+05:00', n: 7, ok: true, empty: null }])
  })

  it('reads quoted fields with commas, quotes, line breaks and CRLF', () => {
    expect(json('csv-json', 'a,b\r\n"x, ""y""\nz",2\r\n')).toEqual([{ a: 'x, "y"\nz', b: 2 }])
  })

  it('gives the data row of a field count error', () => {
    expect(convert('csv-json', 'a,b\n1,2\n3').error).toBe('Data row 2: Too few fields: expected 2 fields but parsed 1')
  })
})

describe('JSON → CSV', () => {
  it('writes nested values as JSON', () => {
    expect(convert('json-csv', '[{"a":{"b":1},"c":[1,2]}]').output).toBe('a,c\r\n"{""b"":1}","[1,2]"')
  })

  it('uses the keys of all rows', () => {
    expect(convert('json-csv', '[{"a":1},{"a":2,"b":3}]').output).toBe('a,b\r\n1,\r\n2,3')
  })

  it('round-trips through CSV → JSON', () => {
    const csv = convert('json-csv', '[{"zip":"02134","v":"1.10","n":5}]').output
    expect(json('csv-json', csv)).toEqual([{ zip: '02134', v: '1.10', n: 5 }])
  })

  it('reports an array of scalars', () => {
    expect(convert('json-csv', '[1,2]').error).toMatch(/array of objects/)
  })
})

describe('YAML → JSON', () => {
  it('keeps dates as written', () => {
    expect(json('yaml-json', 'd: 2024-01-01\nt: 2024-01-01 10:00:00 +05:00\nn: no')).toEqual({
      d: '2024-01-01',
      t: '2024-01-01 10:00:00 +05:00',
      n: 'no',
    })
  })

  it('still applies merge keys', () => {
    expect(json('yaml-json', 'base: &b\n  x: 1\nchild:\n  <<: *b\n  y: 2')).toEqual({ base: { x: 1 }, child: { x: 1, y: 2 } })
  })
})

describe('JSON → TOML', () => {
  it('reports a null value and does not drop the key', () => {
    expect(convert('json-toml', '{"a":1,"b":{"c":null}}').error).toBe('TOML has no null value. Remove or replace the null at "b.c".')
  })
})

describe('XML → JSON', () => {
  it('ignores the XML declaration and unwraps the root', () => {
    expect(json('xml-json', '<?xml version="1.0" encoding="UTF-8"?>\n<root><a>1</a><b>true</b></root>')).toEqual({ a: 1, b: true })
  })

  it('keeps leading zeros, versions and hex as text', () => {
    expect(json('xml-json', '<r id="007"><zip>02134</zip><v>1.10</v><h>0x1F</h></r>'))
      .toEqual({ zip: '02134', v: '1.10', h: '0x1F', '@_id': '007' })
  })

  it('reports malformed XML with its line', () => {
    expect(convert('xml-json', '<a>\n<b>\n</a>').error).toMatch(/^Line 3, column 1: /)
  })
})

describe('JSON → XML', () => {
  it('writes "@_" keys as attributes, so XML → JSON → XML round-trips', () => {
    const asJson = convert('xml-json', '<r id="5"><a>x</a></r>').output
    expect(convert('json-xml', asJson).output).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<root id="5">\n  <a>x</a>\n</root>')
  })

  it('writes a top-level array under one root', () => {
    expect(convert('json-xml', '[1,2]').output).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <item>1</item>\n  <item>2</item>\n</root>')
  })

  it('reports keys that are not valid XML names', () => {
    expect(convert('json-xml', '{"first name":1}').error).toMatch(/valid XML names/)
  })
})

describe('DataConverterTool', () => {
  it('keeps the input when the source format does not change', async () => {
    const { container } = render(<DataConverterTool />)
    const editor = container.querySelector('.cm-editor') as HTMLElement
    const view = EditorView.findFromDOM(editor)!
    act(() => { view.dispatch({ changes: { from: 0, insert: '{"mine":1}' } }) })

    fireEvent.click(screen.getByText('JSON → TOML'))
    expect(view.state.doc.toString()).toBe('{"mine":1}')

    fireEvent.click(screen.getByText('YAML → JSON'))
    expect(view.state.doc.toString()).toMatch(/^name: utils\.foo/)
  })
})

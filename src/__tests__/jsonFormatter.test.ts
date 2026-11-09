import { describe, expect, it } from 'vitest'
import { minifyJson, prettifyJson } from '../tools/json-formatter/format'

describe('json formatter', () => {
  it('matches JSON.stringify output for ordinary JSON', () => {
    const src = '{ "a": [1, 2, {"b": null}], "c": {}, "d": [ ], "e": "x", "f": true }'
    const value = JSON.parse(src)
    expect(prettifyJson(src)).toBe(JSON.stringify(value, null, 2))
    expect(minifyJson(src)).toBe(JSON.stringify(value))
  })

  it('keeps numbers exactly as written', () => {
    const src = '[12345678901234567890, 1.0, -0, 1e400, 1E5, 0.10]'
    expect(minifyJson(src)).toBe('[12345678901234567890,1.0,-0,1e400,1E5,0.10]')
    expect(prettifyJson(src)).toContain('  12345678901234567890,\n')
  })

  it('keeps duplicate keys and __proto__ keys', () => {
    expect(minifyJson('{"a": 1, "a": 2, "__proto__": {"x": 1}}')).toBe('{"a":1,"a":2,"__proto__":{"x":1}}')
  })

  it('does not change whitespace, brackets or escapes inside strings', () => {
    const src = '{"k: ,{": "a , [ } \\" \\\\", "u": "\\u0041\\n"}'
    expect(minifyJson(src)).toBe('{"k: ,{":"a , [ } \\" \\\\","u":"\\u0041\\n"}')
    expect(JSON.parse(prettifyJson(src))).toEqual(JSON.parse(src))
  })

  it('handles CRLF, tabs and top-level scalars', () => {
    expect(minifyJson('{\r\n\t"a":\t1\r\n}')).toBe('{"a":1}')
    expect(prettifyJson(' "x" ')).toBe('"x"')
    expect(prettifyJson('[[], {}]')).toBe('[\n  [],\n  {}\n]')
  })

  it('supports a tab indent', () => {
    expect(prettifyJson('{"a":[1]}', '\t')).toBe('{\n\t"a": [\n\t\t1\n\t]\n}')
  })

  it('throws on invalid JSON', () => {
    expect(() => minifyJson('{"a":}')).toThrow()
    expect(() => prettifyJson('[1,]')).toThrow()
  })
})

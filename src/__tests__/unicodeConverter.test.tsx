import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import UnicodeConverter from '../tools/unicode-converter'
import { getCharInfo, parseInput } from '../tools/unicode-converter/unicode'

const hexOf = (input: string) => parseInput(input, 'text').map(c => getCharInfo(c).hex)

describe('unicode parseInput (text)', () => {
  it('shows each code point of a combining sequence', () => {
    expect(hexOf('e\u0301')).toEqual(['U+0065', 'U+0301'])
  })

  it('shows each code point of a ZWJ emoji sequence and a flag', () => {
    expect(hexOf('👨‍👩‍👧')).toEqual(['U+1F468', 'U+200D', 'U+1F469', 'U+200D', 'U+1F467'])
    expect(hexOf('🇮🇳')).toEqual(['U+1F1EE', 'U+1F1F3'])
  })

  it('keeps a surrogate pair as one astral code point', () => {
    const [info] = parseInput('😀', 'text').map(getCharInfo)
    expect(info).toMatchObject({ hex: 'U+1F600', decimal: '128512', utf8: 'F0 9F 98 80', utf16: 'D83D DE00' })
  })

  it('round-trips text through code points', () => {
    const text = 'Caf\u00e9 e\u0301 👨‍👩‍👧 🇮🇳'
    const codepoints = hexOf(text).join(' ')
    expect(parseInput(codepoints, 'codepoint').join('')).toBe(text)
  })

  it('does not report U+FFFD bytes as the UTF-8 of a lone surrogate', () => {
    const info = getCharInfo('\uD800')
    expect(info.hex).toBe('U+D800')
    expect(info.utf8).not.toBe('EF BF BD')
  })
})

describe('unicode parseInput (numeric modes)', () => {
  it('parses valid values', () => {
    expect(parseInput('U+0048 u+0065,U+1F600', 'codepoint')).toEqual(['H', 'e', '😀'])
    expect(parseInput('U+0048U+0065', 'codepoint')).toEqual(['H', 'e'])
    expect(parseInput('0x48 0X65 1F600', 'hex')).toEqual(['H', 'e', '😀'])
    expect(parseInput('72, 101 128512', 'decimal')).toEqual(['H', 'e', '😀'])
  })

  it('rejects tokens that are not valid for the mode', () => {
    expect(() => parseInput('hello', 'hex')).toThrow(/"hello" is not a valid hex value/)
    expect(() => parseInput('0xZZ', 'hex')).toThrow(/not a valid hex value/)
    expect(() => parseInput('-5', 'decimal')).toThrow(/not a valid decimal value/)
    expect(() => parseInput('1.5', 'decimal')).toThrow(/not a valid decimal value/)
    expect(() => parseInput('0048', 'codepoint')).toThrow(/Use the format U\+XXXX/)
  })

  it('rejects out-of-range and surrogate code points', () => {
    expect(() => parseInput('U+110000', 'codepoint')).toThrow(/out of range/)
    expect(() => parseInput('1114112', 'decimal')).toThrow(/out of range/)
    expect(() => parseInput('FFFFFFFFFFFFFFFFFFFFFFFF', 'hex')).toThrow(/out of range/)
    expect(() => parseInput('D800', 'hex')).toThrow(/surrogate/)
    expect(parseInput('10FFFF', 'hex')).toEqual(['\u{10FFFF}'])
  })
})

describe('unicode converter component', () => {
  const input = () => screen.getByLabelText(/Input/) as HTMLInputElement

  it('shows details for whitespace-only text', () => {
    render(<UnicodeConverter />)
    fireEvent.change(input(), { target: { value: '\u00a0' } })
    expect(screen.getAllByText('U+00A0').length).toBeGreaterThan(0)
  })

  it('shows a specific error for an invalid token', () => {
    render(<UnicodeConverter />)
    fireEvent.click(screen.getByRole('button', { name: 'decimal' }))
    fireEvent.change(input(), { target: { value: '72 1.5' } })
    expect(screen.getByRole('alert').textContent).toMatch(/"1\.5" is not a valid decimal value/)
  })
})

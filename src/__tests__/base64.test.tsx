import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Base64Tool from '../tools/base64'
import { decodeBase64, encodeBase64, INVALID_BASE64, LONE_SURROGATE, NOT_UTF8 } from '../tools/base64/logic'

describe('encodeBase64', () => {
  it('encodes ASCII and UTF-8 text', () => {
    expect(encodeBase64('The answer is 42')).toBe('VGhlIGFuc3dlciBpcyA0Mg==')
    expect(encodeBase64('héllo 👋')).toBe('aMOpbGxvIPCfkYs=')
  })

  it('encodes whitespace-only text', () => {
    expect(encodeBase64(' ')).toBe('IA==')
    expect(encodeBase64('\n')).toBe('Cg==')
  })

  it('reports a lone surrogate', () => {
    expect(() => encodeBase64('a\ud800b')).toThrow(LONE_SURROGATE)
  })
})

describe('decodeBase64', () => {
  it('round-trips UTF-8 text', () => {
    const text = 'héllo 👋 世界'
    expect(decodeBase64(encodeBase64(text))).toBe(text)
  })

  it('accepts the URL-safe alphabet without padding', () => {
    // Standard form of the same bytes is "PDw/Pz8+Pg==".
    expect(decodeBase64('PDw_Pz8-Pg')).toBe('<<???>>')
    expect(decodeBase64('PDw/Pz8+Pg==')).toBe('<<???>>')
  })

  it('ignores line breaks inside the input', () => {
    expect(decodeBase64('aGVs\nbG8=')).toBe('hello')
  })

  it('keeps a leading byte order mark', () => {
    expect(decodeBase64('77u/aGk=')).toBe('\ufeffhi')
  })

  it('reports invalid Base64', () => {
    expect(() => decodeBase64('a')).toThrow(INVALID_BASE64)
    expect(() => decodeBase64('ab!c')).toThrow(INVALID_BASE64)
  })

  it('reports valid Base64 that is not UTF-8 text', () => {
    expect(() => decodeBase64('/w==')).toThrow(NOT_UTF8)
  })
})

describe('Base64Tool', () => {
  const output = () => screen.getByPlaceholderText('Output will appear here...') as HTMLTextAreaElement

  it('encodes whitespace-only input instead of showing empty output', () => {
    render(<Base64Tool />)
    fireEvent.change(screen.getByLabelText('Text to encode'), { target: { value: '   ' } })
    expect(output().value).toBe('ICAg')
  })

  it('shows a UTF-8 error for binary data, not an invalid Base64 error', () => {
    render(<Base64Tool />)
    fireEvent.click(screen.getByRole('button', { name: /decode/i }))
    fireEvent.change(screen.getByLabelText('Base64 to decode'), { target: { value: '/w==' } })
    expect(screen.getByText(NOT_UTF8)).toBeTruthy()
    expect(output().value).toBe('')
  })

  it('decodes URL-safe input and swaps back to encode', () => {
    render(<Base64Tool />)
    fireEvent.click(screen.getByRole('button', { name: /decode/i }))
    fireEvent.change(screen.getByLabelText('Base64 to decode'), { target: { value: 'PDw_Pz8-Pg' } })
    expect(output().value).toBe('<<???>>')
    fireEvent.click(screen.getByRole('button', { name: /swap/i }))
    expect((screen.getByLabelText('Text to encode') as HTMLTextAreaElement).value).toBe('<<???>>')
    expect(output().value).toBe('PDw/Pz8+Pg==')
  })
})

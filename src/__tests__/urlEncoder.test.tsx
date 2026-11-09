import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import UrlEncoderTool from '../tools/url-encoder'
import { convert } from '../tools/url-encoder/convert'

const input = () => screen.getByLabelText(/Text to encode|URL to decode/) as HTMLTextAreaElement
const output = () => screen.getByPlaceholderText('Output will appear here...') as HTMLTextAreaElement

describe('url encoder', () => {
  it('re-encodes with the new type when the encode type changes', () => {
    render(<UrlEncoderTool />)
    fireEvent.change(input(), { target: { value: 'https://a.b/c d?x=1' } })
    expect(output().value).toBe('https%3A%2F%2Fa.b%2Fc%20d%3Fx%3D1')

    fireEvent.click(screen.getByRole('button', { name: 'Full URL' }))
    expect(output().value).toBe('https://a.b/c%20d?x=1')

    fireEvent.click(screen.getByRole('button', { name: 'Component' }))
    expect(output().value).toBe('https%3A%2F%2Fa.b%2Fc%20d%3Fx%3D1')
  })

  it('re-decodes with the new type when the encode type changes', () => {
    render(<UrlEncoderTool />)
    fireEvent.click(screen.getByRole('button', { name: 'Decode' }))
    fireEvent.change(input(), { target: { value: 'a%2Fb%20c' } })
    expect(output().value).toBe('a/b c')

    fireEvent.click(screen.getByRole('button', { name: 'Full URL' }))
    expect(output().value).toBe('a%2Fb c')
  })

  it('encodes whitespace-only input', () => {
    render(<UrlEncoderTool />)
    fireEvent.change(input(), { target: { value: '  ' } })
    expect(output().value).toBe('%20%20')
  })

  it('shows an error for malformed encoded input', () => {
    render(<UrlEncoderTool />)
    fireEvent.click(screen.getByRole('button', { name: 'Decode' }))
    fireEvent.change(input(), { target: { value: '%E0%A4%A' } })
    expect(output().value).toBe('')
    expect(screen.getByRole('alert').textContent).toMatch(/Invalid encoded input/)
  })

  it('swaps the output into the input and reverses the mode', () => {
    render(<UrlEncoderTool />)
    fireEvent.change(input(), { target: { value: 'ä & ö' } })
    fireEvent.click(screen.getByRole('button', { name: 'Swap' }))
    expect(input().value).toBe('%C3%A4%20%26%20%C3%B6')
    expect(output().value).toBe('ä & ö')
  })
})

describe('convert', () => {
  it('returns empty output for empty input', () => {
    expect(convert('', 'encode', 'component')).toEqual({ output: '', error: '' })
  })

  it('keeps whitespace-only input', () => {
    expect(convert(' \n', 'encode', 'component').output).toBe('%20%0A')
    expect(convert('%20', 'decode', 'full').output).toBe(' ')
  })

  it('reports a lone surrogate as an encode error', () => {
    expect(convert('\uD800', 'encode', 'component')).toEqual({ output: '', error: 'Failed to encode' })
  })

  it('round-trips unicode', () => {
    const encoded = convert('日本 🎉', 'encode', 'component').output
    expect(convert(encoded, 'decode', 'component').output).toBe('日本 🎉')
  })
})

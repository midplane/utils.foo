import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import JwtDecoderTool from '../tools/jwt-decoder'

function b64url(obj: unknown): string {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
  return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

const input = () => screen.getByLabelText('JWT Token') as HTMLTextAreaElement

describe('jwt decoder tool', () => {
  it('marks a token with exp 0 as expired', () => {
    render(<JwtDecoderTool />)
    fireEvent.change(input(), { target: { value: `${b64url({ alg: 'HS256' })}.${b64url({ exp: 0 })}.sig` } })
    expect(screen.getByText('This token has expired')).toBeTruthy()
    expect(screen.getByText('EXPIRED')).toBeTruthy()
  })

  it('shows an error and does not crash when the payload is null', () => {
    render(<JwtDecoderTool />)
    fireEvent.change(input(), { target: { value: `${b64url({ alg: 'HS256' })}.${b64url(null)}.sig` } })
    expect(screen.getByText('Invalid JWT: payload is not a JSON object')).toBeTruthy()
  })

  it('decodes a value pasted with a "Bearer " prefix', () => {
    render(<JwtDecoderTool />)
    fireEvent.change(input(), { target: { value: `Bearer ${b64url({ alg: 'HS256' })}.${b64url({ sub: 'bob' })}.sig` } })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('bob')).toBeTruthy()
  })
})

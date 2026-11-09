import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PasswordGenerator from '../tools/password-generator'
import { CHARSETS, buildPool, calcEntropy, generatePassword, type CharsetKey } from '../tools/password-generator/generate'

const ALL: Record<CharsetKey, boolean> = { uppercase: true, lowercase: true, digits: true, symbols: true }
const ONLY_UPPER: Record<CharsetKey, boolean> = { uppercase: true, lowercase: false, digits: false, symbols: false }
const NONE: Record<CharsetKey, boolean> = { uppercase: false, lowercase: false, digits: false, symbols: false }

// Feed fixed values to crypto.getRandomValues, in sequence across calls.
function mockRandom(values: number[]) {
  const queue = [...values]
  return vi.spyOn(crypto, 'getRandomValues').mockImplementation(<T extends ArrayBufferView | null>(arr: T): T => {
    const out = arr as unknown as Uint32Array
    for (let i = 0; i < out.length; i++) out[i] = queue.shift() ?? 0
    return arr
  })
}

afterEach(() => { vi.restoreAllMocks() })

describe('generatePassword', () => {
  it('discards the top random value that would favour the first pool character', () => {
    const poolLen = CHARSETS.uppercase.length
    // Largest multiple of poolLen that fits in 32 bits. Accepting it gives index 0 one extra source value.
    const biased = Math.floor(0xffffffff / poolLen) * poolLen
    mockRandom([biased, 1])
    expect(generatePassword(1, ONLY_UPPER, false)).toBe('B')
  })

  it('accepts the largest unbiased value', () => {
    const poolLen = CHARSETS.uppercase.length
    const limit = 2 ** 32 - (2 ** 32 % poolLen)
    mockRandom([limit - 1])
    expect(generatePassword(1, ONLY_UPPER, false)).toBe('Z')
  })

  it('returns the requested length from the selected pool', () => {
    const pw = generatePassword(128, ALL, true)
    expect(pw).toHaveLength(128)
    expect(pw).not.toMatch(/[0Ol1I]/)
  })

  it('returns an empty string when no character set is selected', () => {
    expect(generatePassword(20, NONE, false)).toBe('')
  })
})

describe('calcEntropy', () => {
  it('uses the pool size after ambiguous characters are removed', () => {
    expect(buildPool(ALL, false)).toHaveLength(88)
    expect(buildPool(ALL, true)).toHaveLength(83)
    expect(calcEntropy(20, ALL, false)).toBe(Math.floor(20 * Math.log2(88)))
    expect(calcEntropy(20, ALL, true)).toBe(Math.floor(20 * Math.log2(83)))
    expect(calcEntropy(20, NONE, false)).toBe(0)
  })
})

describe('password generator UI', () => {
  it('does not offer to copy blank passwords when no character set is selected', () => {
    render(<PasswordGenerator />)
    expect(screen.getAllByRole('button', { name: 'Copy' }).length).toBeGreaterThan(1)

    for (const key of Object.keys(CHARSETS)) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(key, 'i') }))
    }

    expect(screen.getByText('Enable at least one character set.')).toBeTruthy()
    expect(screen.queryAllByRole('button', { name: 'Copy' })).toHaveLength(0)
  })
})

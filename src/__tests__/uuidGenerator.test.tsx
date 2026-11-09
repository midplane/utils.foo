import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import UuidGenerator from '../tools/uuid-generator'
import { createUuidV7Generator, parseUuidToBytes, uuidV4, uuidV5 } from '../tools/uuid-generator/uuid'

const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function shownUuids(): string[] {
  return Array.from(document.querySelectorAll('code'))
    .map(el => el.textContent ?? '')
    .filter(t => UUID_FORMAT.test(t))
}

describe('uuidV4', () => {
  it('sets the version and variant bits', () => {
    for (let i = 0; i < 50; i++) expect(uuidV4()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })
})

describe('uuidV5', () => {
  it('matches the RFC test vector', async () => {
    expect(await uuidV5(DNS, 'www.example.com')).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2')
  })

  it('accepts a namespace with whitespace, braces, a URN prefix or uppercase', async () => {
    const expected = await uuidV5(DNS, 'x')
    for (const ns of [` ${DNS}\n`, `{${DNS}}`, `urn:uuid:${DNS}`, DNS.toUpperCase(), DNS.replace(/-/g, '')]) {
      expect(await uuidV5(ns, 'x')).toBe(expected)
    }
  })

  it('rejects a malformed namespace', async () => {
    await expect(uuidV5('', 'x')).rejects.toThrow('Invalid namespace UUID')
    await expect(uuidV5(`${DNS}0`, 'x')).rejects.toThrow('Invalid namespace UUID')
    expect(parseUuidToBytes('6ba7b810--9dad11d1-80b4-00c04fd430c8')).toBeNull()
  })
})

describe('createUuidV7Generator', () => {
  it('encodes the timestamp and sets the version and variant bits', () => {
    const ts = 0x017f22e279b0
    const id = createUuidV7Generator(() => ts)()
    expect(id).toMatch(/^017f22e2-79b0-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('is strictly ascending inside one millisecond', () => {
    const gen = createUuidV7Generator(() => 1_700_000_000_000)
    const ids = Array.from({ length: 1000 }, () => gen())
    for (let i = 1; i < ids.length; i++) expect(ids[i]! > ids[i - 1]!).toBe(true)
  })

  it('stays ascending when the clock moves back', () => {
    let t = 1_700_000_000_000
    const gen = createUuidV7Generator(() => t)
    const a = gen()
    t -= 5000
    const b = gen()
    expect(b > a).toBe(true)
    expect(b.slice(0, 13)).toBe(a.slice(0, 13))
  })
})

describe('UUID generator UI', () => {
  it('shows sorted v7 UUIDs on first render', () => {
    render(<UuidGenerator />)
    const ids = shownUuids()
    expect(ids).toHaveLength(5)
    expect([...ids].sort()).toEqual(ids)
  })

  it('regenerates the list when the version or count changes', () => {
    render(<UuidGenerator />)
    fireEvent.click(screen.getByRole('button', { name: 'V4' }))
    let ids = shownUuids()
    expect(ids).toHaveLength(5)
    for (const id of ids) expect(id[14]).toBe('4')

    fireEvent.click(screen.getByRole('button', { name: '10' }))
    ids = shownUuids()
    expect(ids).toHaveLength(10)
    for (const id of ids) expect(id[14]).toBe('4')
  })

  it('clears the v5 result when the name changes', async () => {
    render(<UuidGenerator />)
    fireEvent.click(screen.getByRole('button', { name: 'V5' }))
    fireEvent.click(screen.getByRole('button', { name: /Generate V5 UUID/ }))
    await waitFor(() => expect(shownUuids()).toHaveLength(1))
    fireEvent.change(screen.getByDisplayValue('example.com'), { target: { value: 'example.org' } })
    expect(shownUuids()).toHaveLength(0)
  })
})

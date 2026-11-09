import { createHash } from 'node:crypto'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HashTool from '../tools/hash'
import { ALGORITHMS, computeHash } from '../tools/hash/logic'

const nodeHash = (algo: string, text: string) =>
  createHash(algo.replace('-', '').toLowerCase()).update(text, 'utf8').digest('hex')

const textInput = () => screen.getByLabelText('Text to hash') as HTMLTextAreaElement

afterEach(() => {
  vi.restoreAllMocks()
})

describe('computeHash matches Node crypto', () => {
  // 55, 56 and 64 bytes are the MD5/SHA padding boundaries.
  const inputs = [
    '',
    ' ',
    'a'.repeat(55),
    'a'.repeat(56),
    'a'.repeat(63),
    'a'.repeat(64),
    'a'.repeat(65),
    'é'.repeat(28),
    '😀 héllo\nwörld',
    'x'.repeat(100_000),
  ]

  for (const algo of ALGORITHMS) {
    it(`${algo} for edge-case inputs`, async () => {
      for (const text of inputs) {
        expect(await computeHash(text, algo)).toBe(nodeHash(algo, text))
      }
    })
  }
})

describe('hash tool', () => {
  it('hashes whitespace-only input', async () => {
    render(<HashTool />)
    fireEvent.change(textInput(), { target: { value: '  ' } })

    expect(await screen.findByText(nodeHash('SHA-256', '  '))).toBeTruthy()
    expect(screen.getByText(nodeHash('MD5', '  '))).toBeTruthy()
  })

  it('does not let an older computation overwrite a newer result', async () => {
    const realDigest = crypto.subtle.digest.bind(crypto.subtle)
    const held: Array<() => void> = []
    let hold = true
    vi.spyOn(crypto.subtle, 'digest').mockImplementation((algo, data) => {
      const text = new TextDecoder().decode(data as Uint8Array)
      if (hold && text === 'Hello, World!') {
        return new Promise((resolve) => held.push(() => resolve(realDigest(algo, data))))
      }
      return realDigest(algo, data)
    })

    render(<HashTool />)
    fireEvent.change(textInput(), { target: { value: 'new' } })
    expect(await screen.findByText(nodeHash('SHA-512', 'new'))).toBeTruthy()

    hold = false
    await act(async () => {
      held.forEach((release) => release())
      await new Promise((r) => setTimeout(r, 20))
    })

    expect(screen.getByText(nodeHash('SHA-512', 'new'))).toBeTruthy()
    expect(screen.queryByText(nodeHash('SHA-512', 'Hello, World!'))).toBeNull()
  })

  it('shows no stale result after Clear during a computation', async () => {
    const realDigest = crypto.subtle.digest.bind(crypto.subtle)
    const held: Array<() => void> = []
    vi.spyOn(crypto.subtle, 'digest').mockImplementation((algo, data) =>
      new Promise((resolve) => held.push(() => resolve(realDigest(algo, data)))))

    const { container } = render(<HashTool />)
    fireEvent.click(screen.getByRole('button', { name: /Clear/ }))

    vi.mocked(crypto.subtle.digest).mockImplementation(realDigest)
    await act(async () => {
      held.forEach((release) => release())
      await new Promise((r) => setTimeout(r, 20))
    })

    expect(screen.getByText(/Hash output will appear here/)).toBeTruthy()
    expect(container.querySelector('.animate-spin')).toBeNull()
  })

  it('shows an error and stops the spinner when Web Crypto fails', async () => {
    vi.spyOn(crypto.subtle, 'digest').mockRejectedValue(new Error('Web Crypto is not available'))
    const { container } = render(<HashTool />)

    expect((await screen.findByRole('alert')).textContent).toMatch(/Web Crypto is not available/)
    expect(container.querySelector('.animate-spin')).toBeNull()
  })

  it('clears the error when a later computation succeeds', async () => {
    const spy = vi.spyOn(crypto.subtle, 'digest').mockRejectedValue(new Error('Web Crypto is not available'))
    render(<HashTool />)
    await screen.findByRole('alert')

    spy.mockRestore()
    fireEvent.change(textInput(), { target: { value: 'abc' } })

    expect(await screen.findByText(nodeHash('SHA-256', 'abc'))).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })
})

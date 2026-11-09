import { createHmac } from 'node:crypto'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HmacGenerator from '../tools/hmac-generator'

const secretInput = () => screen.getByLabelText('Secret key') as HTMLInputElement
const messageInput = () => screen.getByLabelText('Message') as HTMLTextAreaElement

const nodeHmac = (algo: 'sha256' | 'sha512', key: string, msg: string) =>
  createHmac(algo, key).update(msg, 'utf8').digest('hex')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hmac generator', () => {
  it('matches Node for unicode input', async () => {
    render(<HmacGenerator />)
    fireEvent.change(secretInput(), { target: { value: 'ключ 🔑' } })
    fireEvent.change(messageInput(), { target: { value: 'héllo\nwörld 🌍' } })

    expect(await screen.findByText(nodeHmac('sha256', 'ключ 🔑', 'héllo\nwörld 🌍'))).toBeTruthy()
    expect(await screen.findByText(nodeHmac('sha512', 'ключ 🔑', 'héllo\nwörld 🌍'))).toBeTruthy()
  })

  it('computes the HMAC of an empty message', async () => {
    render(<HmacGenerator />)
    fireEvent.change(secretInput(), { target: { value: 'key' } })
    fireEvent.change(messageInput(), { target: { value: '' } })

    expect(await screen.findByText(nodeHmac('sha256', 'key', ''))).toBeTruthy()
  })

  it('asks for a key when the key is empty', async () => {
    render(<HmacGenerator />)
    fireEvent.change(secretInput(), { target: { value: '' } })

    expect(await screen.findByText(/Enter a secret key/)).toBeTruthy()
    expect(screen.queryByText(/Computing/)).toBeNull()
  })

  it('shows an error when Web Crypto fails', async () => {
    vi.spyOn(crypto.subtle, 'importKey').mockRejectedValue(new Error('Web Crypto is not available'))
    render(<HmacGenerator />)

    expect((await screen.findByRole('alert')).textContent).toMatch(/Web Crypto is not available/)
    expect(screen.queryByText(/Computing/)).toBeNull()
  })
})

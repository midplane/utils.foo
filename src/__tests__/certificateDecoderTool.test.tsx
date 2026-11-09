import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CertificateDecoderTool from '../tools/certificate-decoder'

// notBefore 2048-01-01, notAfter 2060-01-01.
const FUTURE_PEM = `-----BEGIN CERTIFICATE-----
MIIBUDCB+KADAgECAhQQiutOKnUqfi9T8mg/z9KaItg7gDAKBggqhkjOPQQDAjAO
MQwwCgYDVQQDDANnZW4wIBcNNDgwMTAxMDAwMDAwWhgPMjA2MDAxMDEwMDAwMDBa
MA4xDDAKBgNVBAMMA2dlbjBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABMM74V5p
vjmw+mkTwwi1gG9IHOSAVWCTnUoysBbkARLaJv+UPpEBtiGXIj3foX+0y4QmZBVr
iUrnIDs1hvx6nxyjMjAwMB0GA1UdDgQWBBQZB5Zajbe1H3J35lh9N6bIUXbaUzAP
BgNVHRMBAf8EBTADAQH/MAoGCCqGSM49BAMCA0cAMEQCIFIDE8Kc9TnHf2UQ1ZVm
7Z6Ny1FoPrHo+5LRBAPFEd//AiB4xgqMCnkNRetUjuvTd350FfdN1wsXSaaLjSAb
kD8Zjg==
-----END CERTIFICATE-----`

const input = () => screen.getByLabelText('PEM-encoded certificate') as HTMLTextAreaElement
const decode = () => fireEvent.click(screen.getByRole('button', { name: /Decode Certificate/ }))

afterEach(() => { vi.restoreAllMocks() })

describe('certificate decoder tool', () => {
  it('removes the old result when new text is pasted', async () => {
    render(<CertificateDecoderTool />)
    await screen.findByText('Certificate Details')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: vi.fn().mockResolvedValue(FUTURE_PEM) },
    })
    fireEvent.click(screen.getByRole('button', { name: /Paste/ }))
    await waitFor(() => expect(input().value).toBe(FUTURE_PEM))
    expect(screen.queryByText('Certificate Details')).toBeNull()
  })

  it('shows NOT YET VALID for a certificate that starts in the future', async () => {
    render(<CertificateDecoderTool />)
    await screen.findByText('Certificate Details')
    fireEvent.change(input(), { target: { value: FUTURE_PEM } })
    decode()
    expect(await screen.findByText('NOT YET VALID')).toBeTruthy()
    expect(screen.queryByText('VALID')).toBeNull()
  })

  it('tells the user that only the first certificate of a chain is shown', async () => {
    render(<CertificateDecoderTool />)
    await screen.findByText('Certificate Details')
    fireEvent.change(input(), { target: { value: `${FUTURE_PEM}\n${FUTURE_PEM}` } })
    decode()
    expect(await screen.findByText(/The input has 2 certificates/)).toBeTruthy()
  })
})

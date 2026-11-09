import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import DnsLookupTool from '../tools/dns-lookup'
import {
  LOOKUP_TIMEOUT_MS,
  normaliseDomain,
  parseTxt,
  queryDns,
  resultsToText,
  type DnsAnswer,
} from '../tools/dns-lookup/dns'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/dns-json' } })
}

function queryOf(input: RequestInfo | URL): { name: string; type: string } {
  const url = new URL(String(input))
  return { name: url.searchParams.get('name') ?? '', type: url.searchParams.get('type') ?? '' }
}

function lookup(domain: string) {
  fireEvent.change(screen.getByPlaceholderText('example.com'), { target: { value: domain } })
  fireEvent.keyDown(screen.getByPlaceholderText('example.com'), { key: 'Enter' })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

// ─── normaliseDomain ─────────────────────────────────────────────────────────

describe('normaliseDomain', () => {
  it('removes a scheme in any case, and the path', () => {
    expect(normaliseDomain('HTTPS://Example.com/path?q=1')).toBe('example.com')
    expect(normaliseDomain('ftp://example.com')).toBe('example.com')
  })

  it('removes a port, user info, query and fragment', () => {
    expect(normaliseDomain('example.com:8080')).toBe('example.com')
    expect(normaliseDomain('user@example.com')).toBe('example.com')
    expect(normaliseDomain('example.com?x=1#top')).toBe('example.com')
  })

  it('converts an IDN to punycode and keeps a trailing dot and underscores', () => {
    expect(normaliseDomain('  bücher.de ')).toBe('xn--bcher-kva.de')
    expect(normaliseDomain('example.com.')).toBe('example.com.')
    expect(normaliseDomain('_dmarc.Example.com')).toBe('_dmarc.example.com')
  })

  it('returns null for input that is not a host', () => {
    expect(normaliseDomain('   ')).toBeNull()
    expect(normaliseDomain('exa mple.com')).toBeNull()
  })
})

// ─── parseTxt ────────────────────────────────────────────────────────────────

describe('parseTxt', () => {
  it('joins multiple character-strings without a separator', () => {
    expect(parseTxt('"v=DKIM1; p=AAA/" "BBB"')).toBe('v=DKIM1; p=AAA/BBB')
  })

  it('decodes escaped quotes, backslashes and decimal escapes', () => {
    expect(parseTxt('"say \\"hi\\" \\\\ ok"')).toBe('say "hi" \\ ok')
    expect(parseTxt('"caf\\195\\169"')).toBe('café')
  })

  it('returns data that is not quoted unchanged', () => {
    expect(parseTxt('plain')).toBe('plain')
    expect(parseTxt('"unterminated')).toBe('"unterminated')
  })
})

// ─── queryDns / resultsToText ────────────────────────────────────────────────

describe('queryDns', () => {
  it('maps RCODE 3 to nxdomain and other RCODEs to an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ Status: 3 })))
    await expect(queryDns('x.example', 'A')).resolves.toMatchObject({ status: 'nxdomain' })
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ Status: 2 })))
    await expect(queryDns('x.example', 'A')).resolves.toMatchObject({ status: 'error', error: 'Server failure' })
  })

  it('throws on an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'bad' }, 400)))
    await expect(queryDns('x.example', 'A')).rejects.toThrow('HTTP 400')
  })
})

describe('resultsToText', () => {
  it('labels each line with the real record type of a CNAME chain', () => {
    const answers: DnsAnswer[] = [
      { name: 'www.github.com', type: 5, TTL: 3181, data: 'github.com.' },
      { name: 'github.com', type: 1, TTL: 36, data: '20.207.73.82' },
    ]
    expect(resultsToText([{ type: 'A', status: 'ok', answers }]))
      .toBe('CNAME\t3181\tgithub.com.\nA\t36\t20.207.73.82')
  })

  it('copies the decoded TXT value', () => {
    const answers: DnsAnswer[] = [{ name: 'a.example', type: 16, TTL: 60, data: '"v=spf1 " "-all"' }]
    expect(resultsToText([{ type: 'TXT', status: 'ok', answers }])).toBe('TXT\t60\tv=spf1 -all')
  })
})

// ─── Component ───────────────────────────────────────────────────────────────

describe('DnsLookupTool', () => {
  it('queries the normalised host name', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) => jsonResponse({ Status: 0, Answer: [] }))
    vi.stubGlobal('fetch', fetchMock)
    render(<DnsLookupTool />)
    lookup('HTTPS://Bücher.de/page')
    expect(await screen.findByText('No records found for the selected types.')).toBeTruthy()
    const names = new Set(fetchMock.mock.calls.map(([input]) => queryOf(input).name))
    expect([...names]).toEqual(['xn--bcher-kva.de'])
  })

  it('reports NXDOMAIN instead of "no records"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ Status: 3 })))
    render(<DnsLookupTool />)
    lookup('nope.example')
    expect(await screen.findByText('The domain does not exist (NXDOMAIN).')).toBeTruthy()
  })

  it('does not let an older lookup overwrite the results of a newer one', async () => {
    const pending: Array<() => void> = []
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const { name } = queryOf(input)
      const body = { Status: 0, Answer: [{ name, type: 1, TTL: 60, data: name === 'old.example' ? '1.1.1.1' : '2.2.2.2' }] }
      if (name === 'old.example') {
        return new Promise<Response>(resolve => { pending.push(() => resolve(jsonResponse(body))) })
      }
      return Promise.resolve(jsonResponse(body))
    }))
    render(<DnsLookupTool />)
    lookup('old.example')
    lookup('new.example')
    expect((await screen.findAllByText('2.2.2.2')).length).toBeGreaterThan(0)

    await act(async () => { pending.forEach(release => release()) })
    expect(screen.queryByText('1.1.1.1')).toBeNull()
    expect(screen.getAllByText('2.2.2.2').length).toBeGreaterThan(0)
    expect(screen.getByText('new.example')).toBeTruthy()
  })

  it('stops a lookup that does not complete and clears the loading state', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    ))
    render(<DnsLookupTool />)
    lookup('slow.example')
    const button = screen.getByRole('button', { name: /lookup/i }) as HTMLButtonElement
    expect(button.disabled).toBe(true)

    await act(async () => { vi.advanceTimersByTime(LOOKUP_TIMEOUT_MS) })
    expect(screen.getAllByText('Request timed out').length).toBeGreaterThan(0)
    expect(button.disabled).toBe(false)
  })
})

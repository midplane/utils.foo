import { useState } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { InfoCard } from '../../components/ui/InfoCard'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { Alert } from '../../components/ui/Alert'
import { FlowDivider } from '../../components/ui/FlowDivider'
import { ClipboardList, Info, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react'

interface JWTPayload {
  [key: string]: unknown
}

interface JWTHeader {
  alg?: string
  typ?: string
  [key: string]: unknown
}

interface DecodedJWT {
  header: JWTHeader
  payload: JWTPayload
  signature: string
}

function decodeJWT(token: string): DecodedJWT {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format: must have 3 parts separated by dots')
  }

  const [headerB64, payloadB64, signature] = parts

  const decodeBase64Url = (str: string): string => {
    // Convert base64url to base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    const padding = base64.length % 4
    if (padding) {
      base64 += '='.repeat(4 - padding)
    }
    return decodeURIComponent(escape(atob(base64)))
  }

  try {
    const header = JSON.parse(decodeBase64Url(headerB64 ?? ''))
    const payload = JSON.parse(decodeBase64Url(payloadB64 ?? ''))
    return { header, payload, signature: signature ?? '' }
  } catch {
    throw new Error('Invalid JWT: failed to decode')
  }
}

function formatTimestamp(value: unknown): string | null {
  if (typeof value !== 'number') return null
  // JWT timestamps are in seconds
  const date = new Date(value * 1000)
  if (isNaN(date.getTime())) return null
  return date.toLocaleString()
}

function isExpired(exp: unknown): boolean {
  if (typeof exp !== 'number') return false
  return Date.now() > exp * 1000
}

const KNOWN_CLAIMS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expiration Time',
  nbf: 'Not Before',
  iat: 'Issued At',
  jti: 'JWT ID',
}

const TIME_CLAIMS = ['exp', 'nbf', 'iat']

// Easter egg JWT: A token for "Ada Lovelace" - the first programmer
const EASTER_EGG_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZGFfbG92ZWxhY2UiLCJuYW1lIjoiQWRhIExvdmVsYWNlIiwicm9sZSI6ImZpcnN0X3Byb2dyYW1tZXIiLCJpYXQiOi00MDcwOTA4ODAwLCJleHAiOjQxMDI0NDQ4MDAsIm1vdHRvIjoiVGhlIG1vcmUgSSBzdHVkeSwgdGhlIG1vcmUgaW5zYXRpYWJsZSBkbyBJIGZlZWwgbXkgZ2VuaXVzIGZvciBpdCB0byBiZS4ifQ.first-programmer-signature'

const EASTER_EGG_DECODED: DecodedJWT = {
  header: { alg: 'HS256', typ: 'JWT' },
  payload: {
    sub: 'ada_lovelace',
    name: 'Ada Lovelace',
    role: 'first_programmer',
    iat: -4070908800,
    exp: 4102444800,
    motto: 'The more I study, the more insatiable do I feel my genius for it to be.'
  },
  signature: 'first-programmer-signature'
}

export default function JwtDecoderTool() {
  const [input, setInput] = useState(EASTER_EGG_JWT)
  const [decoded, setDecoded] = useState<DecodedJWT | null>(EASTER_EGG_DECODED)
  const [error, setError] = useState('')

  const handleInputChange = (value: string) => {
    setInput(value)
    setError('')
    setDecoded(null)

    const trimmed = value.trim()
    if (!trimmed) {
      return
    }

    try {
      const result = decodeJWT(trimmed)
      setDecoded(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to decode JWT')
    }
  }

  const handleClear = () => {
    setInput('')
    setDecoded(null)
    setError('')
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      handleInputChange(text)
    } catch {
      setError('Failed to read clipboard')
    }
  }

  const expired = decoded?.payload?.exp ? isExpired(decoded.payload.exp) : false

  return (
    <div className="space-y-4 animate-fade-in">
      <ToolHeader icon={<LockKeyhole />} title="JWT" accentedSuffix="Decoder" />

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-medium text-[var(--color-ink-muted)]">
              Paste a JWT to decode
            </span>
            
            {/* Actions */}
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handlePaste} className="gap-1 text-xs h-7 px-2">
                <ClipboardList className="w-3 h-3" />
                Paste
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-xs h-7 px-2">
                <Trash2 className="w-3 h-3" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Input */}
          <div className="space-y-1">
            <Textarea
              label="JWT Token"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              rows={3}
              id="input"
              className="font-mono text-sm"
            />
          </div>

          {/* Error */}
          {error && (
            <Alert variant="error" size="sm">{error}</Alert>
          )}

          {/* Flow Divider */}
          <FlowDivider hasOutput={!!decoded} />

          {/* Decoded Output */}
          {decoded && (
            <>
              {/* Expiration Warning */}
              {expired && (
                <Alert variant="warning" size="sm">This token has expired</Alert>
              )}

              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <SectionLabel>Header</SectionLabel>
                  <CopyButton text={JSON.stringify(decoded.header, null, 2)} />
                </div>
                <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg">
                  <pre className="text-xs font-mono text-[var(--color-ink)] whitespace-pre-wrap break-all">
                    {JSON.stringify(decoded.header, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Payload */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <SectionLabel>Payload</SectionLabel>
                  <CopyButton text={JSON.stringify(decoded.payload, null, 2)} />
                </div>
                <div className="p-2.5 bg-[var(--color-success-bg-subtle)] border border-[var(--color-success-border)] rounded-lg space-y-2">
                  {Object.entries(decoded.payload).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-[var(--color-success-text)]">
                          {key}
                        </span>
                        {KNOWN_CLAIMS[key] && (
                          <span className="text-[10px] text-[var(--color-ink-muted)]">
                            ({KNOWN_CLAIMS[key]})
                          </span>
                        )}
                        {key === 'exp' && expired && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-error-bg)] text-[var(--color-error-text)] rounded font-medium">
                            EXPIRED
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-[var(--color-ink)] break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        {TIME_CLAIMS.includes(key) && formatTimestamp(value) && (
                          <span className="text-[var(--color-ink-muted)] ml-2">
                            ({formatTimestamp(value)})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <SectionLabel>Signature</SectionLabel>
                  <CopyButton text={decoded.signature} />
                </div>
                <div className="p-2.5 bg-[var(--color-purple-bg-subtle)] border border-[var(--color-purple-border)] rounded-lg">
                  <code className="text-xs font-mono text-[var(--color-ink)] break-all">
                    {decoded.signature}
                  </code>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="grid grid-cols-2 gap-2">
        <InfoCard
          icon={<Info className="text-[var(--color-accent)]" />}
          title="What is JWT?"
          description="JSON Web Token for secure authentication claims."
        />
        <InfoCard
          icon={<ShieldCheck className="text-[var(--color-warning-icon)]" />}
          title="Security Note"
          description="Decoding does not verify the signature."
        />
      </div>
    </div>
  )
}


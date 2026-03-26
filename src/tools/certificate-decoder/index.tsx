import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'

// ---------------------------------------------------------------------------
// Minimal ASN.1 / DER / X.509 parser (pure TS, no deps)
// ---------------------------------------------------------------------------

function b64decode(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function stripPem(pem: string): string {
  return pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '')
}

// ASN.1 tag constants
const TAG_SEQUENCE   = 0x30
const TAG_SET        = 0x31
const TAG_UTF8_STR   = 0x0c
const TAG_PRINTABLE  = 0x13
const TAG_T61        = 0x14
const TAG_IA5        = 0x16
const TAG_UTC_TIME   = 0x17
const TAG_GEN_TIME   = 0x18
const TAG_OCTET_STR  = 0x04

interface AsnNode {
  tag: number
  raw: Uint8Array
  children?: AsnNode[]
  value?: Uint8Array
}

function readLength(buf: Uint8Array, offset: number): { length: number; bytesRead: number } {
  const first = buf[offset] ?? 0
  if (first < 0x80) return { length: first, bytesRead: 1 }
  const lenBytes = first & 0x7f
  let length = 0
  for (let i = 0; i < lenBytes; i++) length = (length << 8) | (buf[offset + 1 + i] ?? 0)
  return { length, bytesRead: 1 + lenBytes }
}

function parseAsn(buf: Uint8Array, offset = 0, end?: number): AsnNode[] {
  const stop = end ?? buf.length
  const nodes: AsnNode[] = []
  while (offset < stop) {
    const tag = buf[offset] ?? 0
    offset++
    const { length, bytesRead } = readLength(buf, offset)
    offset += bytesRead
    const raw = buf.slice(offset, offset + length)
    const constructed = (tag & 0x20) !== 0
    const node: AsnNode = { tag, raw }
    if (constructed) {
      node.children = parseAsn(buf, offset, offset + length)
    } else {
      node.value = raw
    }
    nodes.push(node)
    offset += length
  }
  return nodes
}

function oidBytes(bytes: Uint8Array): string {
  const parts: number[] = []
  const first = bytes[0] ?? 0
  parts.push(Math.floor(first / 40))
  parts.push(first % 40)
  let val = 0
  for (let i = 1; i < bytes.length; i++) {
    const b = bytes[i] ?? 0
    val = (val << 7) | (b & 0x7f)
    if ((b & 0x80) === 0) { parts.push(val); val = 0 }
  }
  return parts.join('.')
}

const OID_NAMES: Record<string, string> = {
  '2.5.4.3':  'CN', '2.5.4.6': 'C', '2.5.4.7': 'L', '2.5.4.8': 'ST',
  '2.5.4.10': 'O',  '2.5.4.11': 'OU',
  '1.2.840.113549.1.1.1':  'rsaEncryption',
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.10045.2.1':     'ecPublicKey',
  '1.2.840.10045.4.3.2':   'ecdsa-with-SHA256',
  '1.2.840.10045.4.3.3':   'ecdsa-with-SHA384',
  '2.5.29.17': 'subjectAltName',
  '2.5.29.15': 'keyUsage',
  '2.5.29.37': 'extKeyUsage',
  '2.5.29.19': 'basicConstraints',
  '2.5.29.14': 'subjectKeyIdentifier',
  '2.5.29.35': 'authorityKeyIdentifier',
}

function oidName(oid: string): string {
  return OID_NAMES[oid] ?? oid
}

function asn1String(node: AsnNode): string {
  if (!node.value) return ''
  const t = node.tag
  if (t === TAG_UTF8_STR || t === TAG_PRINTABLE || t === TAG_T61 || t === TAG_IA5) {
    return new TextDecoder().decode(node.value)
  }
  if (t === TAG_UTC_TIME || t === TAG_GEN_TIME) {
    return new TextDecoder().decode(node.value)
  }
  return Array.from(node.value).map(b => b.toString(16).padStart(2, '0')).join('')
}

function parseTime(raw: string, tag: number): Date {
  // UTCTime: YYMMDDHHMMSSZ, GeneralizedTime: YYYYMMDDHHMMSSZ
  if (tag === TAG_UTC_TIME) {
    const yy = parseInt(raw.slice(0, 2))
    const year = yy >= 50 ? 1900 + yy : 2000 + yy
    return new Date(`${year}-${raw.slice(2, 4)}-${raw.slice(4, 6)}T${raw.slice(6, 8)}:${raw.slice(8, 10)}:${raw.slice(10, 12)}Z`)
  }
  // GeneralizedTime
  return new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}Z`)
}

function parseName(seqNode: AsnNode): Record<string, string> {
  const result: Record<string, string> = {}
  const rdns = seqNode.children ?? []
  for (const rdn of rdns) {
    if (rdn.tag !== TAG_SET) continue
    const atv = rdn.children?.[0]
    if (!atv || atv.tag !== TAG_SEQUENCE) continue
    const oidNode = atv.children?.[0]
    const valNode = atv.children?.[1]
    if (!oidNode || !valNode) continue
    const oid = oidBytes(oidNode.value ?? new Uint8Array())
    const name = oidName(oid)
    result[name] = asn1String(valNode)
  }
  return result
}

function formatDN(dn: Record<string, string>): string {
  return Object.entries(dn).map(([k, v]) => `${k}=${v}`).join(', ')
}

// Parse SubjectAltName extension value (an OCTET STRING wrapping a SEQUENCE)
function parseSAN(extValue: Uint8Array): string[] {
  const inner = parseAsn(extValue)
  const seq = inner[0]
  if (!seq?.children) return []
  const names: string[] = []
  for (const entry of seq.children) {
    const t = entry.tag & 0x1f
    if (t === 2) names.push('DNS:' + new TextDecoder().decode(entry.raw))     // dNSName [2]
    else if (t === 7) names.push('IP:' + Array.from(entry.raw).join('.'))    // iPAddress [7]
    else if (t === 1) names.push('Email:' + new TextDecoder().decode(entry.raw)) // rfc822Name [1]
  }
  return names
}

interface CertInfo {
  version: string
  serialNumber: string
  signatureAlgorithm: string
  subject: Record<string, string>
  issuer: Record<string, string>
  notBefore: Date
  notAfter: Date
  publicKeyAlgorithm: string
  publicKeyBits?: number
  san: string[]
  isCA: boolean
  fingerprint: string  // hex SHA-256
  expired: boolean
  daysRemaining: number
}

async function parseCertificate(pem: string): Promise<CertInfo> {
  const b64 = stripPem(pem)
  const der = b64decode(b64)
  const nodes = parseAsn(der)
  const certSeq = nodes[0]
  if (!certSeq?.children) throw new Error('Invalid certificate structure')

  // Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signature }
  const tbs = certSeq.children[0]
  const sigAlgNode = certSeq.children[1]
  if (!tbs?.children) throw new Error('Invalid TBSCertificate')

  // TBSCertificate fields
  let idx = 0
  const tbsChildren = tbs.children

  // [0] version (optional, explicit context tag)
  let version = 'v1'
  if ((tbsChildren[idx]?.tag ?? 0) === 0xa0) {
    const vNode = tbsChildren[idx]?.children?.[0]
    version = `v${((vNode?.value?.[0] ?? 0) + 1)}`
    idx++
  }

  // serialNumber
  const serialNode = tbsChildren[idx++]
  const serialHex = Array.from(serialNode?.value ?? new Uint8Array())
    .map(b => b.toString(16).padStart(2, '0')).join(':')

  // signature algorithm (inner)
  idx++ // skip inner sigAlg

  // issuer
  const issuerNode = tbsChildren[idx++]
  const issuer = issuerNode ? parseName(issuerNode) : {}

  // validity
  const validityNode = tbsChildren[idx++]
  const nbNode = validityNode?.children?.[0]
  const naNode = validityNode?.children?.[1]
  const notBefore = parseTime(asn1String(nbNode!), nbNode?.tag ?? TAG_UTC_TIME)
  const notAfter  = parseTime(asn1String(naNode!), naNode?.tag ?? TAG_UTC_TIME)

  // subject
  const subjectNode = tbsChildren[idx++]
  const subject = subjectNode ? parseName(subjectNode) : {}

  // subjectPublicKeyInfo
  const spkiNode = tbsChildren[idx++]
  let publicKeyAlgorithm = 'Unknown'
  let publicKeyBits: number | undefined
  if (spkiNode?.children) {
    const algNode = spkiNode.children[0]
    const algOidNode = algNode?.children?.[0]
    if (algOidNode?.value) {
      const oid = oidBytes(algOidNode.value)
      publicKeyAlgorithm = oidName(oid)
    }
    // For RSA, try to extract modulus bit length
    if (publicKeyAlgorithm === 'rsaEncryption') {
      const bsNode = spkiNode.children[1]
      if (bsNode?.value) {
        // BIT STRING: first byte is unused bits count
        const inner = parseAsn(bsNode.value.slice(1))
        const rsaSeq = inner[0]
        const modNode = rsaSeq?.children?.[0]
        if (modNode?.value) {
          // Strip leading zero byte if present
          let len = modNode.value.length
          if (modNode.value[0] === 0) len--
          publicKeyBits = len * 8
        }
      }
    }
  }

  // Extensions (version 3)
  let san: string[] = []
  let isCA = false
  for (; idx < tbsChildren.length; idx++) {
    const node = tbsChildren[idx]
    if (!node) continue
    // Extensions are wrapped in [3] context tag
    if ((node.tag & 0xe0) === 0xa0 && node.children) {
      const extsSeq = node.children[0]
      if (!extsSeq?.children) continue
      for (const ext of extsSeq.children) {
        const oidNode = ext.children?.[0]
        if (!oidNode?.value) continue
        const oid = oidBytes(oidNode.value)
        if (oid === '2.5.29.17') {
          // SAN — value may be preceded by critical boolean
          const valNode = ext.children?.find(n => n.tag === TAG_OCTET_STR)
          if (valNode?.value) san = parseSAN(valNode.value)
        }
        if (oid === '2.5.29.19') {
          // basicConstraints
          const valNode = ext.children?.find(n => n.tag === TAG_OCTET_STR)
          if (valNode?.value) {
            const inner = parseAsn(valNode.value)
            const bc = inner[0]?.children
            if (bc?.[0]?.value?.[0] === 0xff) isCA = true
          }
        }
      }
    }
  }

  // Signature algorithm (outer)
  let signatureAlgorithm = 'Unknown'
  if (sigAlgNode?.children?.[0]?.value) {
    const oid = oidBytes(sigAlgNode.children[0].value)
    signatureAlgorithm = oidName(oid)
  }

  // Fingerprint: SHA-256 of the DER
  const fpBuffer = await crypto.subtle.digest('SHA-256', der.buffer.slice(der.byteOffset, der.byteOffset + der.byteLength) as ArrayBuffer)
  const fingerprint = Array.from(new Uint8Array(fpBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase()

  const now = Date.now()
  const expired = now > notAfter.getTime()
  const daysRemaining = Math.floor((notAfter.getTime() - now) / 86_400_000)

  return {
    version,
    serialNumber: serialHex,
    signatureAlgorithm,
    subject,
    issuer,
    notBefore,
    notAfter,
    publicKeyAlgorithm,
    publicKeyBits,
    san,
    isCA,
    fingerprint,
    expired,
    daysRemaining,
  }
}

// Easter egg: self-signed cert for the Ada Lovelace Institute — first programmer 🖥️
const DEMO_PEM = `-----BEGIN CERTIFICATE-----
MIIELDCCAxSgAwIBAgIUMcT+al7BS4QXsoOCG0ZQsuHIOYwwDQYJKoZIhvcNAQEL
BQAwgYsxCzAJBgNVBAYTAlVTMRMwEQYDVQQIDApDYWxpZm9ybmlhMRYwFAYDVQQH
DA1TYW4gRnJhbmNpc2NvMR8wHQYDVQQKDBZBZGEgTG92ZWxhY2UgSW5zdGl0dXRl
MRQwEgYDVQQLDAtFbmdpbmVlcmluZzEYMBYGA1UEAwwPYWRhLmV4YW1wbGUuY29t
MB4XDTI2MDMyNjA5Mjk1MVoXDTI4MDYyODA5Mjk1MVowgYsxCzAJBgNVBAYTAlVT
MRMwEQYDVQQIDApDYWxpZm9ybmlhMRYwFAYDVQQHDA1TYW4gRnJhbmNpc2NvMR8w
HQYDVQQKDBZBZGEgTG92ZWxhY2UgSW5zdGl0dXRlMRQwEgYDVQQLDAtFbmdpbmVl
cmluZzEYMBYGA1UEAwwPYWRhLmV4YW1wbGUuY29tMIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAxRX3EdKZCKCFiBtlCxRoKVjJ1EsN6eS0MYX0sYHLOaz7
SeVKeLgOE22H0Atjw+tL6TcpnEdNTHn2MVYIEvRdWnSNfeOr62aRVW+RUGcKVpRy
3XZgWg3ve3ytRTDZtJfrYnKzNR8mwOgQgRmSZaSZQmMVVi95EryJEKpyQqh/TG4p
qhjtl+v8HqEJoGfthv/HsN42G6Rgg4dqgxeToI2XjyGEgxbBaUQ1k5ExG2ITJ+Xp
yWQdklygrS7zz8cKcpmIgTCpOoDMLzSGOHK4LWWCra3DBWukXqTtu/x/8XsjrTIf
QcBoj/gU1horDD9ESzVF0TtvjV8UkOaral13C9v7dwIDAQABo4GFMIGCMB0GA1Ud
DgQWBBTX+Az6ui75/WG7GDemvy/IEoaeYDAfBgNVHSMEGDAWgBTX+Az6ui75/WG7
GDemvy/IEoaeYDAPBgNVHRMBAf8EBTADAQH/MC8GA1UdEQQoMCaCD2FkYS5leGFt
cGxlLmNvbYITd3d3LmFkYS5leGFtcGxlLmNvbTANBgkqhkiG9w0BAQsFAAOCAQEA
h/1ESirmFrYcei+IZAtP2EeubE42TfdfVuBuFPuu3kT7ehAsAvdwSW1pz6FBoZG6
Bb4cXeVe0tkOXVigFMEcuqAUWUfYXqdilpD8XBjR2GD7WQyZedlqj/eL6+a00H3/
YqLNN04zwsAxHMSbBDv/FBe5xVcn2aZ2q1jxt1hb35/O/SjTipHbh1N+zfsHfkOl
7WL1rmtwinFm4r1HgIENZLb/a05wdbrS/cToSRCCTqSaAIqvVb2YgNC9pc2e5Bnz
8mDb7pJdmmTEPyVeBv2Ja2Ao7n19vfqXU/O47QOvMLyODWuOObK69wIG7aofpBvW
5vwyUsQBm4t0KWvDP4+7BA==
-----END CERTIFICATE-----`

function formatDate(d: Date): string {
  return d.toUTCString()
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)] w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs font-mono text-[var(--color-ink)] break-all">{children}</span>
    </div>
  )
}

export default function CertificateDecoderTool() {
  const [pem, setPem] = useState(DEMO_PEM)
  const [cert, setCert] = useState<CertInfo | null>(null)
  const [error, setError] = useState('')
  const [isParsing, setIsParsing] = useState(false)

  // Auto-decode on mount with the demo cert
  useEffect(() => { handleDecode() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDecode = async () => {
    setError('')
    setCert(null)
    setIsParsing(true)
    try {
      const result = await parseCertificate(pem.trim())
      setCert(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse certificate')
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb & Header */}
      <div className="space-y-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
            <CertIcon className="w-3.5 h-3.5" />
          </div>
          <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
            Certificate <span className="text-[var(--color-accent)]">Decoder</span>
          </h1>
        </div>
      </div>

      {/* Input card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-[var(--color-ink)]">PEM Input</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText()
                    setPem(text)
                  } catch { /* permission denied */ }
                }}
                className="gap-1 text-xs h-7 px-2"
              >
                <ClipboardIcon className="w-3 h-3" />
                Paste
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setPem(''); setCert(null); setError('') }}
                className="gap-1 text-xs h-7 px-2"
              >
                <TrashIcon className="w-3 h-3" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            label="PEM-encoded certificate"
            id="cert-pem"
            placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
            value={pem}
            onChange={e => { setPem(e.target.value); setCert(null); setError('') }}
            rows={6}
            className="font-mono text-xs"
          />
          <Button variant="primary" size="sm" onClick={handleDecode} disabled={!pem.trim() || isParsing} className="gap-1">
            {isParsing ? <SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> : <SearchIcon className="w-3.5 h-3.5" />}
            Decode Certificate
          </Button>
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-mono">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result card */}
      {cert && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--color-ink)]">Certificate Details</span>
                {cert.expired ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700 border border-red-200">EXPIRED</span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-100 text-emerald-700 border border-emerald-200">VALID</span>
                )}
                {cert.isCA && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-blue-100 text-blue-700 border border-blue-200">CA</span>
                )}
              </div>
              <CopyButton text={JSON.stringify(cert, null, 2)} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Subject */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)] mb-1">Subject</p>
                <Row label="DN">{formatDN(cert.subject)}</Row>
                {cert.san.length > 0 && (
                  <Row label="SANs">
                    <div className="flex flex-wrap gap-1">
                      {cert.san.map(s => (
                        <span key={s} className="px-1.5 py-0.5 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded text-[10px]">{s}</span>
                      ))}
                    </div>
                  </Row>
                )}
              </div>

              {/* Issuer */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)] mb-1">Issuer</p>
                <Row label="DN">{formatDN(cert.issuer)}</Row>
              </div>

              {/* Validity */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)] mb-1">Validity</p>
                <Row label="Not Before">{formatDate(cert.notBefore)}</Row>
                <Row label="Not After">
                  <span className={cert.expired ? 'text-red-600' : cert.daysRemaining < 30 ? 'text-orange-600' : ''}>
                    {formatDate(cert.notAfter)}
                    {!cert.expired && (
                      <span className="ml-2 text-[var(--color-ink-muted)]">({cert.daysRemaining}d remaining)</span>
                    )}
                  </span>
                </Row>
              </div>

              {/* Public Key */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)] mb-1">Public Key</p>
                <Row label="Algorithm">{cert.publicKeyAlgorithm}</Row>
                {cert.publicKeyBits && <Row label="Key Size">{cert.publicKeyBits} bits</Row>}
              </div>

              {/* Misc */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)] mb-1">Certificate</p>
                <Row label="Version">{cert.version}</Row>
                <Row label="Serial">{cert.serialNumber}</Row>
                <Row label="Sig. Algorithm">{cert.signatureAlgorithm}</Row>
                <Row label="SHA-256 FP">
                  <span className="break-all">{cert.fingerprint}</span>
                </Row>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <InfoIcon className="w-3.5 h-3.5 text-[var(--color-accent)] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">What is PEM?</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Privacy-Enhanced Mail — Base64-encoded DER with header/footer lines. Used by TLS/SSL certificates, keys, and CAs.
              </p>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 bg-[var(--color-cream-dark)] rounded-lg border border-[var(--color-border)]">
          <div className="flex gap-2 items-start">
            <ShieldIcon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[var(--color-ink)] text-xs">Client-side only</h3>
              <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight mt-0.5">
                Your certificate is parsed entirely in the browser. Nothing is transmitted to any server.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
    </svg>
  )
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

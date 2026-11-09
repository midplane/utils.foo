// ---------------------------------------------------------------------------
// Minimal ASN.1 / DER / X.509 parser (pure TS, no deps)
// ---------------------------------------------------------------------------

const NOT_A_CERT = 'The input is not an X.509 certificate.'

function b64decode(b64: string): Uint8Array {
  let bin: string
  try {
    bin = atob(b64)
  } catch {
    throw new Error('The input is not valid PEM or Base64 data.')
  }
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

const PEM_BLOCK = /-----BEGIN ([^-\r\n]+)-----([\s\S]*?)-----END \1-----/g
const CERT_LABELS = new Set(['CERTIFICATE', 'X509 CERTIFICATE', 'TRUSTED CERTIFICATE'])

interface PemBlock { label: string; body: string }

function pemBlocks(input: string): PemBlock[] {
  return Array.from(input.matchAll(PEM_BLOCK), m => ({ label: (m[1] ?? '').trim(), body: m[2] ?? '' }))
}

/** Number of certificate PEM blocks in the input (0 for raw Base64). */
export function countCertificates(input: string): number {
  return pemBlocks(input).filter(b => CERT_LABELS.has(b.label)).length
}

/**
 * Returns the DER bytes of the first certificate in the input. Text before and
 * after the PEM blocks is ignored. Input without PEM armour is read as Base64.
 */
export function pemToDer(input: string): Uint8Array {
  const blocks = pemBlocks(input)
  if (blocks.length > 0) {
    const cert = blocks.find(b => CERT_LABELS.has(b.label))
    if (!cert) throw new Error(`The input is a ${blocks[0]?.label ?? 'PEM'} block, not a certificate.`)
    return b64decode(cert.body.replace(/\s+/g, ''))
  }
  if (input.includes('-----BEGIN')) throw new Error('The PEM block has no matching END line.')
  return b64decode(input.replace(/\s+/g, ''))
}

// ASN.1 tag constants
const TAG_BOOLEAN    = 0x01
const TAG_INTEGER    = 0x02
const TAG_OCTET_STR  = 0x04
const TAG_OID        = 0x06
const TAG_UTF8_STR   = 0x0c
const TAG_NUMERIC    = 0x12
const TAG_PRINTABLE  = 0x13
const TAG_T61        = 0x14
const TAG_IA5        = 0x16
const TAG_UTC_TIME   = 0x17
const TAG_GEN_TIME   = 0x18
const TAG_VISIBLE    = 0x1a
const TAG_UNIVERSAL  = 0x1c
const TAG_BMP        = 0x1e
const TAG_SEQUENCE   = 0x30
const TAG_SET        = 0x31

interface AsnNode {
  tag: number
  raw: Uint8Array
  children?: AsnNode[]
  value?: Uint8Array
}

const BAD_DER = 'The data is not valid DER: an element length is not correct.'

function readLength(buf: Uint8Array, offset: number): { length: number; bytesRead: number } {
  const first = buf[offset]
  if (first === undefined) throw new Error(BAD_DER)
  if (first < 0x80) return { length: first, bytesRead: 1 }
  const lenBytes = first & 0x7f
  // DER does not allow the indefinite form (0x80). More than 4 length bytes is not a real certificate.
  if (lenBytes === 0 || lenBytes > 4 || offset + lenBytes >= buf.length) throw new Error(BAD_DER)
  let length = 0
  for (let i = 0; i < lenBytes; i++) length = length * 256 + (buf[offset + 1 + i] ?? 0)
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
    if (offset + length > stop) throw new Error(BAD_DER)
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
  '2.5.4.3':  'CN', '2.5.4.4': 'SN', '2.5.4.5': 'serialNumber', '2.5.4.6': 'C', '2.5.4.7': 'L',
  '2.5.4.8': 'ST', '2.5.4.9': 'street', '2.5.4.10': 'O',  '2.5.4.11': 'OU', '2.5.4.12': 'title',
  '2.5.4.42': 'GN',
  '0.9.2342.19200300.100.1.1':  'UID',
  '0.9.2342.19200300.100.1.25': 'DC',
  '1.2.840.113549.1.9.1': 'emailAddress',
  '1.2.840.113549.1.1.1':  'rsaEncryption',
  '1.2.840.113549.1.1.5':  'sha1WithRSAEncryption',
  '1.2.840.113549.1.1.10': 'RSASSA-PSS',
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.10045.2.1':     'ecPublicKey',
  '1.2.840.10045.4.3.2':   'ecdsa-with-SHA256',
  '1.2.840.10045.4.3.3':   'ecdsa-with-SHA384',
  '1.2.840.10045.4.3.4':   'ecdsa-with-SHA512',
  '1.3.101.112': 'Ed25519',
  '1.3.101.113': 'Ed448',
  '2.5.29.17': 'subjectAltName',
  '2.5.29.15': 'keyUsage',
  '2.5.29.37': 'extKeyUsage',
  '2.5.29.19': 'basicConstraints',
  '2.5.29.14': 'subjectKeyIdentifier',
  '2.5.29.35': 'authorityKeyIdentifier',
}

const EC_CURVES: Record<string, { name: string; bits: number }> = {
  '1.2.840.10045.3.1.7': { name: 'P-256', bits: 256 },
  '1.3.132.0.34':        { name: 'P-384', bits: 384 },
  '1.3.132.0.35':        { name: 'P-521', bits: 521 },
  '1.3.132.0.10':        { name: 'secp256k1', bits: 256 },
}

function oidName(oid: string): string {
  return OID_NAMES[oid] ?? oid
}

function toHex(bytes: Uint8Array, sep = ''): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(sep)
}

function asn1String(node: AsnNode): string {
  const v = node.value
  if (!v) return ''
  const t = node.tag
  if (t === TAG_UTF8_STR || t === TAG_PRINTABLE || t === TAG_IA5 || t === TAG_NUMERIC || t === TAG_VISIBLE
    || t === TAG_UTC_TIME || t === TAG_GEN_TIME) {
    return new TextDecoder().decode(v)
  }
  // T61String in real certificates holds ISO-8859-1 text.
  if (t === TAG_T61) return String.fromCharCode(...v)
  if (t === TAG_BMP) {
    let s = ''
    for (let i = 0; i + 1 < v.length; i += 2) s += String.fromCharCode(((v[i] ?? 0) << 8) | (v[i + 1] ?? 0))
    return s
  }
  if (t === TAG_UNIVERSAL) {
    let s = ''
    for (let i = 0; i + 3 < v.length; i += 4) {
      s += String.fromCodePoint((((v[i] ?? 0) << 24) | ((v[i + 1] ?? 0) << 16) | ((v[i + 2] ?? 0) << 8) | (v[i + 3] ?? 0)) >>> 0)
    }
    return s
  }
  return toHex(v)
}

function parseTime(node: AsnNode | undefined): Date {
  if (!node || (node.tag !== TAG_UTC_TIME && node.tag !== TAG_GEN_TIME)) throw new Error(NOT_A_CERT)
  const raw = asn1String(node)
  // UTCTime: YYMMDDHHMMSSZ, GeneralizedTime: YYYYMMDDHHMMSSZ
  let date: Date
  if (node.tag === TAG_UTC_TIME) {
    const yy = parseInt(raw.slice(0, 2))
    const year = yy >= 50 ? 1900 + yy : 2000 + yy
    date = new Date(`${year}-${raw.slice(2, 4)}-${raw.slice(4, 6)}T${raw.slice(6, 8)}:${raw.slice(8, 10)}:${raw.slice(10, 12)}Z`)
  } else {
    date = new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}Z`)
  }
  if (Number.isNaN(date.getTime())) throw new Error(`The certificate has a validity date that is not valid: "${raw}".`)
  return date
}

// Name ::= SEQUENCE OF RDN; RDN ::= SET OF AttributeTypeAndValue. An RDN can hold more than one attribute.
function parseName(seqNode: AsnNode): string {
  const rdns: string[] = []
  for (const rdn of seqNode.children ?? []) {
    if (rdn.tag !== TAG_SET) continue
    const atvs: string[] = []
    for (const atv of rdn.children ?? []) {
      if (atv.tag !== TAG_SEQUENCE) continue
      const oidNode = atv.children?.[0]
      const valNode = atv.children?.[1]
      if (!oidNode || !valNode) continue
      atvs.push(`${oidName(oidBytes(oidNode.value ?? new Uint8Array()))}=${asn1String(valNode)}`)
    }
    if (atvs.length > 0) rdns.push(atvs.join(' + '))
  }
  return rdns.join(', ')
}

function formatIPv6(bytes: Uint8Array): string {
  const groups: number[] = []
  for (let i = 0; i < 16; i += 2) groups.push(((bytes[i] ?? 0) << 8) | (bytes[i + 1] ?? 0))
  // RFC 5952: replace the longest run (2 or more) of zero groups with "::".
  let bestStart = -1, bestLen = 0
  for (let i = 0; i < 8;) {
    if (groups[i] !== 0) { i++; continue }
    let j = i
    while (j < 8 && groups[j] === 0) j++
    if (j - i > bestLen) { bestStart = i; bestLen = j - i }
    i = j
  }
  const hex = groups.map(g => g.toString(16))
  if (bestLen < 2) return hex.join(':')
  return `${hex.slice(0, bestStart).join(':')}::${hex.slice(bestStart + bestLen).join(':')}`
}

// Parse SubjectAltName extension value (an OCTET STRING wrapping a SEQUENCE)
function parseSAN(extValue: Uint8Array): string[] {
  const inner = parseAsn(extValue)
  const seq = inner[0]
  if (!seq?.children) return []
  const names: string[] = []
  const text = (b: Uint8Array) => new TextDecoder().decode(b)
  for (const entry of seq.children) {
    const t = entry.tag & 0x1f
    if (t === 1) names.push('Email:' + text(entry.raw))                // rfc822Name [1]
    else if (t === 2) names.push('DNS:' + text(entry.raw))             // dNSName [2]
    else if (t === 4 && entry.children?.[0]) names.push('DirName:' + parseName(entry.children[0])) // directoryName [4]
    else if (t === 6) names.push('URI:' + text(entry.raw))             // uniformResourceIdentifier [6]
    else if (t === 7) {                                                 // iPAddress [7]
      if (entry.raw.length === 4) names.push('IP:' + Array.from(entry.raw).join('.'))
      else if (entry.raw.length === 16) names.push('IP:' + formatIPv6(entry.raw))
      else names.push('IP:' + toHex(entry.raw, ':'))
    }
  }
  return names
}

function bitLength(bytes: Uint8Array): number {
  let i = 0
  while (i < bytes.length && bytes[i] === 0) i++
  const top = bytes[i]
  if (top === undefined) return 0
  return (bytes.length - i - 1) * 8 + (32 - Math.clz32(top))
}

export interface CertInfo {
  version: string
  serialNumber: string
  signatureAlgorithm: string
  subject: string
  issuer: string
  notBefore: Date
  notAfter: Date
  publicKeyAlgorithm: string
  publicKeyBits?: number
  san: string[]
  isCA: boolean
  fingerprint: string  // hex SHA-256
  expired: boolean
  notYetValid: boolean
  daysRemaining: number
}

export async function parseCertificate(input: string, now = Date.now()): Promise<CertInfo> {
  const der = pemToDer(input)
  const nodes = parseAsn(der)
  const certSeq = nodes[0]
  if (certSeq?.tag !== TAG_SEQUENCE || !certSeq.children) throw new Error(NOT_A_CERT)

  // Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signature }
  const tbs = certSeq.children[0]
  const sigAlgNode = certSeq.children[1]
  if (tbs?.tag !== TAG_SEQUENCE || !tbs.children) throw new Error(NOT_A_CERT)

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

  // serialNumber. A leading 0x00 is only the DER sign byte, not part of the value.
  const serialNode = tbsChildren[idx++]
  if (serialNode?.tag !== TAG_INTEGER || !serialNode.value) throw new Error(NOT_A_CERT)
  let serialBytes = serialNode.value
  if (serialBytes.length > 1 && serialBytes[0] === 0 && (serialBytes[1] ?? 0) >= 0x80) serialBytes = serialBytes.slice(1)
  const serialHex = toHex(serialBytes, ':')

  // signature algorithm (inner)
  idx++ // skip inner sigAlg

  // issuer
  const issuerNode = tbsChildren[idx++]
  const issuer = issuerNode ? parseName(issuerNode) : ''

  // validity
  const validityNode = tbsChildren[idx++]
  if (validityNode?.tag !== TAG_SEQUENCE) throw new Error(NOT_A_CERT)
  const notBefore = parseTime(validityNode.children?.[0])
  const notAfter  = parseTime(validityNode.children?.[1])

  // subject
  const subjectNode = tbsChildren[idx++]
  const subject = subjectNode ? parseName(subjectNode) : ''

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
    if (publicKeyAlgorithm === 'rsaEncryption') {
      const bsNode = spkiNode.children[1]
      if (bsNode?.value) {
        // BIT STRING: first byte is unused bits count
        const inner = parseAsn(bsNode.value.slice(1))
        const rsaSeq = inner[0]
        const modNode = rsaSeq?.children?.[0]
        if (modNode?.value) publicKeyBits = bitLength(modNode.value)
      }
    } else if (publicKeyAlgorithm === 'ecPublicKey') {
      const curveNode = algNode?.children?.[1]
      if (curveNode?.tag === TAG_OID && curveNode.value) {
        const curveOid = oidBytes(curveNode.value)
        const curve = EC_CURVES[curveOid]
        publicKeyAlgorithm = `ecPublicKey (${curve?.name ?? curveOid})`
        publicKeyBits = curve?.bits
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
    if (node.tag === 0xa3 && node.children) {
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
          // basicConstraints ::= SEQUENCE { cA BOOLEAN DEFAULT FALSE, pathLenConstraint INTEGER OPTIONAL }
          const valNode = ext.children?.find(n => n.tag === TAG_OCTET_STR)
          if (valNode?.value) {
            const inner = parseAsn(valNode.value)
            const first = inner[0]?.children?.[0]
            if (first?.tag === TAG_BOOLEAN && (first.value?.[0] ?? 0) !== 0) isCA = true
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

  // Fingerprint: SHA-256 of the certificate DER only. Data after it (for example the
  // trust settings of a TRUSTED CERTIFICATE) is not part of the certificate.
  const { length, bytesRead } = readLength(der, 1)
  const certDer = der.slice(0, 1 + bytesRead + length)
  const fpBuffer = await crypto.subtle.digest('SHA-256', certDer)
  const fingerprint = toHex(new Uint8Array(fpBuffer), ':').toUpperCase()

  const expired = now > notAfter.getTime()
  const notYetValid = now < notBefore.getTime()
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
    notYetValid,
    daysRemaining,
  }
}

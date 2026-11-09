import { describe, expect, it } from 'vitest'
import { countCertificates, parseCertificate } from '../tools/certificate-decoder/x509'

// Fixtures made with OpenSSL. Expected values come from `openssl x509 -text` and Node X509Certificate.

// Subject: T61String "Zoë", BMPString "日本", OU=A, OU=B, DC=example, DC=com. P-256 key.
const STRINGS_PEM = `-----BEGIN CERTIFICATE-----
MIIBxjCCAWygAwIBAgIUbJWSpoVNv98SFD837FD06BsVwlswCgYIKoZIzj0EAwIw
YzEMMAoGA1UEAxQDWm/rMQ0wCwYDVQQKHgRl5WcsMQowCAYDVQQLEwFBMQowCAYD
VQQLEwFCMRcwFQYKCZImiZPyLGQBGRYHZXhhbXBsZTETMBEGCgmSJomT8ixkARkW
A2NvbTAeFw0yNjExMDkxNTMwNDVaFw0yNjEyMDkxNTMwNDVaMGMxDDAKBgNVBAMU
A1pv6zENMAsGA1UECh4EZeVnLDEKMAgGA1UECxMBQTEKMAgGA1UECxMBQjEXMBUG
CgmSJomT8ixkARkWB2V4YW1wbGUxEzARBgoJkiaJk/IsZAEZFgNjb20wWTATBgcq
hkjOPQIBBggqhkjOPQMBBwNCAAS8reaPVYPT7o/PMUphUxY3agIKz7zir9SAkGN2
mYYuMX+V1DsnR7UmzEU9LA9+/AYVySlaUPMhf+5At/j3X8p0MAoGCCqGSM49BAMC
A0gAMEUCIAxLfrFs1XHgq01+N32z6FvpbO90PBxo4NF6Wxr1WWShAiEAsQA2f1lI
GDB+is/GuN0uDYnm/VNyuJnxQEvBZRfjNtg=
-----END CERTIFICATE-----`

// Subject "CN=multi + UID=42, O=Org", serial 0x80aabbcc (DER adds a 0x00 sign byte),
// SAN with DNS, IPv4, IPv6, URI and email. Valid 2026-01-01 to 2027-01-01.
const MULTI_PEM = `-----BEGIN CERTIFICATE-----
MIIB2TCCAX+gAwIBAgIFAICqu8wwCgYIKoZIzj0EAwIwMDEgMAwGA1UEAwwFbXVs
dGkwEAYKCZImiZPyLGQBAQwCNDIxDDAKBgNVBAoMA09yZzAeFw0yNjAxMDEwMDAw
MDBaFw0yNzAxMDEwMDAwMDBaMDAxIDAMBgNVBAMMBW11bHRpMBAGCgmSJomT8ixk
AQEMAjQyMQwwCgYDVQQKDANPcmcwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAQr
jt94Qc7Bqoc5e+C4Z8Y1MpThAHMgZlDxmWPnmfw8vciS3IelKq5eQ9wuWWjR9tIH
pwUof7LK3FskN+N/sCRNo4GFMIGCMB0GA1UdDgQWBBRW9tNMRouIDT/0oe0i1VVo
TJoaejAPBgNVHRMBAf8EBTADAQH/MFAGA1UdEQRJMEeCCWEuZXhhbXBsZYcEwAAC
AYcQIAENuAAAAAAAAAAAAAAAAYYTaHR0cHM6Ly9hLmV4YW1wbGUveIENYUBleGFt
cGxlLmNvbTAKBggqhkjOPQQDAgNIADBFAiA3thvecvep5iBlFvLQ1rQw5O/90NrR
6VYMP8i+sMfXrgIhAN1PdaljmRkuk8DGeF843gaez82um0c0udGVJnxN9d73
-----END CERTIFICATE-----`
const MULTI_FP = '00:2F:08:0F:90:1C:26:39:6C:99:08:46:20:F4:59:E7:18:59:98:76:D8:4E:BE:BE:78:FF:04:F4:40:36:9A:CF'

// notBefore UTCTime 480101000000Z, notAfter GeneralizedTime 20600101000000Z.
const GEN_PEM = `-----BEGIN CERTIFICATE-----
MIIBUDCB+KADAgECAhQQiutOKnUqfi9T8mg/z9KaItg7gDAKBggqhkjOPQQDAjAO
MQwwCgYDVQQDDANnZW4wIBcNNDgwMTAxMDAwMDAwWhgPMjA2MDAxMDEwMDAwMDBa
MA4xDDAKBgNVBAMMA2dlbjBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABMM74V5p
vjmw+mkTwwi1gG9IHOSAVWCTnUoysBbkARLaJv+UPpEBtiGXIj3foX+0y4QmZBVr
iUrnIDs1hvx6nxyjMjAwMB0GA1UdDgQWBBQZB5Zajbe1H3J35lh9N6bIUXbaUzAP
BgNVHRMBAf8EBTADAQH/MAoGCCqGSM49BAMCA0cAMEQCIFIDE8Kc9TnHf2UQ1ZVm
7Z6Ny1FoPrHo+5LRBAPFEd//AiB4xgqMCnkNRetUjuvTd350FfdN1wsXSaaLjSAb
kD8Zjg==
-----END CERTIFICATE-----`

// UTCTime 990101000000Z to 000101000000Z.
const OLD_PEM = `-----BEGIN CERTIFICATE-----
MIIBTzCB9qADAgECAhQF7aGr7Y/MK7e/OmBdyYytMohAaTAKBggqhkjOPQQDAjAO
MQwwCgYDVQQDDANvbGQwHhcNOTkwMTAxMDAwMDAwWhcNMDAwMTAxMDAwMDAwWjAO
MQwwCgYDVQQDDANvbGQwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAQHRDJU/uXA
aFnRwaU/rbCfQiGx7wXimv9ehp3Mur3AFEnXNKgFUQSzgWWzISXccY/j9T1kz720
s9E04V8ogO/cozIwMDAdBgNVHQ4EFgQUZoNRbOnw/taAg2Usk6I7Ia70wCQwDwYD
VR0TAQH/BAUwAwEB/zAKBggqhkjOPQQDAgNIADBFAiEA8zRS3sEUsZdI4Aki1cOJ
lRiWugK0YvSWqgR4WLfdhosCIGTGtZI2qilTa94Gl7DFqvmqmAlTPpZkp+35N8mz
bsTp
-----END CERTIFICATE-----`

// RSA key with a 1023-bit modulus.
const RSA_1023_PEM = `-----BEGIN CERTIFICATE-----
MIIB1jCCAT+gAwIBAgIUY5keme8SMPEzm2xnv8qlJGR6h+cwDQYJKoZIhvcNAQEL
BQAwDjEMMAoGA1UEAwwDb2RkMB4XDTI2MTEwOTE1MzA1MFoXDTI2MTIwOTE1MzA1
MFowDjEMMAoGA1UEAwwDb2RkMIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgFJC
cjl4mIr3n8HJ7QzTvgY1S+jaP8KXUiRU9kBPivaaKrievaUXMGUlr8pwIF27ldKZ
AV7YstuVXYhNcO/0dVNUUHgzyIow/9omQgjFZ8D+PoMst5dpULSgbo5F9daZZLek
FWgv0c5mGQfoyiFNhnWHiGj3bWSrSDSaBqr4lEU/AgMBAAGjMjAwMB0GA1UdDgQW
BBQEazsLUcDwMxkOoi0ApD4WovxUJTAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3
DQEBCwUAA4GBABPxNlAas+dRBnZwVaX7EkeqyyK0W2OsNOforImVWaUFrxvFjT1M
My7FXBtcls9LdE+IkG90qSezTzClVl/d12w0/5fpClNh8EzSqjXDYSVtQixXDnw4
jeC7yRai51r/470cz8om1ui834izWbucInQET2+x1LRpllocnR3NQjNV
-----END CERTIFICATE-----`

const CSR_PEM = `-----BEGIN CERTIFICATE REQUEST-----
MIHIMHACAQAwDjEMMAoGA1UEAwwDY3NyMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcD
QgAEXxMWfweUMKPo4sgsIxeJhJEgR5kcynOsulG/yi7n5rqiN3dlFn/lczTmMgPW
Q71R77722XmS1epClxghVq5BqaAAMAoGCCqGSM49BAMCA0gAMEUCID+GYueyXXEe
Frec3tEzbghVwxrPf1rvAXbEWRNbk0kSAiEAz+1JUWBfXCVFlHBktwRUBUgJXztY
m0sxdv6y64aAmKk=
-----END CERTIFICATE REQUEST-----`

const NOW = Date.UTC(2026, 10, 9)

describe('certificate decoder: names', () => {
  it('decodes T61String and BMPString values and keeps repeated attributes', async () => {
    const c = await parseCertificate(STRINGS_PEM, NOW)
    expect(c.subject).toBe('CN=Zoë, O=日本, OU=A, OU=B, DC=example, DC=com')
    expect(c.issuer).toBe(c.subject)
  })

  it('shows all attributes of a multi-valued RDN', async () => {
    const c = await parseCertificate(MULTI_PEM, NOW)
    expect(c.subject).toBe('CN=multi + UID=42, O=Org')
  })
})

describe('certificate decoder: fields', () => {
  it('removes the DER sign byte from the serial number', async () => {
    const c = await parseCertificate(MULTI_PEM, NOW)
    expect(c.serialNumber).toBe('80:aa:bb:cc')
  })

  it('formats IPv6 and URI subject alternative names', async () => {
    const c = await parseCertificate(MULTI_PEM, NOW)
    expect(c.san).toEqual([
      'DNS:a.example',
      'IP:192.0.2.1',
      'IP:2001:db8::1',
      'URI:https://a.example/x',
      'Email:a@example.com',
    ])
  })

  it('computes the SHA-256 fingerprint over the DER bytes', async () => {
    const c = await parseCertificate(MULTI_PEM, NOW)
    expect(c.fingerprint).toBe(MULTI_FP)
  })

  it('reports the exact RSA modulus size', async () => {
    const c = await parseCertificate(RSA_1023_PEM, NOW)
    expect(c.publicKeyAlgorithm).toBe('rsaEncryption')
    expect(c.publicKeyBits).toBe(1023)
  })

  it('reports the EC curve and its size', async () => {
    const c = await parseCertificate(MULTI_PEM, NOW)
    expect(c.publicKeyAlgorithm).toBe('ecPublicKey (P-256)')
    expect(c.publicKeyBits).toBe(256)
  })
})

describe('certificate decoder: validity', () => {
  it('reads UTCTime with the 1950-2049 pivot and GeneralizedTime', async () => {
    const gen = await parseCertificate(GEN_PEM, NOW)
    expect(gen.notBefore.toISOString()).toBe('2048-01-01T00:00:00.000Z')
    expect(gen.notAfter.toISOString()).toBe('2060-01-01T00:00:00.000Z')
    const old = await parseCertificate(OLD_PEM, NOW)
    expect(old.notBefore.toISOString()).toBe('1999-01-01T00:00:00.000Z')
    expect(old.notAfter.toISOString()).toBe('2000-01-01T00:00:00.000Z')
  })

  it('marks a certificate as not yet valid before notBefore', async () => {
    const c = await parseCertificate(GEN_PEM, NOW)
    expect(c.notYetValid).toBe(true)
    expect(c.expired).toBe(false)
  })

  it('marks a certificate as expired after notAfter', async () => {
    const c = await parseCertificate(OLD_PEM, NOW)
    expect(c.expired).toBe(true)
    expect(c.notYetValid).toBe(false)
  })
})

describe('certificate decoder: input forms', () => {
  it('decodes the first certificate of a chain', async () => {
    const chain = `${MULTI_PEM}\n${GEN_PEM}\n`
    const c = await parseCertificate(chain, NOW)
    expect(c.fingerprint).toBe(MULTI_FP)
    expect(countCertificates(chain)).toBe(2)
  })

  it('ignores text around the PEM block and accepts CRLF line ends', async () => {
    const input = `subject=CN=multi\r\nissuer=CN=multi\r\n${MULTI_PEM.replace(/\n/g, '\r\n')}\r\nTrailing text`
    const c = await parseCertificate(input, NOW)
    expect(c.fingerprint).toBe(MULTI_FP)
  })

  it('accepts Base64 without PEM header lines', async () => {
    const bare = MULTI_PEM.split('\n').filter(l => !l.startsWith('-----')).join('\n')
    const c = await parseCertificate(bare, NOW)
    expect(c.fingerprint).toBe(MULTI_FP)
    expect(countCertificates(bare)).toBe(0)
  })

  it('accepts a TRUSTED CERTIFICATE block and ignores the trust data after it', async () => {
    const body = MULTI_PEM.split('\n').filter(l => !l.startsWith('-----')).join('')
    // Append an empty SEQUENCE as stand-in trust data.
    const der = atob(body) + '\x30\x00'
    const trusted = `-----BEGIN TRUSTED CERTIFICATE-----\n${btoa(der)}\n-----END TRUSTED CERTIFICATE-----`
    const c = await parseCertificate(trusted, NOW)
    expect(c.fingerprint).toBe(MULTI_FP)
  })
})

describe('certificate decoder: bad input', () => {
  it('rejects a certificate request with a clear message', async () => {
    await expect(parseCertificate(CSR_PEM, NOW)).rejects.toThrow('CERTIFICATE REQUEST block, not a certificate')
  })

  it('does not hang on a length that points backwards', async () => {
    // 30 84 ff ff ff fa: a 4-byte length that used to overflow to -6 and loop forever.
    await expect(parseCertificate('MIT////6', NOW)).rejects.toThrow('not valid DER')
  })

  it('rejects data that is not Base64', async () => {
    await expect(parseCertificate('not a cert!', NOW)).rejects.toThrow('not valid PEM or Base64')
  })

  it('rejects a PEM block with no END line', async () => {
    await expect(parseCertificate('-----BEGIN CERTIFICATE-----\nMIIB', NOW)).rejects.toThrow('no matching END line')
  })

  it('rejects valid DER that is not a certificate', async () => {
    await expect(parseCertificate(btoa('\x30\x03\x02\x01\x00'), NOW)).rejects.toThrow('not an X.509 certificate')
  })
})

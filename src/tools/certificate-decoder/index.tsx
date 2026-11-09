import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Textarea'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { InfoCard } from '../../components/ui/InfoCard'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { Alert } from '../../components/ui/Alert'
import { FlowDivider } from '../../components/ui/FlowDivider'
import { ClipboardList, Info, Loader2, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { countCertificates, parseCertificate, type CertInfo } from './x509'

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
  const [certCount, setCertCount] = useState(0)

  // Auto-decode on mount with the demo cert
  useEffect(() => { handleDecode() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDecode = async () => {
    setError('')
    setCert(null)
    setIsParsing(true)
    try {
      const result = await parseCertificate(pem.trim())
      setCert(result)
      setCertCount(countCertificates(pem))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse certificate')
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <ToolHeader icon={<ShieldCheck />} title="Certificate" accentedSuffix="Decoder" />

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
                    setCert(null)
                    setError('')
                  } catch { /* permission denied */ }
                }}
                className="gap-1 text-xs h-7 px-2"
              >
                <ClipboardList className="w-3 h-3" />
                Paste
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setPem(''); setCert(null); setError('') }}
                className="gap-1 text-xs h-7 px-2"
              >
                <Trash2 className="w-3 h-3" />
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
            {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Decode Certificate
          </Button>
          {error && (
            <Alert variant="error" size="sm" className="font-mono">{error}</Alert>
          )}
          {cert && certCount > 1 && (
            <Alert variant="info" size="sm">The input has {certCount} certificates. Only the first certificate is shown.</Alert>
          )}
        </CardContent>
      </Card>

      {/* Flow Divider */}
      <FlowDivider hasOutput={!!cert} icon={isParsing ? <Loader2 className="animate-spin" /> : undefined} />

      {/* Result card */}
      {cert && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--color-ink)]">Certificate Details</span>
                {cert.expired ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[var(--color-error-bg)] text-[var(--color-error-text)] border border-[var(--color-error-border)]">EXPIRED</span>
                ) : cert.notYetValid ? (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border border-[var(--color-warning-border)]">NOT YET VALID</span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success-border)]">VALID</span>
                )}
                {cert.isCA && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[var(--color-info-bg)] text-[var(--color-info-text)] border border-[var(--color-info-border)]">CA</span>
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
                <Row label="DN">{cert.subject}</Row>
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
                <Row label="DN">{cert.issuer}</Row>
              </div>

              {/* Validity */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)] mb-1">Validity</p>
                <Row label="Not Before">{formatDate(cert.notBefore)}</Row>
                <Row label="Not After">
                  <span className={cert.expired ? 'text-[var(--color-error-text)]' : cert.daysRemaining < 30 ? 'text-[var(--color-warning-text)]' : ''}>
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
        <InfoCard
          icon={<Info className="text-[var(--color-accent)]" />}
          title="What is PEM?"
          description="Privacy-Enhanced Mail — Base64-encoded DER with header/footer lines. Used by TLS/SSL certificates, keys, and CAs."
        />
        <InfoCard
          icon={<ShieldCheck className="text-[var(--color-success-icon)]" />}
          title="Client-side only"
          description="Your certificate is parsed entirely in the browser. Nothing is transmitted to any server."
        />
      </div>
    </div>
  )
}


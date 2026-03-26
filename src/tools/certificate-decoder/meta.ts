import { ToolMeta } from '../types'
import { ShieldCheck } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'certificate-decoder',
  name: 'Certificate Decoder',
  description: 'Parse and inspect PEM-encoded X.509 certificates — subject, issuer, SANs, validity, public key',
  category: 'Crypto / Security',
  keywords: ['certificate', 'x509', 'pem', 'ssl', 'tls', 'san', 'public key', 'issuer', 'subject', 'expiry'],
  path: '/certificate',
  icon: ShieldCheck,
}

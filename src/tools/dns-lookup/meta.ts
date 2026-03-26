import { ToolMeta } from '../types'
import { Globe } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'dns-lookup',
  name: 'DNS Lookup',
  description: 'Query DNS records for any domain — A, AAAA, MX, TXT, NS, CNAME, SOA via Cloudflare DNS-over-HTTPS',
  category: 'Network',
  keywords: ['dns', 'lookup', 'domain', 'nameserver', 'mx', 'txt', 'a record', 'aaaa', 'cname', 'soa', 'ns', 'doh', 'resolve'],
  path: '/dns',
  icon: Globe,
}

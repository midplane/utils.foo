import { ToolMeta } from '../types'
import { Flag } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'country-codes',
  name: 'Country Codes',
  description: 'ISO 3166-1 alpha-2, alpha-3, numeric codes and ITU dial prefixes for every country',
  category: 'Reference',
  keywords: ['country', 'iso', '3166', 'alpha2', 'alpha3', 'numeric', 'nation', 'region', 'flag', 'phone', 'dial', 'calling', 'e164', 'itu', '+1', '+44'],
  path: '/country-codes',
  icon: Flag,
}

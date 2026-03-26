import { ToolMeta } from '../types'
import { QrCode } from 'lucide-react'

export const meta: ToolMeta = {
  id: 'qr-generator',
  name: 'QR Generator',
  description: 'Generate QR codes from URLs, text, or any content — download as PNG or SVG',
  category: 'Generators',
  keywords: ['qr', 'qrcode', 'barcode', 'generate', 'url', 'link', 'encode', 'scan'],
  path: '/qr',
  icon: QrCode,
}

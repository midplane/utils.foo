import { describe, it, expect } from 'vitest'
import QRCode from 'qrcode'
import { fitsInQr, isHexColor, qrOptions, type QrSettings } from '../tools/qr-generator/qr'

const BASE: QrSettings = { errorLevel: 'M', size: 256, margin: 2, fgColor: '#1C1917', bgColor: '#FFFBF5' }

describe('qrOptions', () => {
  it('applies the selected size to the SVG output', async () => {
    const svg = await QRCode.toString('https://example.com', { ...qrOptions({ ...BASE, size: 384 }), type: 'svg' })
    expect(svg).toContain('width="384" height="384"')
  })

  it('uses the selected colours in the SVG output', async () => {
    const svg = await QRCode.toString('hi', { ...qrOptions({ ...BASE, fgColor: '#112233', bgColor: '#abcdef' }), type: 'svg' })
    expect(svg).toContain('fill="#abcdef"')
    expect(svg).toContain('stroke="#112233"')
    expect(svg).not.toContain('opacity')
  })

  it('rejects hex colours with digits that are not valid', () => {
    expect(() => qrOptions({ ...BASE, fgColor: '#GGGGGG' })).toThrow(/Foreground colour/)
    expect(() => qrOptions({ ...BASE, bgColor: '#zzz' })).toThrow(/Background colour/)
  })

  it('rejects partial and #RGBA colours that the library reads as transparent', () => {
    expect(() => qrOptions({ ...BASE, fgColor: '#1C19' })).toThrow()
    expect(() => qrOptions({ ...BASE, fgColor: '1C1917' })).toThrow()
  })
})

describe('isHexColor', () => {
  it('accepts #RGB and #RRGGBB in any case', () => {
    expect(isHexColor('#abc')).toBe(true)
    expect(isHexColor('#AbCdEf')).toBe(true)
    expect(isHexColor('#abcd')).toBe(false)
    expect(isHexColor('')).toBe(false)
  })
})

describe('fitsInQr', () => {
  const bytes = (n: number) => 'abc'.repeat(Math.ceil(n / 3)).slice(0, n)

  it('uses the capacity of the selected error-correction level', () => {
    expect(fitsInQr(bytes(1500), 'H')).toBe(false)
    expect(fitsInQr(bytes(1500), 'M')).toBe(true)
    expect(fitsInQr(bytes(2500), 'L')).toBe(true)
    expect(fitsInQr(bytes(2500), 'M')).toBe(false)
  })

  it('accounts for the denser numeric mode', () => {
    expect(fitsInQr('1'.repeat(3000), 'M')).toBe(true)
  })

  it('treats empty text as fitting', () => {
    expect(fitsInQr('', 'H')).toBe(true)
  })
})

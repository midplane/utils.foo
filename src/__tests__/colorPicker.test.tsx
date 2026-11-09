import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ColorPickerTool from '../tools/color-picker'
import {
  contrastRatio,
  getContrastColor,
  hexToRgb,
  hslToRgb,
  parseHslString,
  parseRgbString,
  rgbToHsl,
} from '../tools/color-picker/color'

describe('color-picker conversions', () => {
  it('parses hex with optional # and surrounding whitespace', () => {
    expect(hexToRgb('663399')).toEqual({ r: 102, g: 51, b: 153 })
    expect(hexToRgb('  #663399 ')).toEqual({ r: 102, g: 51, b: 153 })
    expect(hexToRgb('#ABCDEF')).toEqual({ r: 171, g: 205, b: 239 })
    expect(hexToRgb('66#3399')).toBeNull()
  })

  it('rejects partial matches in rgb input instead of using a substring', () => {
    expect(parseRgbString('1.5, 2, 3')).toEqual({ r: 2, g: 2, b: 3 })
    expect(parseRgbString('-5, 10, 20')).toBeNull()
    expect(parseRgbString('1, 2, 3, 4')).toBeNull()
  })

  it('accepts the rgb() form that the copy button gives', () => {
    expect(parseRgbString('rgb(102, 51, 153)')).toEqual({ r: 102, g: 51, b: 153 })
    expect(parseRgbString(' 102,51,153 ')).toEqual({ r: 102, g: 51, b: 153 })
  })

  it('rejects partial matches in hsl input instead of using a substring', () => {
    expect(parseHslString('-30, 50%, 50%')).toBeNull()
    expect(parseHslString('270.5, 50%, 40%')).toEqual({ h: 270.5, s: 50, l: 40 })
    expect(parseHslString('hsl(270, 50%, 40%)')).toEqual({ h: 270, s: 50, l: 40 })
  })

  it('shows a hue that rounds to 360 as 0', () => {
    expect(rgbToHsl({ r: 255, g: 0, b: 2 }).h).toBe(0)
    expect(hslToRgb({ h: 360, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('gives hue 0 and saturation 0 for greys', () => {
    expect(rgbToHsl({ r: 128, g: 128, b: 128 })).toEqual({ h: 0, s: 0, l: 50 })
  })
})

describe('color-picker contrast', () => {
  it('uses WCAG relative luminance', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 5)
  })

  it('picks the text color with the higher contrast ratio', () => {
    // A naive gamma-encoded luminance picked white here (2.7:1) instead of dark (6.4:1).
    expect(getContrastColor('#ff4bff')).toBe('#1a1a1a')
    expect(getContrastColor('#00a0a0')).toBe('#1a1a1a')
    expect(getContrastColor('#663399')).toBe('#ffffff')
    expect(getContrastColor('#ffffff')).toBe('#1a1a1a')
  })
})

describe('ColorPickerTool', () => {
  const type = (input: HTMLElement, value: string) => {
    for (let i = 1; i <= value.length; i++) fireEvent.change(input, { target: { value: value.slice(0, i) } })
  }

  it('keeps the hsl text as typed and lets the user type a two-digit lightness', () => {
    render(<ColorPickerTool />)
    const hsl = screen.getByLabelText('HSL') as HTMLInputElement
    type(hsl, '120, 50, 40')
    expect(hsl.value).toBe('120, 50, 40')
    expect((screen.getByLabelText('HEX') as HTMLInputElement).value).toBe('#339933')
    expect((screen.getByLabelText('RGB') as HTMLInputElement).value).toBe('51, 153, 51')
  })

  it('keeps the rgb text as typed', () => {
    render(<ColorPickerTool />)
    const rgb = screen.getByLabelText('RGB') as HTMLInputElement
    type(rgb, 'rgb(10,20,30)')
    expect(rgb.value).toBe('rgb(10,20,30)')
    expect((screen.getByLabelText('HEX') as HTMLInputElement).value).toBe('#0a141e')
  })

  it('accepts a pasted hex value with whitespace', () => {
    render(<ColorPickerTool />)
    fireEvent.change(screen.getByLabelText('HEX'), { target: { value: ' #FF0000 ' } })
    expect(screen.queryByText(/valid 6-digit hex/)).toBeNull()
    expect((screen.getByLabelText('RGB') as HTMLInputElement).value).toBe('255, 0, 0')
  })
})

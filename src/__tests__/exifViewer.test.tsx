import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ExifViewerTool from '../tools/exif-viewer'
import { formatExifValue, getGpsCoordinates, parseExif } from '../tools/exif-viewer/logic'

// ─── EXIF buffer builder ────────────────────────────────────────────────────

interface Entry {
  tag: number
  type: number
  count: number
  bytes: number[] // raw value bytes, already in file byte order
}

function u16(v: number, le: boolean): number[] {
  return le ? [v & 0xff, (v >> 8) & 0xff] : [(v >> 8) & 0xff, v & 0xff]
}

function u32(v: number, le: boolean): number[] {
  const b = [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]
  return le ? b.reverse() : b
}

const ascii = (tag: number, s: string, nul = true): Entry => {
  const bytes = [...s].map(c => c.charCodeAt(0))
  if (nul) bytes.push(0)
  return { tag, type: 2, count: bytes.length, bytes }
}
const short = (tag: number, v: number, le: boolean): Entry => ({ tag, type: 3, count: 1, bytes: u16(v, le) })
const byte = (tag: number, v: number): Entry => ({ tag, type: 1, count: 1, bytes: [v] })
const undef = (tag: number, bytes: number[]): Entry => ({ tag, type: 7, count: bytes.length, bytes })
const rationals = (tag: number, pairs: [number, number][], le: boolean): Entry => ({
  tag, type: 5, count: pairs.length, bytes: pairs.flatMap(([n, d]) => [...u32(n, le), ...u32(d, le)]),
})

function ifdSize(entries: Entry[]): number {
  return 2 + entries.length * 12 + 4
}

function writeIfd(out: number[], entries: Entry[], le: boolean, dataStart: number, data: number[]) {
  out.push(...u16(entries.length, le))
  for (const e of entries) {
    out.push(...u16(e.tag, le), ...u16(e.type, le), ...u32(e.count, le))
    if (e.bytes.length <= 4) {
      out.push(...e.bytes, ...new Array(4 - e.bytes.length).fill(0))
    } else {
      out.push(...u32(dataStart + data.length, le))
      data.push(...e.bytes)
      if (data.length % 2) data.push(0)
    }
  }
  out.push(...u32(0, le))
}

function buildTiff(le: boolean, ifd0: Entry[], exif: Entry[] = [], gps: Entry[] = []): Uint8Array {
  const ifd0All = [...ifd0]
  // Pointer entries are 4-byte LONGs; reserve them so sizes are known.
  if (exif.length) ifd0All.push({ tag: 0x8769, type: 4, count: 1, bytes: [0, 0, 0, 0] })
  if (gps.length) ifd0All.push({ tag: 0x8825, type: 4, count: 1, bytes: [0, 0, 0, 0] })
  const ifd0Off = 8
  const exifOff = ifd0Off + ifdSize(ifd0All)
  const gpsOff = exifOff + (exif.length ? ifdSize(exif) : 0)
  const dataStart = gpsOff + (gps.length ? ifdSize(gps) : 0)
  for (const e of ifd0All) {
    if (e.tag === 0x8769) e.bytes = u32(exifOff, le)
    if (e.tag === 0x8825) e.bytes = u32(gpsOff, le)
  }

  const out: number[] = le ? [0x49, 0x49, ...u16(42, le)] : [0x4d, 0x4d, ...u16(42, le)]
  out.push(...u32(ifd0Off, le))
  const data: number[] = []
  writeIfd(out, ifd0All, le, dataStart, data)
  if (exif.length) writeIfd(out, exif, le, dataStart, data)
  if (gps.length) writeIfd(out, gps, le, dataStart, data)
  out.push(...data)
  return new Uint8Array(out)
}

function wrapJpeg(tiff: Uint8Array): Uint8Array {
  const segLen = 2 + 6 + tiff.length
  return new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe1, (segLen >> 8) & 0xff, segLen & 0xff,
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    ...tiff,
    0xff, 0xd9,
  ])
}

const buf = (u8: Uint8Array): ArrayBuffer => u8.slice().buffer

// ─── Parser ─────────────────────────────────────────────────────────────────

describe('parseExif', () => {
  for (const le of [true, false]) {
    it(`decodes a JPEG APP1 segment (${le ? 'II' : 'MM'})`, () => {
      const tiff = buildTiff(
        le,
        [ascii(0x010f, 'Canon'), ascii(0x0110, 'Canon EOS R5'), short(0x0112, 6, le)],
        [rationals(0x829a, [[1, 250]], le), rationals(0x829d, [[28, 10]], le), short(0x8827, 400, le), undef(0x9000, [0x30, 0x32, 0x33, 0x32])],
        [
          ascii(0x0001, 'S'), rationals(0x0002, [[33, 1], [51, 1], [3156, 100]], le),
          ascii(0x0003, 'W'), rationals(0x0004, [[151, 1], [12, 1], [3000, 100]], le),
          byte(0x0005, 1), rationals(0x0006, [[125, 10]], le),
        ],
      )
      const result = parseExif(buf(wrapJpeg(tiff)))
      expect(result).not.toBeNull()
      expect(result!.image.Make).toBe('Canon')
      expect(result!.image.Model).toBe('Canon EOS R5')
      expect(result!.image.Orientation).toBe(6)
      expect(result!.image.ExifIFDPointer).toBeUndefined()
      expect(result!.exif.ExposureTime).toBeCloseTo(0.004)
      expect(result!.exif.FNumber).toBe(2.8)
      expect(result!.exif.ISOSpeedRatings).toBe(400)
      expect(formatExifValue('ExifVersion', result!.exif.ExifVersion as number[])).toBe('0232')
      expect(result!.gps.GPSAltitudeRef).toBe(1)
      const coords = getGpsCoordinates(result!.gps)!
      expect(coords.lat).toBeCloseTo(-(33 + 51 / 60 + 31.56 / 3600), 6)
      expect(coords.lng).toBeCloseTo(-(151 + 12 / 60 + 30 / 3600), 6)
    })
  }

  it('decodes a bare TIFF file (II and MM)', () => {
    for (const le of [true, false]) {
      const tiff = buildTiff(le, [ascii(0x010f, 'Nikon'), short(0x0112, 3, le)])
      const result = parseExif(buf(tiff))
      expect(result).not.toBeNull()
      expect(result!.image.Make).toBe('Nikon')
      expect(result!.image.Orientation).toBe(3)
    }
  })

  it('rejects a TIFF header with an unknown byte order', () => {
    const tiff = buildTiff(true, [ascii(0x010f, 'Nikon')])
    tiff[0] = 0x58
    tiff[1] = 0x58
    expect(parseExif(buf(wrapJpeg(tiff)))).toBeNull()
  })

  it('keeps the last character of an ASCII value that has no NUL terminator', () => {
    const tiff = buildTiff(true, [ascii(0x010f, 'Sony', false), ascii(0x0110, 'ILCE-7M3', false)])
    const result = parseExif(buf(wrapJpeg(tiff)))!
    expect(result.image.Make).toBe('Sony')
    expect(result.image.Model).toBe('ILCE-7M3')
  })

  it('follows a sub-IFD pointer that uses the IFD (13) type', () => {
    const le = true
    const tiff = buildTiff(le, [ascii(0x010f, 'Pentax')], [short(0x8827, 200, le)])
    // Change the type of the Exif pointer entry (the last IFD0 entry) from LONG to IFD.
    const view = new DataView(tiff.buffer)
    const count = view.getUint16(8, le)
    const pointerEntry = 8 + 2 + (count - 1) * 12
    expect(view.getUint16(pointerEntry, le)).toBe(0x8769)
    view.setUint16(pointerEntry + 2, 13, le)
    expect(parseExif(buf(wrapJpeg(tiff)))!.exif.ISOSpeedRatings).toBe(200)
  })

  it('returns null for truncated or malformed input without throwing', () => {
    const full = wrapJpeg(buildTiff(true, [ascii(0x010f, 'Canon')]))
    for (let n = 0; n < full.length; n++) {
      expect(() => parseExif(buf(full.slice(0, n)))).not.toThrow()
    }
    expect(parseExif(buf(new Uint8Array([0x89, 0x50, 0x4e, 0x47])))).toBeNull()
  })
})

// ─── Formatting ─────────────────────────────────────────────────────────────

describe('formatExifValue', () => {
  it('formats short exposure times as fractions', () => {
    expect(formatExifValue('ExposureTime', 1 / 250)).toBe('1/250s')
    expect(formatExifValue('ExposureTime', 1 / 3)).toBe('1/3s')
    expect(formatExifValue('ExposureTime', 0.5)).toBe('1/2s')
  })

  it('does not round long exposures to a wrong fraction', () => {
    expect(formatExifValue('ExposureTime', 0.6)).toBe('0.6s')
    expect(formatExifValue('ExposureTime', 0.8)).toBe('0.8s')
    expect(formatExifValue('ExposureTime', 0.3)).toBe('0.3s')
    expect(formatExifValue('ExposureTime', 2.5)).toBe('2.5s')
    expect(formatExifValue('ExposureTime', 30)).toBe('30s')
  })

  it('does not show "1/Infinity" for a zero exposure time', () => {
    expect(formatExifValue('ExposureTime', 0)).toBe('0s')
  })

  it('decodes version tags as text', () => {
    expect(formatExifValue('ExifVersion', [0x30, 0x32, 0x33, 0x32])).toBe('0232')
    expect(formatExifValue('FlashpixVersion', [0x30, 0x31, 0x30, 0x30])).toBe('0100')
  })

  it('decodes an ASCII UserComment as text', () => {
    const header = [0x41, 0x53, 0x43, 0x49, 0x49, 0, 0, 0]
    const text = [...'Hello'].map(c => c.charCodeAt(0))
    expect(formatExifValue('UserComment', [...header, ...text, 0, 0])).toBe('Hello')
    expect(formatExifValue('UserComment', [0, 0, 0, 0, 0, 0, 0, 0, 0x20, 0x20])).toBe('')
  })
})

// ─── Component ──────────────────────────────────────────────────────────────

// FileReader stub: each read waits until the test calls flush().
const pendingReads: (() => void)[] = []

class DeferredFileReader {
  result: string | ArrayBuffer | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  readAsDataURL(_file: Blob) {
    pendingReads.push(() => { this.result = 'data:image/jpeg;base64,'; this.onload?.() })
  }
  readAsArrayBuffer(file: Blob) {
    pendingReads.push(() => {
      void file.arrayBuffer().then(ab => { this.result = ab; this.onload?.() })
    })
  }
}

async function flushReads() {
  await act(async () => {
    while (pendingReads.length) pendingReads.shift()!()
    await new Promise(r => setTimeout(r, 0))
  })
}

function jpegFile(make: string): File {
  return new File([wrapJpeg(buildTiff(true, [ascii(0x010f, make)])) as BlobPart], 'photo.jpg', { type: 'image/jpeg' })
}

function selectFile(container: HTMLElement, file: File) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
}

describe('ExifViewerTool', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    pendingReads.length = 0
  })

  it('shows EXIF data for a valid JPEG', async () => {
    vi.stubGlobal('FileReader', DeferredFileReader)
    const { container } = render(<ExifViewerTool />)
    selectFile(container, jpegFile('Fujifilm'))
    await flushReads()
    expect(screen.getAllByText('Fujifilm').length).toBeGreaterThan(0)
  })

  it('does not show an older file after an unsupported file is selected', async () => {
    vi.stubGlobal('FileReader', DeferredFileReader)
    const { container } = render(<ExifViewerTool />)
    selectFile(container, jpegFile('Fujifilm'))
    selectFile(container, new File(['x'], 'image.png', { type: 'image/png' }))
    await flushReads()
    expect(screen.queryAllByText('Fujifilm')).toHaveLength(0)
    expect(screen.queryByText(/reads EXIF data from JPEG and TIFF files only/)).not.toBeNull()
  })

  it('does not show the file after Clear when the read completes later', async () => {
    vi.stubGlobal('FileReader', DeferredFileReader)
    const { container } = render(<ExifViewerTool />)
    selectFile(container, jpegFile('Leica'))
    // Complete only the preview read, so that the EXIF read is still in progress.
    await act(async () => { pendingReads.shift()!() })
    fireEvent.click(screen.getByTitle('Clear'))
    await flushReads()
    expect(screen.queryAllByText('Leica')).toHaveLength(0)
    expect(screen.queryByTitle('Clear')).toBeNull()
  })

  it('shows an error when the file cannot be read', async () => {
    class FailingFileReader extends DeferredFileReader {
      readAsArrayBuffer(_file: Blob) { pendingReads.push(() => this.onerror?.()) }
    }
    vi.stubGlobal('FileReader', FailingFileReader)
    const { container } = render(<ExifViewerTool />)
    selectFile(container, jpegFile('Fujifilm'))
    await flushReads()
    expect(screen.queryByText(/Cannot read/)).not.toBeNull()
  })
})

// ─── Pure client-side EXIF parser ─────────────────────────────────────────────
// Parses EXIF (APP1) from JPEG files using a DataView over an ArrayBuffer.
// No external dependencies. Supports IFD0, Exif SubIFD, and GPS IFD.

export interface ExifData {
  [key: string]: string | number | number[] | undefined
}

export interface ParsedExif {
  image: ExifData
  exif: ExifData
  gps: ExifData
  thumbnail?: string // data URL
}

// ─── Tag dictionaries ─────────────────────────────────────────────────────────

const IFD0_TAGS: Record<number, string> = {
  0x010e: 'ImageDescription',
  0x010f: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x011a: 'XResolution',
  0x011b: 'YResolution',
  0x0128: 'ResolutionUnit',
  0x0131: 'Software',
  0x0132: 'DateTime',
  0x013b: 'Artist',
  0x0213: 'YCbCrPositioning',
  0x8298: 'Copyright',
  0x8769: 'ExifIFDPointer',
  0x8825: 'GPSInfoIFDPointer',
}

const EXIF_TAGS: Record<number, string> = {
  0x829a: 'ExposureTime',
  0x829d: 'FNumber',
  0x8822: 'ExposureProgram',
  0x8827: 'ISOSpeedRatings',
  0x9000: 'ExifVersion',
  0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized',
  0x9101: 'ComponentsConfiguration',
  0x9102: 'CompressedBitsPerPixel',
  0x9201: 'ShutterSpeedValue',
  0x9202: 'ApertureValue',
  0x9203: 'BrightnessValue',
  0x9204: 'ExposureBiasValue',
  0x9205: 'MaxApertureValue',
  0x9206: 'SubjectDistance',
  0x9207: 'MeteringMode',
  0x9208: 'LightSource',
  0x9209: 'Flash',
  0x920a: 'FocalLength',
  0x9286: 'UserComment',
  0xa000: 'FlashpixVersion',
  0xa001: 'ColorSpace',
  0xa002: 'PixelXDimension',
  0xa003: 'PixelYDimension',
  0xa20e: 'FocalPlaneXResolution',
  0xa20f: 'FocalPlaneYResolution',
  0xa210: 'FocalPlaneResolutionUnit',
  0xa217: 'SensingMethod',
  0xa300: 'FileSource',
  0xa301: 'SceneType',
  0xa401: 'CustomRendered',
  0xa402: 'ExposureMode',
  0xa403: 'WhiteBalance',
  0xa404: 'DigitalZoomRatio',
  0xa405: 'FocalLengthIn35mmFilm',
  0xa406: 'SceneCaptureType',
  0xa408: 'Contrast',
  0xa409: 'Saturation',
  0xa40a: 'Sharpness',
  0xa420: 'ImageUniqueID',
  0xa431: 'BodySerialNumber',
  0xa432: 'LensSpecification',
  0xa433: 'LensMake',
  0xa434: 'LensModel',
  0xa435: 'LensSerialNumber',
}

const GPS_TAGS: Record<number, string> = {
  0x0000: 'GPSVersionID',
  0x0001: 'GPSLatitudeRef',
  0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef',
  0x0004: 'GPSLongitude',
  0x0005: 'GPSAltitudeRef',
  0x0006: 'GPSAltitude',
  0x0007: 'GPSTimeStamp',
  0x0008: 'GPSSatellites',
  0x0009: 'GPSStatus',
  0x000a: 'GPSMeasureMode',
  0x000b: 'GPSDOP',
  0x000c: 'GPSSpeedRef',
  0x000d: 'GPSSpeed',
  0x000e: 'GPSTrackRef',
  0x000f: 'GPSTrack',
  0x0010: 'GPSImgDirectionRef',
  0x0011: 'GPSImgDirection',
  0x0012: 'GPSMapDatum',
  0x001d: 'GPSDateStamp',
}

// ─── Friendly formatting ──────────────────────────────────────────────────────

const ORIENTATION_MAP: Record<number, string> = {
  1: 'Normal',
  2: 'Mirrored horizontal',
  3: 'Rotated 180°',
  4: 'Mirrored vertical',
  5: 'Mirrored horizontal + rotated 270°',
  6: 'Rotated 90° CW',
  7: 'Mirrored horizontal + rotated 90°',
  8: 'Rotated 270° CW',
}

const EXPOSURE_PROGRAM_MAP: Record<number, string> = {
  0: 'Not defined',
  1: 'Manual',
  2: 'Normal program',
  3: 'Aperture priority',
  4: 'Shutter priority',
  5: 'Creative program',
  6: 'Action program',
  7: 'Portrait mode',
  8: 'Landscape mode',
}

const METERING_MODE_MAP: Record<number, string> = {
  0: 'Unknown',
  1: 'Average',
  2: 'Center-weighted average',
  3: 'Spot',
  4: 'Multi-spot',
  5: 'Pattern',
  6: 'Partial',
  255: 'Other',
}

const FLASH_MAP: Record<number, string> = {
  0x00: 'No flash',
  0x01: 'Fired',
  0x05: 'Fired, return not detected',
  0x07: 'Fired, return detected',
  0x09: 'Fired, compulsory',
  0x0d: 'Fired, compulsory, return not detected',
  0x0f: 'Fired, compulsory, return detected',
  0x10: 'No flash, compulsory',
  0x18: 'No flash, auto',
  0x19: 'Fired, auto',
  0x1d: 'Fired, auto, return not detected',
  0x1f: 'Fired, auto, return detected',
  0x20: 'No flash function',
  0x41: 'Fired, red-eye reduction',
  0x45: 'Fired, red-eye, return not detected',
  0x47: 'Fired, red-eye, return detected',
  0x49: 'Fired, compulsory, red-eye',
  0x4d: 'Fired, compulsory, red-eye, return not detected',
  0x4f: 'Fired, compulsory, red-eye, return detected',
  0x59: 'Fired, auto, red-eye',
  0x5d: 'Fired, auto, red-eye, return not detected',
  0x5f: 'Fired, auto, red-eye, return detected',
}

const WHITE_BALANCE_MAP: Record<number, string> = { 0: 'Auto', 1: 'Manual' }
const EXPOSURE_MODE_MAP: Record<number, string> = { 0: 'Auto', 1: 'Manual', 2: 'Auto bracket' }
const SCENE_CAPTURE_MAP: Record<number, string> = { 0: 'Standard', 1: 'Landscape', 2: 'Portrait', 3: 'Night scene' }
const CONTRAST_MAP: Record<number, string> = { 0: 'Normal', 1: 'Soft', 2: 'Hard' }
const SATURATION_MAP: Record<number, string> = { 0: 'Normal', 1: 'Low', 2: 'High' }
const RESOLUTION_UNIT_MAP: Record<number, string> = { 1: 'No unit', 2: 'inches', 3: 'centimeters' }
const COLOR_SPACE_MAP: Record<number, string> = { 1: 'sRGB', 65535: 'Uncalibrated' }

export function formatExifValue(key: string, value: string | number | number[]): string {
  if (typeof value === 'number') {
    switch (key) {
      case 'Orientation': return ORIENTATION_MAP[value] ?? `Unknown (${value})`
      case 'ExposureProgram': return EXPOSURE_PROGRAM_MAP[value] ?? `Unknown (${value})`
      case 'MeteringMode': return METERING_MODE_MAP[value] ?? `Unknown (${value})`
      case 'Flash': return FLASH_MAP[value] ?? `Flash (0x${value.toString(16)})`
      case 'WhiteBalance': return WHITE_BALANCE_MAP[value] ?? `Unknown (${value})`
      case 'ExposureMode': return EXPOSURE_MODE_MAP[value] ?? `Unknown (${value})`
      case 'SceneCaptureType': return SCENE_CAPTURE_MAP[value] ?? `Unknown (${value})`
      case 'Contrast':
      case 'Sharpness': return CONTRAST_MAP[value] ?? `Unknown (${value})`
      case 'Saturation': return SATURATION_MAP[value] ?? `Unknown (${value})`
      case 'ResolutionUnit': return RESOLUTION_UNIT_MAP[value] ?? `Unknown (${value})`
      case 'ColorSpace': return COLOR_SPACE_MAP[value] ?? `Unknown (${value})`
    }
  }
  if (key === 'ExposureTime' && typeof value === 'number') {
    return value < 1 ? `1/${Math.round(1 / value)}s` : `${value}s`
  }
  if (key === 'FNumber' && typeof value === 'number') {
    return `f/${value}`
  }
  if (key === 'FocalLength' && typeof value === 'number') {
    return `${value}mm`
  }
  if (key === 'FocalLengthIn35mmFilm' && typeof value === 'number') {
    return `${value}mm`
  }
  if (key === 'GPSAltitude' && typeof value === 'number') {
    return `${value.toFixed(1)}m`
  }
  if (key === 'ExposureBiasValue' && typeof value === 'number') {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)} EV`
  }
  if (Array.isArray(value)) {
    return value.map(v => typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(4)) : v).join(', ')
  }
  return String(value)
}

// ─── GPS coordinate helpers ───────────────────────────────────────────────────

export function dmsToDecimal(dms: number[], ref: string): number {
  const [d = 0, m = 0, s = 0] = dms
  let decimal = d + m / 60 + s / 3600
  if (ref === 'S' || ref === 'W') decimal = -decimal
  return decimal
}

export function formatDms(dms: number[], ref: string): string {
  const [d = 0, m = 0, s = 0] = dms
  return `${d}° ${m}' ${s.toFixed(2)}" ${ref}`
}

export function getGpsCoordinates(gps: ExifData): { lat: number; lng: number } | null {
  const lat = gps.GPSLatitude
  const latRef = gps.GPSLatitudeRef
  const lng = gps.GPSLongitude
  const lngRef = gps.GPSLongitudeRef
  if (!Array.isArray(lat) || typeof latRef !== 'string' || !Array.isArray(lng) || typeof lngRef !== 'string') {
    return null
  }
  return {
    lat: dmsToDecimal(lat, latRef),
    lng: dmsToDecimal(lng, lngRef),
  }
}

// ─── Binary EXIF parser ──────────────────────────────────────────────────────

function readTagValue(
  view: DataView,
  format: number,
  count: number,
  valueOffset: number,
  littleEndian: boolean,
): string | number | number[] | undefined {
  switch (format) {
    case 1: // BYTE
    case 7: { // UNDEFINED
      if (count === 1) return view.getUint8(valueOffset)
      const bytes: number[] = []
      for (let i = 0; i < count; i++) bytes.push(view.getUint8(valueOffset + i))
      return bytes
    }
    case 2: { // ASCII
      let str = ''
      for (let i = 0; i < count - 1; i++) {
        const c = view.getUint8(valueOffset + i)
        if (c === 0) break
        str += String.fromCharCode(c)
      }
      return str.trim()
    }
    case 3: { // SHORT
      if (count === 1) return view.getUint16(valueOffset, littleEndian)
      const shorts: number[] = []
      for (let i = 0; i < count; i++) shorts.push(view.getUint16(valueOffset + i * 2, littleEndian))
      return shorts
    }
    case 4: { // LONG
      if (count === 1) return view.getUint32(valueOffset, littleEndian)
      const longs: number[] = []
      for (let i = 0; i < count; i++) longs.push(view.getUint32(valueOffset + i * 4, littleEndian))
      return longs
    }
    case 5: { // RATIONAL (two LONGs: numerator/denominator)
      if (count === 1) {
        const num = view.getUint32(valueOffset, littleEndian)
        const den = view.getUint32(valueOffset + 4, littleEndian)
        return den === 0 ? 0 : num / den
      }
      const rats: number[] = []
      for (let i = 0; i < count; i++) {
        const off = valueOffset + i * 8
        const num = view.getUint32(off, littleEndian)
        const den = view.getUint32(off + 4, littleEndian)
        rats.push(den === 0 ? 0 : num / den)
      }
      return rats
    }
    case 9: { // SLONG
      if (count === 1) return view.getInt32(valueOffset, littleEndian)
      const slongs: number[] = []
      for (let i = 0; i < count; i++) slongs.push(view.getInt32(valueOffset + i * 4, littleEndian))
      return slongs
    }
    case 10: { // SRATIONAL
      if (count === 1) {
        const num = view.getInt32(valueOffset, littleEndian)
        const den = view.getInt32(valueOffset + 4, littleEndian)
        return den === 0 ? 0 : num / den
      }
      const srats: number[] = []
      for (let i = 0; i < count; i++) {
        const off = valueOffset + i * 8
        const num = view.getInt32(off, littleEndian)
        const den = view.getInt32(off + 4, littleEndian)
        srats.push(den === 0 ? 0 : num / den)
      }
      return srats
    }
    default:
      return undefined
  }
}

const FORMAT_SIZES: Record<number, number> = {
  1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8,
}

function readIFD(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  tags: Record<number, string>,
  littleEndian: boolean,
): ExifData {
  const result: ExifData = {}
  const ifdStart = tiffStart + ifdOffset

  // Bounds check: need at least 2 bytes to read entry count
  if (ifdStart < 0 || ifdStart + 2 > view.byteLength) return result

  const entryCount = view.getUint16(ifdStart, littleEndian)

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifdStart + 2 + i * 12

    // Bounds check: each IFD entry is 12 bytes
    if (entryOffset + 12 > view.byteLength) break

    const tag = view.getUint16(entryOffset, littleEndian)
    const format = view.getUint16(entryOffset + 2, littleEndian)
    const count = view.getUint32(entryOffset + 4, littleEndian)

    const tagName = tags[tag]
    if (!tagName) continue

    const byteSize = (FORMAT_SIZES[format] ?? 1) * count
    let valueOffset: number
    if (byteSize <= 4) {
      valueOffset = entryOffset + 8
    } else {
      valueOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian)
    }

    // Bounds check
    if (valueOffset < 0 || valueOffset + byteSize > view.byteLength) continue

    const value = readTagValue(view, format, count, valueOffset, littleEndian)
    if (value !== undefined) {
      result[tagName] = value
    }
  }

  return result
}

export function parseExif(buffer: ArrayBuffer): ParsedExif | null {
  try {
    const view = new DataView(buffer)

    // Guard against tiny/truncated files
    if (view.byteLength < 4) return null

    // Find JPEG SOI
    if (view.getUint16(0) !== 0xFFD8) return null

    // Walk JPEG segments to find APP1 (EXIF)
    let offset = 2
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset)
      if (marker === 0xFFE1) {
        // APP1 found
        const segLen = view.getUint16(offset + 2)
        // Validate segment fits in buffer and is large enough for "Exif\0\0" header (8 bytes)
        if (segLen < 8 || offset + 2 + segLen > view.byteLength) {
          offset += 2 + segLen
          continue
        }
        // Check "Exif\0\0" header
        if (
          view.getUint8(offset + 4) === 0x45 && // E
          view.getUint8(offset + 5) === 0x78 && // x
          view.getUint8(offset + 6) === 0x69 && // i
          view.getUint8(offset + 7) === 0x66 && // f
          view.getUint8(offset + 8) === 0x00 &&
          view.getUint8(offset + 9) === 0x00
        ) {
          return parseExifFromTiff(view, offset + 10)
        }
        offset += 2 + segLen
      } else if ((marker & 0xFF00) === 0xFF00) {
        // Other marker — skip
        if (marker === 0xFFDA) break // Start of scan, stop
        if (offset + 4 > view.byteLength) break
        const len = view.getUint16(offset + 2)
        offset += 2 + len
      } else {
        break
      }
    }

    return null
  } catch {
    // Malformed binary data — return null gracefully
    return null
  }
}

function parseExifFromTiff(view: DataView, tiffStart: number): ParsedExif {
  const byteOrder = view.getUint16(tiffStart)
  const littleEndian = byteOrder === 0x4949 // "II"

  const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian)
  const ifd0 = readIFD(view, tiffStart, ifd0Offset, IFD0_TAGS, littleEndian)

  let exifIFD: ExifData = {}
  let gpsIFD: ExifData = {}

  // Exif SubIFD
  const exifPointer = ifd0.ExifIFDPointer
  if (typeof exifPointer === 'number') {
    exifIFD = readIFD(view, tiffStart, exifPointer, EXIF_TAGS, littleEndian)
  }

  // GPS IFD
  const gpsPointer = ifd0.GPSInfoIFDPointer
  if (typeof gpsPointer === 'number') {
    gpsIFD = readIFD(view, tiffStart, gpsPointer, GPS_TAGS, littleEndian)
  }

  // Clean up internal pointers from image data
  const image = { ...ifd0 }
  delete image.ExifIFDPointer
  delete image.GPSInfoIFDPointer

  return { image, exif: exifIFD, gps: gpsIFD }
}

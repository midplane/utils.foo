export type Mode = 'encode' | 'decode'
export type EncodeType = 'component' | 'full'

export interface ConvertResult {
  output: string
  error: string
}

export function convert(value: string, mode: Mode, encodeType: EncodeType): ConvertResult {
  // Do not trim. Whitespace is valid input and encodes to %20.
  if (!value) return { output: '', error: '' }

  try {
    if (mode === 'encode') {
      return { output: encodeType === 'component' ? encodeURIComponent(value) : encodeURI(value), error: '' }
    }
    return { output: encodeType === 'component' ? decodeURIComponent(value) : decodeURI(value), error: '' }
  } catch {
    return { output: '', error: mode === 'decode' ? 'Invalid encoded input' : 'Failed to encode' }
  }
}

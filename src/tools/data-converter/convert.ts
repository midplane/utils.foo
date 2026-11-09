import * as yaml from 'js-yaml'
import Papa from 'papaparse'
import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser'
import { parse as parseTOML, stringify as stringifyTOML } from 'smol-toml'

export type ConversionId =
  | 'json-yaml' | 'yaml-json'
  | 'json-toml' | 'toml-json'
  | 'json-csv'  | 'csv-json'
  | 'json-xml'  | 'xml-json'

// ─── Scalar coercion ──────────────────────────────────────────────────────────

// CSV and XML values are text. Change a value to a number only when the number
// prints back to the same text. This keeps ZIP codes ("02134"), versions
// ("1.10"), hex ("0x1F") and integers larger than 2^53 as exact strings.
export function coerceScalar(value: string): string | number | boolean {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === '' || value.trim() !== value) return value
  const n = Number(value)
  return Number.isFinite(n) && String(n) === value ? n : value
}

function coerceCsvCell(value: string): string | number | boolean | null {
  if (value === '') return null
  if (value === 'TRUE') return true
  if (value === 'FALSE') return false
  return coerceScalar(value)
}

function coerceTree(value: unknown): unknown {
  if (typeof value === 'string') return coerceScalar(value)
  if (Array.isArray(value)) return value.map(coerceTree)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = coerceTree(v)
    return out
  }
  return value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// ─── YAML ─────────────────────────────────────────────────────────────────────

// The default schema reads plain dates as Date objects, and JSON then writes
// them as UTC timestamps ("2024-01-01" becomes "2024-01-01T00:00:00.000Z").
// This type has the same tag, so it replaces the default timestamp type and
// keeps the text as written.
const YAML_TIMESTAMP = new RegExp(
  '^(?:[0-9]{4}-[0-9]{2}-[0-9]{2}' +
  '|[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}(?:[Tt]|[ \\t]+)[0-9]{1,2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]*)?' +
  '(?:[ \\t]*(?:Z|[-+][0-9]{1,2}(?::[0-9]{2})?))?)$',
)

const YAML_LOAD_SCHEMA = yaml.DEFAULT_SCHEMA.extend({
  implicit: [
    new yaml.Type('tag:yaml.org,2002:timestamp', {
      kind: 'scalar',
      resolve: (data: unknown) => typeof data === 'string' && YAML_TIMESTAMP.test(data),
      construct: (data: string) => data,
    }),
  ],
})

// ─── CSV ──────────────────────────────────────────────────────────────────────

function cellValue(value: unknown): unknown {
  return value !== null && typeof value === 'object' ? JSON.stringify(value) : value
}

function toCsv(value: unknown): string {
  const rows = Array.isArray(value) ? value : [value]
  if (rows.length === 0) return ''

  if (rows.every(Array.isArray)) {
    return Papa.unparse(rows.map((row: unknown[]) => row.map(cellValue)))
  }

  if (rows.every(isPlainObject)) {
    // Use the keys of all rows. Papa uses only the keys of the first row.
    const fields: string[] = []
    const seen = new Set<string>()
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) { seen.add(key); fields.push(key) }
      }
    }
    const data = rows.map((row) => fields.map((f) => cellValue(row[f])))
    return Papa.unparse({ fields, data })
  }

  throw new Error('CSV needs an object, an array of objects, or an array of arrays. Do not mix items of different kinds.')
}

function fromCsv(text: string): unknown {
  const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true })
  // Papa sets this when the input has one column. It then uses a comma, which is correct.
  const errors = result.errors.filter((e) => e.code !== 'UndetectableDelimiter')
  const first = errors[0]
  if (first) {
    throw new Error(first.row === undefined ? first.message : `Data row ${first.row + 1}: ${first.message}`)
  }
  return result.data.map((row) => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(row)) {
      out[k] = typeof v === 'string' ? coerceCsvCell(v)
        : Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? coerceCsvCell(x) : x))
        : v
    }
    return out
  })
}

// ─── TOML ─────────────────────────────────────────────────────────────────────

// TOML has no null. smol-toml removes null keys without an error, which loses data.
function assertNoNull(value: unknown, path: string) {
  if (value === null) throw new Error(`TOML has no null value. Remove or replace the null at "${path}".`)
  if (Array.isArray(value)) value.forEach((v, i) => assertNoNull(v, `${path}[${i}]`))
  else if (isPlainObject(value)) {
    for (const [k, v] of Object.entries(value)) assertNoNull(v, path ? `${path}.${k}` : k)
  }
}

// ─── XML ──────────────────────────────────────────────────────────────────────

function validateXml(text: string): string | null {
  const result = XMLValidator.validate(text)
  if (result === true) return null
  return `Line ${result.err.line}, column ${result.err.col}: ${result.err.msg}`
}

function toXml(value: unknown): string {
  // Keys with the "@_" prefix become attributes, the same as in XML → JSON.
  const builder = new XMLBuilder({ format: true, indentBy: '  ', suppressEmptyNode: true, ignoreAttributes: false })
  // A top-level array would give many root elements, which is not valid XML.
  const root = Array.isArray(value) ? { item: value } : value
  const xml = (builder.build({ root }) as string).trimEnd()
  const problem = validateXml(xml)
  if (problem) throw new Error(`The data cannot be written as XML. Make sure that all keys are valid XML names. ${problem}`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`
}

function fromXml(text: string): unknown {
  const problem = validateXml(text)
  if (problem) throw new Error(problem)
  const parser = new XMLParser({
    ignoreAttributes: false,
    ignoreDeclaration: true,
    ignorePiTags: true,
    parseTagValue: false,
    parseAttributeValue: false,
  })
  const obj = coerceTree(parser.parse(text)) as Record<string, unknown>
  // Unwrap single root key if present
  const keys = Object.keys(obj)
  return keys.length === 1 ? obj[keys[0]!] : obj
}

// ─── Converter ────────────────────────────────────────────────────────────────

export function convert(id: ConversionId, input: string): { output: string; error?: string } {
  const trimmed = input.trim()
  if (!trimmed) return { output: '' }

  try {
    switch (id) {
      case 'json-yaml': {
        const obj = JSON.parse(trimmed)
        return { output: yaml.dump(obj, { indent: 2, lineWidth: -1 }).trimEnd() }
      }
      case 'yaml-json': {
        const obj = yaml.load(trimmed, { schema: YAML_LOAD_SCHEMA })
        return { output: JSON.stringify(obj, null, 2) }
      }
      case 'json-toml': {
        const obj = JSON.parse(trimmed)
        if (isPlainObject(obj)) assertNoNull(obj, '')
        return { output: stringifyTOML(obj) }
      }
      case 'toml-json': {
        const obj = parseTOML(trimmed)
        return { output: JSON.stringify(obj, null, 2) }
      }
      case 'json-csv': {
        return { output: toCsv(JSON.parse(trimmed)) }
      }
      case 'csv-json': {
        return { output: JSON.stringify(fromCsv(trimmed), null, 2) }
      }
      case 'json-xml': {
        return { output: toXml(JSON.parse(trimmed)) }
      }
      case 'xml-json': {
        return { output: JSON.stringify(fromXml(trimmed), null, 2) }
      }
    }
  } catch (e) {
    return { output: '', error: (e as Error).message }
  }
}

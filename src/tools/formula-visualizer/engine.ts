import { parse, evaluate, isSymbolNode, isComplex, MathNode } from 'mathjs'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VarConfig {
  value: number
  min: number
  max: number
  step: number
}

export interface FormulaLine {
  id: string
  name: string      // Variable name (empty for final result line)
  expression: string
}

export interface AppState {
  lines: FormulaLine[]
  vars: Record<string, VarConfig>
  sweepVar: string
}

export type VarsMap = Record<string, VarConfig>

export const DEFAULT_VAR: VarConfig = { value: 50, min: 0, max: 100, step: 1 }

export const CHART_POINTS = 80

// ─── URL State ────────────────────────────────────────────────────────────────

// Base64url encoding (URL-safe, no padding)
function toBase64Url(str: string): string {
  const base64 = btoa(unescape(encodeURIComponent(str)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(base64url: string): string {
  // Restore standard base64 characters and padding
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  return decodeURIComponent(escape(atob(base64)))
}

export function encodeState(state: AppState): string {
  try {
    return toBase64Url(JSON.stringify(state))
  } catch {
    return ''
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

// A link can be edited by hand, so keep only the fields that have the correct type.
// Without this check, a value such as `"vars": null` stops the tool when it renders.
export function decodeState(hash: string): AppState | null {
  try {
    const raw: unknown = JSON.parse(fromBase64Url(hash))
    if (!isRecord(raw) || !Array.isArray(raw.lines)) return null

    const lines: FormulaLine[] = raw.lines.filter(isRecord).map((l, i) => ({
      id: typeof l.id === 'string' && l.id ? l.id : String(i + 1),
      name: typeof l.name === 'string' ? l.name : '',
      expression: typeof l.expression === 'string' ? l.expression : '',
    }))
    if (lines.length === 0) lines.push({ id: '1', name: '', expression: '' })

    const vars: VarsMap = {}
    if (isRecord(raw.vars)) {
      for (const [name, cfg] of Object.entries(raw.vars)) {
        if (!isRecord(cfg)) continue
        vars[name] = {
          value: isNum(cfg.value) ? cfg.value : DEFAULT_VAR.value,
          min: isNum(cfg.min) ? cfg.min : DEFAULT_VAR.min,
          max: isNum(cfg.max) ? cfg.max : DEFAULT_VAR.max,
          step: isNum(cfg.step) && cfg.step > 0 ? cfg.step : DEFAULT_VAR.step,
        }
      }
    }

    return { lines, vars, sweepVar: typeof raw.sweepVar === 'string' ? raw.sweepVar : '' }
  } catch {
    return null
  }
}

// ─── Variable detection ───────────────────────────────────────────────────────

const builtinCache = new Map<string, unknown>()

function builtinValue(name: string): unknown {
  if (builtinCache.has(name)) return builtinCache.get(name)
  let result: unknown = undefined
  try {
    result = evaluate(name)
  } catch {
    // Not a builtin
  }
  builtinCache.set(name, result)
  return result
}

// A symbol in call position (`sqrt` in `sqrt(x)`) is a builtin when mathjs has a function
// with that name. A symbol in other positions is a builtin only when it is a numeric
// constant (`pi`, `e`). Names such as `distance`, `sum` or `count` are mathjs functions,
// but without a call they are user variables.
function isBuiltinSymbol(name: string, isCall: boolean): boolean {
  const val = builtinValue(name)
  return isCall ? typeof val === 'function' : typeof val === 'number'
}

export function extractVarsFromExpression(expression: string, definedVars: Set<string>): string[] {
  const names: string[] = []
  try {
    parse(expression).traverse((node: MathNode, path: string) => {
      if (isSymbolNode(node) && !isBuiltinSymbol(node.name, path === 'fn') && !definedVars.has(node.name)) {
        names.push(node.name)
      }
    })
  } catch {
    // Parse failed
  }
  return [...new Set(names)]
}

// The last line is always the result line, so its name (hidden in the UI) is ignored.
function lineName(lines: FormulaLine[], idx: number): string {
  return idx === lines.length - 1 ? '' : lines[idx]!.name
}

/** Names that the formulas reference but that no line defines. */
export function findInputVarNames(lines: FormulaLine[]): string[] {
  const defined = new Set<string>()
  const allReferenced: string[] = []

  lines.forEach((line, idx) => {
    const name = lineName(lines, idx)
    if (name) defined.add(name)
    allReferenced.push(...extractVarsFromExpression(line.expression, defined))
  })

  return [...new Set(allReferenced)].filter(n => !defined.has(n))
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

// Evaluate an expression, optionally supporting math expressions in input
export function evaluateExpression(expr: string): number | null {
  if (!expr.trim()) return null
  try {
    const result = evaluate(expr)
    if (typeof result === 'number' && isFinite(result)) {
      return result
    }
  } catch {
    // Invalid expression
  }
  return null
}

export interface EvaluationResult {
  computedVars: Record<string, number>
  result: number | null
  error: string | null
}

// Evaluate all formula lines and return computed values + final result
export function evaluateLines(lines: FormulaLine[], inputVars: VarsMap): EvaluationResult {
  const computedVars: Record<string, number> = {}

  // Start with input variable values
  for (const [name, config] of Object.entries(inputVars)) {
    computedVars[name] = config.value
  }

  let result: number | null = null
  let error: string | null = null

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx]!
    if (!line.expression.trim()) continue
    const isResultLine = idx === lines.length - 1
    const name = lineName(lines, idx)
    const label = name || 'result'

    try {
      const val: unknown = evaluate(line.expression, computedVars)
      if (typeof val !== 'number') {
        error = isComplex(val)
          ? `"${label}" is a complex number (for example, the square root or log of a negative number)`
          : `"${label}" is not a number`
        break
      }
      if (Number.isNaN(val)) {
        error = `"${label}" is not a number (NaN)`
        break
      }
      if (!isFinite(val)) {
        error = `"${label}" is infinite (division by zero or overflow)`
        break
      }

      if (isResultLine) {
        result = val
      } else if (name) {
        computedVars[name] = val
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Evaluation failed'
      break
    }
  }

  return { computedVars, result, error }
}

// ─── Sweep ────────────────────────────────────────────────────────────────────

/** `y` is null where the formula has no finite real value, or across a pole. */
export type SweepPoint = [x: number, y: number | null]

function resultAt(lines: FormulaLine[], inputVars: VarsMap, sweepVar: string, x: number): number | null {
  const modifiedVars: VarsMap = {}
  for (const [k, cfg] of Object.entries(inputVars)) {
    modifiedVars[k] = { ...cfg, value: k === sweepVar ? x : cfg.value }
  }
  return evaluateLines(lines, modifiedVars).result
}

// Removes float noise such as 0.30000000000000004 but keeps small magnitudes.
const tidy = (v: number) => Number(v.toPrecision(12))

export function sampleSweep(
  lines: FormulaLine[],
  inputVars: VarsMap,
  sweepVar: string,
  count = CHART_POINTS,
): SweepPoint[] {
  const cfg = inputVars[sweepVar]
  if (!cfg) return []
  const { min, max } = cfg
  const xAt = (i: number) => min + ((max - min) * i) / count

  const samples: SweepPoint[] = []
  for (let i = 0; i <= count; i++) {
    const x = xAt(i)
    const y = resultAt(lines, inputVars, sweepVar, x)
    samples.push([tidy(x), y === null ? null : tidy(y)])
  }

  // A line between two samples of opposite sign is correct only when the function is
  // continuous between them. At a pole (1 / (x - a)) the value at the midpoint is not
  // between the two samples, so put a gap there and do not draw a vertical line.
  const out: SweepPoint[] = []
  for (let i = 0; i < samples.length; i++) {
    const cur = samples[i]!
    out.push(cur)
    const next = samples[i + 1]
    if (!next || cur[1] === null || next[1] === null) continue
    const [y1, y2] = [cur[1], next[1]]
    if (y1 * y2 >= 0) continue
    const mid = resultAt(lines, inputVars, sweepVar, (xAt(i) + xAt(i + 1)) / 2)
    if (mid === null || mid < Math.min(y1, y2) || mid > Math.max(y1, y2)) {
      out.push([tidy((cur[0] + next[0]) / 2), null])
    }
  }
  return out
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/** Show up to 4 decimals, but do not round small non-zero values down to "0". */
export function formatNumber(v: number): string {
  if (v !== 0 && Math.abs(v) < 1e-4) return String(Number(v.toPrecision(5)))
  return v.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

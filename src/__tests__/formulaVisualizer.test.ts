import { describe, it, expect } from 'vitest'
import {
  decodeState,
  encodeState,
  evaluateLines,
  findInputVarNames,
  formatNumber,
  sampleSweep,
  DEFAULT_VAR,
  type FormulaLine,
  type VarsMap,
} from '../tools/formula-visualizer/engine'

const line = (expression: string, name = '', id = expression): FormulaLine => ({ id, name, expression })
const vars = (values: Record<string, number>, over: Partial<typeof DEFAULT_VAR> = {}): VarsMap =>
  Object.fromEntries(Object.entries(values).map(([k, value]) => [k, { ...DEFAULT_VAR, ...over, value }]))

describe('input variable detection', () => {
  it('treats mathjs function names used without a call as variables', () => {
    expect(findInputVarNames([line('distance / time')]).sort()).toEqual(['distance', 'time'])
    expect(findInputVarNames([line('sum / count')]).sort()).toEqual(['count', 'sum'])
  })

  it('does not treat called functions or numeric constants as variables', () => {
    expect(findInputVarNames([line('sqrt(x) + max(a, b) * pi + e')]).sort()).toEqual(['a', 'b', 'x'])
  })

  it('evaluates a formula whose variable is also a mathjs function name', () => {
    const lines = [line('distance / time')]
    const inputs = vars({ distance: 10, time: 4 })
    expect(findInputVarNames(lines).every((n) => n in inputs)).toBe(true)
    expect(evaluateLines(lines, inputs)).toMatchObject({ result: 2.5, error: null })
  })

  it('ignores the hidden name of the last line', () => {
    expect(findInputVarNames([line('a * 2', 'b'), line('b + c', 'c')]).sort()).toEqual(['a', 'c'])
  })
})

describe('evaluateLines', () => {
  it('follows mathjs precedence', () => {
    expect(evaluateLines([line('2^3^2')], {}).result).toBe(512)
    expect(evaluateLines([line('-2^2')], {}).result).toBe(-4)
  })

  it('uses the last line as the result even when it has a name', () => {
    // This occurs after the user deletes the original result line.
    const lines = [line('a * 2', 'mrr'), line('mrr + 1', 'cac')]
    expect(evaluateLines(lines, vars({ a: 3 }))).toMatchObject({ result: 7, error: null })
  })

  it('does not use an unnamed intermediate line as the result', () => {
    expect(evaluateLines([line('1 + 1'), line('')], {}).result).toBeNull()
  })

  it('gives a correct message for infinite and NaN results', () => {
    expect(evaluateLines([line('2^2000')], {}).error).toMatch(/infinite.*overflow/)
    expect(evaluateLines([line('-1 / 0')], {}).error).toMatch(/infinite.*division by zero/)
    expect(evaluateLines([line('log(0)')], {}).error).toMatch(/infinite/)
    expect(evaluateLines([line('0 / 0')], {}).error).toMatch(/NaN/)
    expect(evaluateLines([line('sqrt(-1)')], {}).error).toMatch(/complex/)
  })

  it('names the failing intermediate line in the message', () => {
    expect(evaluateLines([line('1 / 0', 'k'), line('k')], {}).error).toMatch(/^"k"/)
  })
})

describe('sampleSweep', () => {
  it('keeps small result values', () => {
    const pts = sampleSweep([line('x * 1e-9')], vars({ x: 0 }), 'x', 10)
    expect(pts[pts.length - 1]).toEqual([100, 1e-7])
  })

  it('keeps distinct x values for a narrow range', () => {
    const pts = sampleSweep([line('x')], vars({ x: 0 }, { min: 0, max: 0.001 }), 'x', 80)
    expect(new Set(pts.map(([x]) => x)).size).toBe(81)
  })

  it('puts a gap where the formula has no real value', () => {
    const pts = sampleSweep([line('sqrt(x^2 - 100)')], vars({ x: 0 }, { min: -50, max: 50 }), 'x', 10)
    expect(pts.find(([x]) => x === 0)).toEqual([0, null])
  })

  it('puts a gap at a pole instead of a vertical line', () => {
    const lines = [line('fixed_cost / (price - variable_cost)')]
    const inputs = vars({ fixed_cost: 10000, price: 50, variable_cost: 30 }, { min: 1, max: 200 })
    const pts = sampleSweep(lines, inputs, 'price', 80)
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1]![1], pts[i]![1]]
      if (a !== null && b !== null) expect(a * b).toBeGreaterThanOrEqual(0)
    }
    expect(pts.some(([, y]) => y === null)).toBe(true)
  })

  it('does not put a gap where a continuous line crosses zero', () => {
    const pts = sampleSweep([line('x - 33.3')], vars({ x: 0 }), 'x', 80)
    expect(pts.every(([, y]) => y !== null)).toBe(true)
    expect(pts).toHaveLength(81)
  })
})

describe('URL state', () => {
  it('round-trips', () => {
    const state = { lines: [line('a * b', 'ü')], vars: vars({ a: 1 }), sweepVar: 'a' }
    expect(decodeState(encodeState(state))).toEqual(state)
  })

  it('repairs hand-edited state that would stop the tool', () => {
    const hash = encodeState({ lines: [{}], vars: null, sweepVar: 3 } as never)
    const decoded = decodeState(hash)!
    expect(decoded.lines[0]).toMatchObject({ name: '', expression: '' })
    expect(decoded.vars).toEqual({})
    expect(decoded.sweepVar).toBe('')
  })
})

describe('formatNumber', () => {
  it('does not show small non-zero values as 0', () => {
    expect(formatNumber(0.00001234)).toBe('0.00001234')
    expect(formatNumber(1e-9)).toBe('1e-9')
    expect(formatNumber(0)).toBe('0')
  })
})

import { useState, useEffect } from 'react'
import { parse, evaluate } from 'mathjs'
import FormulaBar from './FormulaBar'
import VariableControls from './VariableControls'
import SweepChart from './SweepChart'

const builtinCache = new Map()
function isBuiltin(name) {
  if (builtinCache.has(name)) return builtinCache.get(name)
  let result = false
  try { evaluate(name); result = true } catch {}
  builtinCache.set(name, result)
  return result
}

export function extractVars(formula) {
  const names = []
  let parsed = false
  try {
    parse(formula).traverse(node => {
      if (node.isSymbolNode && !isBuiltin(node.name)) {
        names.push(node.name)
      }
    })
    parsed = true
  } catch {}
  return { vars: [...new Set(names)], parsed }
}

export const DEFAULT_VAR = { value: 50, min: 0, max: 100, step: 1 }

export default function FormulaMode({ formula, onFormulaChange, vars, onVarsChange }) {
  const [sweepVar, setSweepVar] = useState(() => Object.keys(vars)[0] ?? '')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Sync vars when formula changes
  useEffect(() => {
    const { vars: detected, parsed } = extractVars(formula)
    // Skip update only on actual parse failure (not valid constant formulas)
    if (!parsed && formula.trim() !== '') return

    onVarsChange(prev => {
      const next = {}
      for (const name of detected) {
        next[name] = prev[name] ?? { ...DEFAULT_VAR }
      }
      return next
    })

    setSweepVar(prev => detected.includes(prev) ? prev : (detected[0] ?? ''))
  }, [formula])

  // Evaluate live
  useEffect(() => {
    if (!formula.trim()) {
      setResult(null)
      setError(null)
      return
    }
    try {
      const scope = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, v.value]))
      const val = evaluate(formula, scope)
      if (typeof val !== 'number') throw new Error('Result is not a number')
      if (!isFinite(val)) throw new Error(val === Infinity ? 'Division by zero' : 'Invalid result')
      setResult(val)
      setError(null)
    } catch (e) {
      setResult(null)
      setError(e.message)
    }
  }, [formula, vars])

  function handleValueChange(name, value) {
    onVarsChange(prev => ({ ...prev, [name]: { ...prev[name], value } }))
  }

  function handleConfigChange(name, config) {
    onVarsChange(prev => ({ ...prev, [name]: config }))
  }

  const varNames = Object.keys(vars)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <FormulaBar formula={formula} onFormulaChange={onFormulaChange} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Variables */}
        <div className="w-72 shrink-0 flex flex-col border-r border-gray-800 bg-gray-950 overflow-y-auto">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Variables</h2>
            <VariableControls
              vars={vars}
              onValueChange={handleValueChange}
              onConfigChange={handleConfigChange}
            />
          </div>
        </div>

        {/* Right: Result + Chart */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-950">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Result</h2>

          {error ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm mb-4">
              <span>Error:</span>
              <span className="font-mono">{error}</span>
            </div>
          ) : result !== null ? (
            <div className="inline-flex items-center px-6 py-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl mb-4">
              <span className="text-4xl font-bold text-indigo-300 tabular-nums">
                {Number.isInteger(result) ? result : result.toFixed(4)}
              </span>
            </div>
          ) : (
            <div className="inline-flex px-4 py-2 bg-gray-800 rounded-lg text-gray-500 text-sm mb-4">
              —
            </div>
          )}

          {!error && varNames.length >= 1 && result !== null && (
            <SweepChart
              formula={formula}
              vars={vars}
              sweepVar={sweepVar}
              onSweepVarChange={setSweepVar}
            />
          )}
        </div>
      </div>
    </div>
  )
}

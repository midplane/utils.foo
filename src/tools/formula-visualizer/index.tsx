import { useState, useMemo, useCallback, useEffect } from 'react'
import { Calculator, Settings2, SlidersHorizontal, Hash, Share2, Link, Plus, Trash2 } from 'lucide-react'
import { parse, evaluate, isSymbolNode, MathNode } from 'mathjs'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { cn } from '../../lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VarConfig {
  value: number
  min: number
  max: number
  step: number
}

interface FormulaLine {
  id: string
  name: string      // Variable name (empty for final result line)
  expression: string
}

interface AppState {
  lines: FormulaLine[]
  vars: Record<string, VarConfig>
  sweepVar: string
}

type VarsMap = Record<string, VarConfig>
type InputMode = 'slider' | 'input'

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_VAR: VarConfig = { value: 50, min: 0, max: 100, step: 1 }

interface Preset {
  label: string
  lines: FormulaLine[]
  defaults?: Record<string, Partial<VarConfig>>
}

const PRESETS: Preset[] = [
  {
    label: 'Gross Margin %',
    lines: [
      { id: '1', name: '', expression: '(revenue - cost) / revenue * 100' },
    ],
    defaults: {
      revenue: { value: 100, min: 0, max: 200 },
      cost: { value: 60, min: 0, max: 200 },
    },
  },
  {
    label: 'Percentage',
    lines: [
      { id: '1', name: '', expression: 'part / total * 100' },
    ],
    defaults: {
      part: { value: 25, min: 0, max: 100 },
      total: { value: 100, min: 1, max: 200 },
    },
  },
  {
    label: 'CAC',
    lines: [
      { id: '1', name: '', expression: 'ad_spend / new_customers' },
    ],
    defaults: {
      ad_spend: { value: 10000, min: 0, max: 50000, step: 100 },
      new_customers: { value: 100, min: 1, max: 500 },
    },
  },
  {
    label: 'LTV / CAC',
    lines: [
      { id: '1', name: '', expression: '(arpu * lifetime) / cac' },
    ],
    defaults: {
      arpu: { value: 50, min: 0, max: 200 },
      lifetime: { value: 24, min: 1, max: 60 },
      cac: { value: 100, min: 1, max: 500 },
    },
  },
  {
    label: 'Compound Interest',
    lines: [
      { id: '1', name: '', expression: 'principal * (1 + rate / 100) ^ years' },
    ],
    defaults: {
      principal: { value: 1000, min: 0, max: 10000, step: 100 },
      rate: { value: 7, min: 0, max: 20, step: 0.5 },
      years: { value: 10, min: 1, max: 30 },
    },
  },
  {
    label: 'Break-even Units',
    lines: [
      { id: '1', name: '', expression: 'fixed_cost / (price - variable_cost)' },
    ],
    defaults: {
      fixed_cost: { value: 10000, min: 0, max: 50000, step: 100 },
      price: { value: 50, min: 1, max: 200 },
      variable_cost: { value: 30, min: 0, max: 100 },
    },
  },
  {
    label: 'SaaS Unit Economics',
    lines: [
      { id: '1', name: 'mrr', expression: 'customers * arpu' },
      { id: '2', name: 'ltv', expression: 'arpu * avg_lifetime' },
      { id: '3', name: 'cac', expression: 'marketing_spend / new_customers' },
      { id: '4', name: '', expression: 'ltv / cac' },
    ],
    defaults: {
      customers: { value: 500, min: 0, max: 5000, step: 10 },
      arpu: { value: 99, min: 0, max: 500 },
      avg_lifetime: { value: 24, min: 1, max: 60 },
      marketing_spend: { value: 50000, min: 0, max: 200000, step: 1000 },
      new_customers: { value: 100, min: 1, max: 500 },
    },
  },
  {
    label: 'Loan Payment',
    lines: [
      { id: '1', name: 'monthly_rate', expression: 'rate / 100 / 12' },
      { id: '2', name: 'num_payments', expression: 'years * 12' },
      { id: '3', name: '', expression: 'principal * monthly_rate * (1 + monthly_rate)^num_payments / ((1 + monthly_rate)^num_payments - 1)' },
    ],
    defaults: {
      principal: { value: 300000, min: 50000, max: 1000000, step: 10000 },
      rate: { value: 6.5, min: 1, max: 15, step: 0.1 },
      years: { value: 30, min: 5, max: 30 },
    },
  },
]

const CHART_POINTS = 80

const FONT = "'JetBrains Mono', ui-monospace, monospace"
const C = {
  cream: '#FFFBF5',
  creamDark: '#FFF7ED',
  ink: '#1C1917',
  inkLight: '#44403C',
  inkMuted: '#78716C',
  accent: '#EA580C',
  border: '#E7E5E4',
  borderDark: '#D6D3D1',
}

// ─── URL State Management ─────────────────────────────────────────────────────

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

function encodeState(state: AppState): string {
  try {
    return toBase64Url(JSON.stringify(state))
  } catch {
    return ''
  }
}

function decodeState(hash: string): AppState | null {
  try {
    const json = fromBase64Url(hash)
    const state = JSON.parse(json) as AppState
    // Validate basic structure
    if (Array.isArray(state.lines) && typeof state.vars === 'object') {
      return state
    }
  } catch {
    // Invalid state
  }
  return null
}

function getInitialState(): AppState {
  // Check URL hash for state
  if (typeof window !== 'undefined' && window.location.hash) {
    const hash = window.location.hash.slice(1)
    const decoded = decodeState(hash)
    if (decoded) return decoded
  }
  return {
    lines: [{ id: '1', name: '', expression: '' }],
    vars: {},
    sweepVar: '',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const builtinCache = new Map<string, boolean>()

function isBuiltin(name: string): boolean {
  if (builtinCache.has(name)) return builtinCache.get(name)!
  let result = false
  try {
    const val = evaluate(name)
    result = typeof val === 'function' || typeof val === 'number'
  } catch {
    // Not a builtin
  }
  builtinCache.set(name, result)
  return result
}

function extractVarsFromExpression(expression: string, definedVars: Set<string>): string[] {
  const names: string[] = []
  try {
    parse(expression).traverse((node: MathNode) => {
      if (isSymbolNode(node) && !isBuiltin(node.name) && !definedVars.has(node.name)) {
        names.push(node.name)
      }
    })
  } catch {
    // Parse failed
  }
  return [...new Set(names)]
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

// Evaluate an expression, optionally supporting math expressions in input
function evaluateExpression(expr: string): number | null {
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

// Evaluate all formula lines and return computed values + final result
function evaluateLines(
  lines: FormulaLine[],
  inputVars: VarsMap
): { computedVars: Record<string, number>; result: number | null; error: string | null } {
  const computedVars: Record<string, number> = {}
  
  // Start with input variable values
  for (const [name, config] of Object.entries(inputVars)) {
    computedVars[name] = config.value
  }
  
  let result: number | null = null
  let error: string | null = null
  
  for (const line of lines) {
    if (!line.expression.trim()) continue
    
    try {
      const val = evaluate(line.expression, computedVars)
      if (typeof val !== 'number') {
        error = `"${line.name || 'result'}" is not a number`
        break
      }
      if (!isFinite(val)) {
        error = val === Infinity ? 'Division by zero' : 'Invalid result'
        break
      }
      
      if (line.name) {
        // This is an intermediate variable
        computedVars[line.name] = val
      } else {
        // This is the final result line
        result = val
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Evaluation failed'
      break
    }
  }
  
  return { computedVars, result, error }
}

// ─── Variable Row Component ───────────────────────────────────────────────────

interface VarRowProps {
  name: string
  config: VarConfig
  onChange: (name: string, value: number) => void
  onConfigChange: (name: string, config: VarConfig) => void
}

function VarRow({ name, config, onChange, onConfigChange }: VarRowProps) {
  const [showConfig, setShowConfig] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('slider')
  const [draft, setDraft] = useState('')
  const { value, min, max, step } = config

  const handleUpdate = useCallback(
    (field: 'min' | 'max' | 'step', raw: string) => {
      const num =
        field === 'step'
          ? Math.max(0.0001, parseFloat(raw) || 0.0001)
          : parseFloat(raw) || 0
      onConfigChange(name, { ...config, [field]: num })
    },
    [name, config, onConfigChange]
  )

  const handleSwitchToInput = useCallback(() => {
    setDraft(String(value))
    setInputMode('input')
  }, [value])

  const handleExpressionInput = useCallback(
    (raw: string) => {
      setDraft(raw)
    },
    []
  )
  
  const handleExpressionCommit = useCallback(() => {
    const result = evaluateExpression(draft)
    if (result !== null) {
      onChange(name, result)
      setDraft(String(result))
    }
  }, [draft, name, onChange])

  // Format display value with thousands separators
  const displayValue = useMemo(() => {
    if (Number.isInteger(value) && Math.abs(value) >= 1000) {
      return value.toLocaleString()
    }
    return String(value)
  }, [value])

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-mono text-[var(--color-accent)]">{name}</span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded overflow-hidden">
            <button
              onClick={() => setInputMode('slider')}
              className={cn(
                'p-1 transition-colors cursor-pointer',
                inputMode === 'slider'
                  ? 'bg-[var(--color-border-dark)] text-[var(--color-accent)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-light)]'
              )}
              title="Slider"
            >
              <SlidersHorizontal size={12} />
            </button>
            <button
              onClick={handleSwitchToInput}
              className={cn(
                'p-1 transition-colors cursor-pointer',
                inputMode === 'input'
                  ? 'bg-[var(--color-border-dark)] text-[var(--color-accent)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-light)]'
              )}
              title="Expression input (supports math like 1000*12)"
            >
              <Hash size={12} />
            </button>
          </div>

          <button
            onClick={() => setShowConfig((v) => !v)}
            className={cn(
              'p-0.5 rounded transition-colors cursor-pointer',
              showConfig
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-light)]'
            )}
            title="Configure range"
          >
            <Settings2 size={13} />
          </button>
        </div>
      </div>

      {inputMode === 'slider' ? (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(name, parseFloat(e.target.value))}
            className="flex-1 accent-[var(--color-accent)]"
          />
          <span className="text-sm text-[var(--color-ink)] w-16 text-right tabular-nums shrink-0 font-mono">
            {displayValue}
          </span>
        </div>
      ) : (
        <input
          type="text"
          value={draft}
          onChange={(e) => handleExpressionInput(e.target.value)}
          onBlur={handleExpressionCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleExpressionCommit()
          }}
          onFocus={(e) => e.target.select()}
          placeholder="e.g. 1000 * 12"
          className="w-full text-sm font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20"
        />
      )}

      {showConfig && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(['min', 'max', 'step'] as const).map((field) => (
            <label key={field} className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[var(--color-ink-muted)] uppercase tracking-wide font-semibold">
                {field}
              </span>
              <input
                type="number"
                defaultValue={config[field]}
                onBlur={(e) => handleUpdate(field, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdate(field, e.currentTarget.value)
                }}
                className="text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Variable Controls Component ──────────────────────────────────────────────

interface VariableControlsProps {
  vars: VarsMap
  computedVars: Record<string, number>
  onValueChange: (name: string, value: number) => void
  onConfigChange: (name: string, config: VarConfig) => void
}

function VariableControls({
  vars,
  computedVars,
  onValueChange,
  onConfigChange,
}: VariableControlsProps) {
  const inputVarNames = Object.keys(vars)
  const derivedVarNames = Object.keys(computedVars).filter(n => !vars[n])

  if (inputVarNames.length === 0 && derivedVarNames.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)] italic font-mono">
        No variables detected. Type a formula above.
      </p>
    )
  }

  return (
    <div>
      {inputVarNames.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-muted)] mb-2">
            Inputs
          </div>
          {inputVarNames.map((name) => (
            <VarRow
              key={name}
              name={name}
              config={vars[name]!}
              onChange={onValueChange}
              onConfigChange={onConfigChange}
            />
          ))}
        </>
      )}
      
      {derivedVarNames.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-muted)] mb-2 mt-4 pt-4 border-t border-[var(--color-border)]">
            Computed
          </div>
          {derivedVarNames.map((name) => (
            <div key={name} className="mb-2 flex items-center justify-between">
              <span className="text-sm font-mono text-[var(--color-ink-light)]">{name}</span>
              <span className="text-sm font-mono text-[var(--color-ink)] tabular-nums">
                {computedVars[name]?.toLocaleString(undefined, { maximumFractionDigits: 4 }) ?? '—'}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ─── Formula Line Component ───────────────────────────────────────────────────

interface FormulaLineRowProps {
  line: FormulaLine
  isLast: boolean
  canDelete: boolean
  onChange: (id: string, updates: Partial<FormulaLine>) => void
  onDelete: (id: string) => void
}

function FormulaLineRow({ line, isLast, canDelete, onChange, onDelete }: FormulaLineRowProps) {
  return (
    <div className="flex items-center gap-2 mb-2">
      {!isLast ? (
        <>
          <input
            type="text"
            value={line.name}
            onChange={(e) => onChange(line.id, { name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
            placeholder="var"
            className="w-24 text-sm font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-2 py-1.5 text-[var(--color-accent)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          <span className="text-[var(--color-ink-muted)]">=</span>
        </>
      ) : (
        <span className="w-24 text-sm font-mono text-[var(--color-ink-muted)] px-2">result =</span>
        
      )}
      <input
        type="text"
        value={line.expression}
        onChange={(e) => onChange(line.id, { expression: e.target.value })}
        placeholder={isLast ? "final expression" : "expression"}
        className="flex-1 text-sm font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-3 py-1.5 text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20"
        spellCheck={false}
      />
      {canDelete && (
        <button
          onClick={() => onDelete(line.id)}
          className="p-1.5 text-[var(--color-ink-muted)] hover:text-red-500 transition-colors cursor-pointer"
          title="Delete line"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  )
}

// ─── Sweep Chart Component ────────────────────────────────────────────────────

interface SweepChartProps {
  lines: FormulaLine[]
  inputVars: VarsMap
  sweepVar: string
  onSweepVarChange: (name: string) => void
}

function SweepChart({ lines, inputVars, sweepVar, onSweepVarChange }: SweepChartProps) {
  const varNames = Object.keys(inputVars)

  const { data, error: sweepError } = useMemo(() => {
    if (lines.length === 0 || varNames.length === 0 || !inputVars[sweepVar]) {
      return { data: [], error: null }
    }

    const { min, max } = inputVars[sweepVar]!
    const points: { x: number; y: number }[] = []

    try {
      const range = max - min
      for (let i = 0; i <= CHART_POINTS; i++) {
        const x = min + (range * i) / CHART_POINTS
        
        // Create modified input vars with sweep value
        const modifiedVars: VarsMap = {}
        for (const [k, cfg] of Object.entries(inputVars)) {
          modifiedVars[k] = { ...cfg, value: k === sweepVar ? x : cfg.value }
        }
        
        const { result } = evaluateLines(lines, modifiedVars)
        if (result !== null && isFinite(result)) {
          points.push({
            x: parseFloat(x.toFixed(4)),
            y: parseFloat(result.toFixed(6)),
          })
        }
      }
      return { data: points, error: null }
    } catch (e) {
      return { data: [], error: e instanceof Error ? e.message : 'Evaluation failed' }
    }
  }, [lines, inputVars, sweepVar, varNames.length])

  const option: EChartsOption = useMemo(() => {
    const axisLabel = {
      fontFamily: FONT,
      fontSize: 11,
      color: C.inkMuted,
    }

    return {
      backgroundColor: C.cream,
      textStyle: { fontFamily: FONT, color: C.ink },
      grid: { top: 24, bottom: 48, left: 16, right: 24, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: C.ink,
        borderColor: C.ink,
        borderWidth: 0,
        padding: [8, 12],
        textStyle: { fontFamily: FONT, fontSize: 11, color: '#FFFBF5' },
        formatter: (params: unknown) => {
          const p = params as { data: [number, number] }[]
          if (p.length > 0) {
            const point = p[0]!
            return `${sweepVar} = <b>${point.data[0].toLocaleString()}</b><br/>result = <b>${point.data[1].toLocaleString(undefined, { maximumFractionDigits: 4 })}</b>`
          }
          return ''
        },
        axisPointer: {
          type: 'line',
          lineStyle: { color: C.border },
        },
      },
      xAxis: {
        type: 'value',
        name: sweepVar,
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { fontFamily: FONT, fontSize: 11, color: C.inkMuted },
        axisLine: { lineStyle: { color: C.borderDark } },
        axisTick: { show: false },
        axisLabel: {
          ...axisLabel,
          formatter: (v: number) => v.toLocaleString(),
        },
        splitLine: { lineStyle: { color: C.border, type: 'dashed' } },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          ...axisLabel,
          formatter: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        },
        splitLine: { lineStyle: { color: C.border, type: 'dashed' } },
      },
      series: [
        {
          type: 'line',
          data: data.map((p) => [p.x, p.y]),
          smooth: 0.3,
          symbol: 'none',
          lineStyle: { width: 2.5, color: C.accent },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(234, 88, 12, 0.15)' },
                { offset: 1, color: 'rgba(234, 88, 12, 0)' },
              ],
            },
          },
        },
      ],
    }
  }, [data, sweepVar])

  if (varNames.length === 0) return null

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-ink-muted)]">
          Sweep variable
        </span>
        <select
          value={sweepVar}
          onChange={(e) => onSweepVarChange(e.target.value)}
          className="text-xs font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-2 py-1 text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
        >
          {varNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {sweepError ? (
        <p className="text-xs text-red-600 font-mono">{sweepError}</p>
      ) : data.length === 0 ? (
        <p className="text-xs text-[var(--color-ink-muted)] italic font-mono">
          No plottable data.
        </p>
      ) : (
        <ReactECharts
          option={option}
          style={{ height: '220px', width: '100%' }}
          opts={{ renderer: 'svg' }}
          notMerge
        />
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FormulaVisualizer() {
  const [lines, setLines] = useState<FormulaLine[]>(() => getInitialState().lines)
  const [varOverrides, setVarOverrides] = useState<VarsMap>(() => getInitialState().vars)
  const [sweepVarOverride, setSweepVarOverride] = useState(() => getInitialState().sweepVar)
  const [copied, setCopied] = useState(false)

  // Extract input variables from all expressions (variables not defined by a formula line)
  const { inputVars } = useMemo(() => {
    const defined = new Set<string>()
    const allReferenced: string[] = []
    
    for (const line of lines) {
      if (line.name) {
        defined.add(line.name)
      }
      const refs = extractVarsFromExpression(line.expression, defined)
      allReferenced.push(...refs)
    }
    
    // Input vars are referenced but not defined
    const inputVarNames = [...new Set(allReferenced)].filter(n => !defined.has(n))
    
    const inputVars: VarsMap = {}
    for (const name of inputVarNames) {
      inputVars[name] = varOverrides[name] ?? { ...DEFAULT_VAR }
    }
    
    return { inputVars }
  }, [lines, varOverrides])

  // Compute sweep var
  const sweepVar = useMemo(() => {
    const varNames = Object.keys(inputVars)
    if (varNames.includes(sweepVarOverride)) {
      return sweepVarOverride
    }
    return varNames[0] ?? ''
  }, [inputVars, sweepVarOverride])

  // Evaluate all lines
  const { computedVars, result, error } = useMemo(
    () => evaluateLines(lines, inputVars),
    [lines, inputVars]
  )

  // Update URL hash when state changes
  useEffect(() => {
    const hasContent = lines.some(l => l.expression.trim())
    if (!hasContent) {
      window.history.replaceState(null, '', window.location.pathname)
      return
    }
    
    const state: AppState = { lines, vars: varOverrides, sweepVar: sweepVarOverride }
    const hash = encodeState(state)
    window.history.replaceState(null, '', `#${hash}`)
  }, [lines, varOverrides, sweepVarOverride])

  const handleLineChange = useCallback((id: string, updates: Partial<FormulaLine>) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }, [])

  const handleAddLine = useCallback(() => {
    setLines(prev => {
      // Insert new line before the last one (which is the result line)
      const newLine: FormulaLine = { id: generateId(), name: '', expression: '' }
      if (prev.length === 0) return [newLine]
      return [...prev.slice(0, -1), newLine, prev[prev.length - 1]!]
    })
  }, [])

  const handleDeleteLine = useCallback((id: string) => {
    setLines(prev => prev.filter(l => l.id !== id))
  }, [])

  const handleValueChange = useCallback((name: string, value: number) => {
    setVarOverrides(prev => ({ ...prev, [name]: { ...(prev[name] ?? DEFAULT_VAR), value } }))
  }, [])

  const handleConfigChange = useCallback((name: string, config: VarConfig) => {
    setVarOverrides(prev => ({ ...prev, [name]: config }))
  }, [])

  const handleSweepVarChange = useCallback((name: string) => {
    setSweepVarOverride(name)
  }, [])

  const handlePreset = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = PRESETS.find(p => p.label === e.target.value)
    if (preset) {
      setLines(preset.lines.map(l => ({ ...l, id: generateId() })))
      if (preset.defaults) {
        const newOverrides: VarsMap = {}
        for (const [name, config] of Object.entries(preset.defaults)) {
          newOverrides[name] = { ...DEFAULT_VAR, ...config }
        }
        setVarOverrides(newOverrides)
      } else {
        setVarOverrides({})
      }
      setSweepVarOverride('')
    }
    e.target.value = ''
  }, [])

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = window.location.href
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [])

  const hasContent = lines.some(l => l.expression.trim())
  const inputVarNames = Object.keys(inputVars)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <ToolHeader icon={<Calculator />} title="Formula" accentedSuffix="Visualizer" />
        {hasContent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="gap-1.5 text-xs"
          >
            {copied ? <Link className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Share'}
          </Button>
        )}
      </div>

      {/* Formula Input */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
              Formulas
            </span>
            <div className="flex items-center gap-2">
              <select
                defaultValue=""
                onChange={handlePreset}
                className="h-7 px-2 text-xs font-mono rounded border border-[var(--color-border)] bg-[var(--color-cream)] text-[var(--color-ink)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              >
                <option value="" disabled>
                  Load preset...
                </option>
                <optgroup label="Simple">
                  {PRESETS.slice(0, 6).map(p => (
                    <option key={p.label} value={p.label}>{p.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Multi-step">
                  {PRESETS.slice(6).map(p => (
                    <option key={p.label} value={p.label}>{p.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lines.map((line, idx) => (
            <FormulaLineRow
              key={line.id}
              line={line}
              isLast={idx === lines.length - 1}
              canDelete={lines.length > 1}
              onChange={handleLineChange}
              onDelete={handleDeleteLine}
            />
          ))}
          
          <button
            onClick={handleAddLine}
            className="mt-2 flex items-center gap-1.5 text-xs font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Add intermediate variable
          </button>
          
          <p className="mt-3 text-[10px] font-mono text-[var(--color-ink-muted)]">
            Define intermediate variables (name = expression), then a final result expression.
            Supports +, -, *, /, ^, and functions (sin, cos, sqrt, log, etc.)
          </p>
        </CardContent>
      </Card>

      {/* Two-column layout: Variables + Result */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Variables Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
              Variables
            </span>
          </CardHeader>
          <CardContent>
            <VariableControls
              vars={inputVars}
              computedVars={computedVars}
              onValueChange={handleValueChange}
              onConfigChange={handleConfigChange}
            />
          </CardContent>
        </Card>

        {/* Result + Chart Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
              Result
            </span>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-mono">
                <span>Error:</span>
                <span>{error}</span>
              </div>
            ) : result !== null ? (
              <div className="inline-flex items-center px-6 py-4 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-xl">
                <span className="text-4xl font-bold text-[var(--color-accent)] tabular-nums font-mono">
                  {result.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </span>
              </div>
            ) : (
              <div className="inline-flex px-4 py-2 bg-[var(--color-surface)] rounded-lg text-[var(--color-ink-muted)] text-sm font-mono">
                —
              </div>
            )}

            {!error && inputVarNames.length >= 1 && result !== null && (
              <SweepChart
                lines={lines}
                inputVars={inputVars}
                sweepVar={sweepVar}
                onSweepVarChange={handleSweepVarChange}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {!hasContent && (
        <div className="text-center py-8 text-[var(--color-ink-muted)]">
          <Calculator className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-mono">
            Enter a formula above or load a preset to get started
          </p>
        </div>
      )}
    </div>
  )
}

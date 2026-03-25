import { evaluate } from 'mathjs'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const POINTS = 80

export default function SweepChart({ formula, vars, sweepVar, onSweepVarChange }) {
  const varNames = Object.keys(vars)

  if (!formula || varNames.length === 0) return null

  const { min, max } = vars[sweepVar] || {}

  let data = []
  let sweepError = null

  try {
    const range = max - min
    for (let i = 0; i <= POINTS; i++) {
      const x = min + (range * i) / POINTS
      const scope = {}
      for (const [k, cfg] of Object.entries(vars)) scope[k] = k === sweepVar ? x : cfg.value
      const y = evaluate(formula, scope)
      if (typeof y === 'number' && isFinite(y)) {
        data.push({ x: parseFloat(x.toFixed(4)), y: parseFloat(y.toFixed(6)) })
      }
    }
  } catch (e) {
    sweepError = e.message
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm text-gray-400">Sweep variable</span>
        <select
          value={sweepVar}
          onChange={e => onSweepVarChange(e.target.value)}
          className="text-sm bg-gray-800 text-gray-300 border border-gray-700 rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500"
        >
          {varNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {sweepError ? (
        <p className="text-xs text-red-400">{sweepError}</p>
      ) : data.length === 0 ? (
        <p className="text-xs text-gray-500 italic">No plottable data.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="x"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              label={{ value: sweepVar, position: 'insideBottomRight', offset: -4, fill: '#6b7280', fontSize: 11 }}
            />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} width={50} />
            <Tooltip
              contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, fontSize: 12 }}
              labelFormatter={v => `${sweepVar} = ${v}`}
              formatter={v => [v, 'result']}
            />
            <Line type="monotone" dataKey="y" stroke="#6366f1" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

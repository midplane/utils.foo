const PRESETS = [
  { label: 'Gross Margin %',    formula: '(revenue - cost) / revenue * 100' },
  { label: 'Percentage',        formula: 'part / total * 100' },
  { label: 'CAC',               formula: 'ad_spend / new_customers' },
  { label: 'LTV / CAC',         formula: '(arpu * lifetime) / cac' },
  { label: 'Compound Interest', formula: 'principal * (1 + rate / 100) ^ years' },
  { label: 'Break-even Units',  formula: 'fixed_cost / (price - variable_cost)' },
]

export default function FormulaBar({ formula, onFormulaChange }) {
  function handlePreset(e) {
    const preset = PRESETS.find(p => p.label === e.target.value)
    if (preset) onFormulaChange(preset.formula)
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
      <label className="text-sm text-gray-400 shrink-0">Preset</label>
      <select
        defaultValue=""
        onChange={handlePreset}
        className="text-sm bg-gray-800 text-gray-300 border border-gray-700 rounded-md px-2 py-1.5 hover:border-gray-600 focus:outline-none focus:border-indigo-500"
      >
        <option value="" disabled>Choose preset…</option>
        {PRESETS.map(p => (
          <option key={p.label} value={p.label}>{p.label}</option>
        ))}
      </select>

      <label className="text-sm text-gray-400 shrink-0">Formula</label>
      <input
        type="text"
        value={formula}
        onChange={e => onFormulaChange(e.target.value)}
        placeholder="e.g. (revenue - cost) / revenue * 100"
        className="flex-1 text-sm font-mono bg-gray-800 text-gray-100 border border-gray-700 rounded-md px-3 py-1.5 focus:outline-none focus:border-indigo-500 placeholder-gray-600"
        spellCheck={false}
      />
    </div>
  )
}

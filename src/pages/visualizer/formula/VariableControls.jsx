import { useState } from 'react'
import { Settings2, SlidersHorizontal, Hash } from 'lucide-react'

function VarRow({ name, config, onChange, onConfigChange }) {
  const [showConfig, setShowConfig] = useState(false)
  const [inputMode, setInputMode] = useState('slider') // 'slider' | 'input'
  const [draft, setDraft] = useState('')
  const { value, min, max, step } = config

  function update(field, raw) {
    const num = field === 'step' ? Math.max(0.0001, parseFloat(raw) || 0.0001) : parseFloat(raw) || 0
    onConfigChange(name, { ...config, [field]: num })
  }

  function handleSwitchToInput() {
    setDraft(String(value))
    setInputMode('input')
  }

  function handleDirectInput(raw) {
    setDraft(raw)
    const num = parseFloat(raw)
    if (!isNaN(num)) onChange(name, num)
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-mono text-indigo-300">{name}</span>
        <div className="flex items-center gap-1.5">
          {/* Slider / Input toggle */}
          <div className="flex items-center bg-gray-800 border border-gray-700 rounded overflow-hidden">
            <button
              onClick={() => setInputMode('slider')}
              className={`p-1 transition-colors ${inputMode === 'slider' ? 'bg-gray-700 text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}
              title="Slider"
            >
              <SlidersHorizontal size={12} />
            </button>
            <button
              onClick={handleSwitchToInput}
              className={`p-1 transition-colors ${inputMode === 'input' ? 'bg-gray-700 text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}
              title="Number input"
            >
              <Hash size={12} />
            </button>
          </div>

          <button
            onClick={() => setShowConfig(v => !v)}
            className={`p-0.5 rounded transition-colors ${showConfig ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'}`}
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
            onChange={e => onChange(name, parseFloat(e.target.value))}
            className="flex-1 accent-indigo-500"
          />
          <span className="text-sm text-gray-300 w-14 text-right tabular-nums shrink-0">{value}</span>
        </div>
      ) : (
        <input
          type="number"
          value={draft}
          step={step}
          onChange={e => handleDirectInput(e.target.value)}
          onFocus={e => e.target.select()}
          className="w-full text-sm font-mono bg-gray-800 text-gray-100 border border-gray-700 rounded-md px-3 py-1.5 focus:outline-none focus:border-indigo-500"
        />
      )}

      {showConfig && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {['min', 'max', 'step'].map(field => (
            <label key={field} className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 uppercase tracking-wide">{field}</span>
              <input
                type="number"
                defaultValue={config[field]}
                onBlur={e => update(field, e.target.value)}
                onKeyDown={e => e.key === 'Enter' && update(field, e.target.value)}
                className="text-xs font-mono bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function VariableControls({ vars, onValueChange, onConfigChange }) {
  const names = Object.keys(vars)
  if (names.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No variables detected. Type a formula above.
      </p>
    )
  }

  return (
    <div>
      {names.map(name => (
        <VarRow
          key={name}
          name={name}
          config={vars[name]}
          onChange={onValueChange}
          onConfigChange={onConfigChange}
        />
      ))}
    </div>
  )
}

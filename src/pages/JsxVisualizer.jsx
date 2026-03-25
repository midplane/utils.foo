import React, { useState, useEffect, useCallback, useRef, useMemo, useReducer } from 'react'
import { LiveProvider } from 'react-live'
import * as LucideIcons from 'lucide-react'
import { transform } from 'sucrase'
import VisualizerHeader from './visualizer/VisualizerHeader'
import EditorPanel from './visualizer/EditorPanel'
import PreviewPanel from './visualizer/PreviewPanel'
import FormulaMode, { DEFAULT_VAR } from './visualizer/formula/FormulaMode'
import SavesPanel from './visualizer/SavesPanel'
import { useSaves } from './visualizer/useSaves'

const DEFAULT_CODE = `function Counter() {
  const [count, setCount] = React.useState(0);
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ color: '#6366f1' }}>JSX Visualizer</h1>
      <p style={{ color: '#94a3b8' }}>Edit the code on the left to see live updates here.</p>
      <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{count}</div>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{ background: '#6366f1', color: 'white', border: 'none',
                 borderRadius: '8px', padding: '0.75rem 2rem', cursor: 'pointer' }}
      >
        Click me
      </button>
    </div>
  );
}
render(<Counter />);`

const DEFAULT_FORMULA_STATE = {
  formula: '(revenue - cost) / revenue * 100',
  vars: {
    revenue: { ...DEFAULT_VAR },
    cost: { ...DEFAULT_VAR },
  },
}

const transformCode = (code) => transform(code, { transforms: ['jsx'] }).code

const lucideComponents = Object.fromEntries(
  Object.entries(LucideIcons).filter(([key]) => /^[A-Z]/.test(key))
)

const LIVE_SCOPE = {
  React, useState, useEffect, useCallback, useRef, useMemo, useReducer,
  ...lucideComponents,
}

export default function JsxVisualizer() {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [resetKey, setResetKey] = useState(0)
  const [mode, setMode] = useState('jsx')
  const [formulaState, setFormulaState] = useState(DEFAULT_FORMULA_STATE)
  const [savesOpen, setSavesOpen] = useState(false)
  const { saves, addSave, deleteSave, renameSave } = useSaves()

  function handleReset() {
    setCode(DEFAULT_CODE)
    setResetKey(k => k + 1)
  }

  function handleFormulaChange(formula) {
    setFormulaState(prev => ({ ...prev, formula }))
  }

  function handleVarsChange(updater) {
    setFormulaState(prev => ({
      ...prev,
      vars: typeof updater === 'function' ? updater(prev.vars) : updater,
    }))
  }

  function handleSave(name) {
    if (mode === 'jsx') {
      addSave({ name, mode: 'jsx', code })
    } else {
      addSave({ name, mode: 'formula', formula: formulaState.formula, vars: formulaState.vars })
    }
  }

  function handleLoad(save) {
    if (save.mode === 'jsx') {
      setCode(save.code)
      setResetKey(k => k + 1)
      setMode('jsx')
    } else {
      setFormulaState({ formula: save.formula, vars: save.vars })
      setMode('formula')
    }
  }

  return (
    <div className="-mx-4 -my-8 flex flex-col bg-gray-950">
      <VisualizerHeader
        onReset={handleReset}
        mode={mode}
        onModeChange={setMode}
        onToggleSaves={() => setSavesOpen(v => !v)}
        savesCount={saves.length}
      />

      {mode === 'formula' ? (
        <FormulaMode
          formula={formulaState.formula}
          onFormulaChange={handleFormulaChange}
          vars={formulaState.vars}
          onVarsChange={handleVarsChange}
        />
      ) : (
        <LiveProvider key={resetKey} code={code} scope={LIVE_SCOPE} noInline transformCode={transformCode}>
          <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
            <EditorPanel onChange={setCode} />
            <PreviewPanel />
          </div>
        </LiveProvider>
      )}

      <SavesPanel
        isOpen={savesOpen}
        onClose={() => setSavesOpen(false)}
        saves={saves}
        currentMode={mode}
        onSave={handleSave}
        onLoad={handleLoad}
        onDelete={deleteSave}
        onRename={renameSave}
      />
    </div>
  )
}

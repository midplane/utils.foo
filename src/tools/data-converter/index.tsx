import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { LanguageDescription } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import * as yaml from 'js-yaml'
import Papa from 'papaparse'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { parse as parseTOML, stringify as stringifyTOML } from 'smol-toml'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { Badge } from '../../components/ui/Badge'
import { cn } from '../../lib/utils'

// ─── Conversion definitions ───────────────────────────────────────────────────

type ConversionId =
  | 'json-yaml' | 'yaml-json'
  | 'json-toml' | 'toml-json'
  | 'json-csv'  | 'csv-json'
  | 'json-xml'  | 'xml-json'

interface Conversion {
  id: ConversionId
  label: string
  from: string
  to: string
  fromLang: string
  toLang: string
}

const CONVERSIONS: Conversion[] = [
  { id: 'json-yaml', label: 'JSON → YAML', from: 'JSON', to: 'YAML', fromLang: 'JSON',       toLang: 'YAML'       },
  { id: 'yaml-json', label: 'YAML → JSON', from: 'YAML', to: 'JSON', fromLang: 'YAML',       toLang: 'JSON'       },
  { id: 'json-toml', label: 'JSON → TOML', from: 'JSON', to: 'TOML', fromLang: 'JSON',       toLang: 'TOML'       },
  { id: 'toml-json', label: 'TOML → JSON', from: 'TOML', to: 'JSON', fromLang: 'TOML',       toLang: 'JSON'       },
  { id: 'json-csv',  label: 'JSON → CSV',  from: 'JSON', to: 'CSV',  fromLang: 'JSON',       toLang: 'Plain'      },
  { id: 'csv-json',  label: 'CSV → JSON',  from: 'CSV',  to: 'JSON', fromLang: 'Plain',      toLang: 'JSON'       },
  { id: 'json-xml',  label: 'JSON → XML',  from: 'JSON', to: 'XML',  fromLang: 'JSON',       toLang: 'XML'        },
  { id: 'xml-json',  label: 'XML → JSON',  from: 'XML',  to: 'JSON', fromLang: 'XML',        toLang: 'JSON'       },
]

// ─── Samples ──────────────────────────────────────────────────────────────────

const SAMPLES: Record<string, string> = {
  JSON: `{
  "name": "utils.foo",
  "version": "2.0.0",
  "tools": ["json", "yaml", "diff", "qr"],
  "config": {
    "indent": 2,
    "strict": true
  },
  "active": true,
  "score": 42
}`,
  YAML: `name: utils.foo
version: 2.0.0
tools:
  - json
  - yaml
  - diff
  - qr
config:
  indent: 2
  strict: true
active: true
score: 42`,
  TOML: `name = "utils.foo"
version = "2.0.0"
tools = ["json", "yaml", "diff", "qr"]
active = true
score = 42

[config]
indent = 2
strict = true`,
  CSV: `name,version,active,score
utils.foo,2.0.0,true,42
utils.bar,1.0.0,false,7`,
  XML: `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <name>utils.foo</name>
  <version>2.0.0</version>
  <tools>
    <item>json</item>
    <item>yaml</item>
    <item>diff</item>
    <item>qr</item>
  </tools>
  <config>
    <indent>2</indent>
    <strict>true</strict>
  </config>
  <active>true</active>
  <score>42</score>
</root>`,
}

// ─── Converter logic ──────────────────────────────────────────────────────────

function convert(id: ConversionId, input: string): { output: string; error?: string } {
  const trimmed = input.trim()
  if (!trimmed) return { output: '' }

  try {
    switch (id) {
      case 'json-yaml': {
        const obj = JSON.parse(trimmed)
        return { output: yaml.dump(obj, { indent: 2, lineWidth: -1 }).trimEnd() }
      }
      case 'yaml-json': {
        const obj = yaml.load(trimmed)
        return { output: JSON.stringify(obj, null, 2) }
      }
      case 'json-toml': {
        const obj = JSON.parse(trimmed)
        return { output: stringifyTOML(obj) }
      }
      case 'toml-json': {
        const obj = parseTOML(trimmed)
        return { output: JSON.stringify(obj, null, 2) }
      }
      case 'json-csv': {
        const obj = JSON.parse(trimmed)
        const arr = Array.isArray(obj) ? obj : [obj]
        return { output: Papa.unparse(arr) }
      }
      case 'csv-json': {
        const result = Papa.parse(trimmed, { header: true, skipEmptyLines: true, dynamicTyping: true })
        if (result.errors.length > 0) throw new Error(result.errors[0]!.message)
        return { output: JSON.stringify(result.data, null, 2) }
      }
      case 'json-xml': {
        const obj = JSON.parse(trimmed)
        const builder = new XMLBuilder({ format: true, indentBy: '  ', suppressEmptyNode: true })
        const wrapped = { root: obj }
        const xml = builder.build(wrapped) as string
        return { output: `<?xml version="1.0" encoding="UTF-8"?>\n${xml.trimEnd()}` }
      }
      case 'xml-json': {
        const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true, parseAttributeValue: true })
        const obj = parser.parse(trimmed)
        // Unwrap single root key if present
        const keys = Object.keys(obj)
        const unwrapped = keys.length === 1 ? obj[keys[0]!] : obj
        return { output: JSON.stringify(unwrapped, null, 2) }
      }
    }
  } catch (e) {
    return { output: '', error: (e as Error).message }
  }
}

// ─── CodeMirror theme ─────────────────────────────────────────────────────────

const appTheme = EditorView.theme({
  '&': {
    fontSize: '12px',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    background: '#FFFBF5',
    color: '#1C1917',
    height: '100%',
  },
  '&.cm-focused': { outline: 'none', border: '1px solid #EA580C', boxShadow: '0 0 0 3px rgba(234,88,12,0.12)' },
  '.cm-scroller': { overflow: 'auto', fontFamily: "'JetBrains Mono', ui-monospace, monospace", height: '100%' },
  '.cm-content': { padding: '12px 4px', caretColor: '#EA580C' },
  '.cm-line': { padding: '0 8px' },
  '.cm-gutters': { background: '#FFF7ED', borderRight: '1px solid #E7E5E4', color: '#A8A29E', fontSize: '11px' },
  '.cm-activeLineGutter': { background: '#FEF3C7' },
  '.cm-activeLine': { background: 'rgba(234,88,12,0.04)' },
  '.cm-selectionBackground': { background: 'rgba(234,88,12,0.15) !important' },
  '&.cm-focused .cm-selectionBackground': { background: 'rgba(234,88,12,0.2) !important' },
  '.cm-cursor': { borderLeftColor: '#EA580C' },
  // syntax colours
  '.tok-propertyName': { color: '#C2410C', fontWeight: '500' },
  '.tok-string': { color: '#15803D' },
  '.tok-number': { color: '#1D4ED8' },
  '.tok-bool': { color: '#7C3AED' },
  '.tok-null': { color: '#6B7280' },
  '.tok-punctuation, .tok-bracket': { color: '#78716C' },
  '.tok-comment': { color: '#A8A29E', fontStyle: 'italic' },
  '.tok-keyword': { color: '#7C3AED' },
  '.tok-tagName': { color: '#C2410C' },
  '.tok-attributeName': { color: '#1D4ED8' },
  '.tok-attributeValue': { color: '#15803D' },
}, { dark: false })

// ─── Async language loader ────────────────────────────────────────────────────

async function loadLang(name: string) {
  if (name === 'Plain') return []
  const desc = LanguageDescription.matchLanguageName(languages, name, true)
  if (!desc) return []
  return [await desc.load()]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DataConverterTool() {
  const [convId, setConvId] = useState<ConversionId>('json-yaml')
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  const conv = CONVERSIONS.find(c => c.id === convId)!

  const inputRef  = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const inputView  = useRef<EditorView | null>(null)
  const outputView = useRef<EditorView | null>(null)
  const inputLangComp  = useRef(new Compartment())
  const outputLangComp = useRef(new Compartment())

  // ── Build editors once ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!inputRef.current || !outputRef.current) return

    const sample = SAMPLES[conv.from] ?? ''
    setInputText(sample)

    const iv = new EditorView({
      state: EditorState.create({
        doc: sample,
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          appTheme,
          inputLangComp.current.of([]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) setInputText(u.state.doc.toString())
          }),
        ],
      }),
      parent: inputRef.current,
    })

    const ov = new EditorView({
      state: EditorState.create({
        doc: '',
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          appTheme,
          outputLangComp.current.of([]),
          EditorView.editable.of(false),
        ],
      }),
      parent: outputRef.current,
    })

    inputView.current  = iv
    outputView.current = ov

    return () => {
      iv.destroy(); inputView.current = null
      ov.destroy(); outputView.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Apply language extensions when conversion changes ────────────────────────
  useEffect(() => {
    Promise.all([loadLang(conv.fromLang), loadLang(conv.toLang)]).then(([fromExt, toExt]) => {
      inputView.current?.dispatch({ effects: inputLangComp.current.reconfigure(fromExt) })
      outputView.current?.dispatch({ effects: outputLangComp.current.reconfigure(toExt) })
    })
  }, [conv.fromLang, conv.toLang])

  // ── Run conversion (debounced) ───────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(() => {
      const { output, error: err } = convert(convId, inputText)
      setError(err ?? '')
      setOutputText(output)
      const ov = outputView.current
      if (ov) {
        ov.dispatch({ changes: { from: 0, to: ov.state.doc.length, insert: output } })
      }
    }, 200)
    return () => clearTimeout(id)
  }, [convId, inputText])

  // ── On conversion switch: load sample for new source format ──────────────────
  const handleConvChange = useCallback((id: ConversionId) => {
    const newConv = CONVERSIONS.find(c => c.id === id)!
    const sample = SAMPLES[newConv.from] ?? ''
    setConvId(id)
    setInputText(sample)
    const iv = inputView.current
    if (iv) iv.dispatch({ changes: { from: 0, to: iv.state.doc.length, insert: sample } })
  }, [])

  // ── Swap ─────────────────────────────────────────────────────────────────────
  const handleSwap = useCallback(() => {
    const reversed = CONVERSIONS.find(c => c.id === `${conv.to.toLowerCase()}-${conv.from.toLowerCase()}` as ConversionId)
    if (!reversed) return
    // Use current output as new input
    const newInput = outputText
    setConvId(reversed.id)
    setInputText(newInput)
    const iv = inputView.current
    if (iv) iv.dispatch({ changes: { from: 0, to: iv.state.doc.length, insert: newInput } })
  }, [conv, outputText])

  // ── Clear ─────────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setInputText('')
    const iv = inputView.current
    if (iv) iv.dispatch({ changes: { from: 0, to: iv.state.doc.length, insert: '' } })
  }, [])

  // ── Sample ────────────────────────────────────────────────────────────────────
  const handleSample = useCallback(() => {
    const sample = SAMPLES[conv.from] ?? ''
    setInputText(sample)
    const iv = inputView.current
    if (iv) iv.dispatch({ changes: { from: 0, to: iv.state.doc.length, insert: sample } })
  }, [conv.from])

  // ── Esc ───────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const editorHeight = expanded ? 'calc(100vh - 161px)' : '480px'
  const canSwap = CONVERSIONS.some(c => c.id === `${conv.to.toLowerCase()}-${conv.from.toLowerCase()}`)

  return (
    <>
      {expanded && (
        <div
          className="fixed left-0 right-0 bottom-0 bg-black/40 z-40 backdrop-blur-sm"
          style={{ top: '41px' }}
          onClick={() => setExpanded(false)}
        />
      )}

      <div className={cn('space-y-4 animate-fade-in', expanded && 'relative z-50')}>
        {/* Header */}
        {!expanded && (
          <div className="space-y-2">
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
                <ConvertIcon className="w-3.5 h-3.5" />
              </div>
              <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
                Data <span className="text-[var(--color-accent)]">Converter</span>
              </h1>
            </div>
          </div>
        )}

        {/* Main card */}
        <Card
          className={cn(expanded && 'fixed left-4 right-4 bottom-4 z-50 shadow-2xl overflow-auto')}
          style={expanded ? { top: 'calc(41px + 8px)' } : undefined}
        >
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Conversion selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex flex-wrap gap-1">
                  {CONVERSIONS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleConvChange(c.id)}
                      className={cn(
                        'text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors cursor-pointer',
                        convId === c.id
                          ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white font-semibold'
                          : 'border-[var(--color-border)] bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-dark)] hover:text-[var(--color-ink)]'
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                {error && (
                  <Badge variant="error" className="text-[10px]">Error</Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleSample} className="gap-1 text-xs h-7 px-2">
                  <SampleIcon className="w-3 h-3" />
                  Sample
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSwap} disabled={!canSwap || !outputText} className="gap-1 text-xs h-7 px-2" title="Swap input/output">
                  <SwapIcon className="w-3 h-3" />
                  Swap
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-xs h-7 px-2">
                  <TrashIcon className="w-3 h-3" />
                  Clear
                </Button>
                <button
                  onClick={() => setExpanded(v => !v)}
                  title={expanded ? 'Collapse' : 'Expand'}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer"
                >
                  {expanded ? <CollapseIcon className="w-3.5 h-3.5" /> : <ExpandIcon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Error message */}
            {error && (
              <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700 font-mono">
                {error}
              </div>
            )}

            {/* Two-pane editor layout */}
            <div className="grid grid-cols-2 gap-3">
              {/* Input pane */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">{conv.from}</span>
                </div>
                <div
                  ref={inputRef}
                  style={{ height: editorHeight }}
                  className="rounded-lg border border-[var(--color-border)] overflow-auto"
                />
              </div>

              {/* Output pane */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">{conv.to}</span>
                  {outputText && <CopyButton text={outputText} />}
                </div>
                <div
                  ref={outputRef}
                  style={{ height: editorHeight }}
                  className={cn(
                    'rounded-lg border overflow-auto',
                    error ? 'border-red-200' : 'border-[var(--color-border)]'
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ConvertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  )
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  )
}

function SampleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
    </svg>
  )
}

function CollapseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0h4M4 4v4m11-4l5 5m0-5h-4m4 0v4M9 15l-5 5m0 0h4m-4 0v-4m11 4l5-5m0 5h-4m4 0v-4" />
    </svg>
  )
}

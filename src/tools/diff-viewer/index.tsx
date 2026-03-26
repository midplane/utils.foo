import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MergeView } from '@codemirror/merge'
import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { Compartment } from '@codemirror/state'
import { LanguageDescription } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { cn } from '../../lib/utils'
import { ArrowLeftRight, GitCompare, Maximize2, Minimize2, Sparkles, Trash2, ChevronLeft } from 'lucide-react'

// ─── Language list (curated subset shown in dropdown) ────────────────────────

const LANG_OPTIONS = [
  'Plain',
  'JavaScript',
  'TypeScript',
  'JSX',
  'TSX',
  'JSON',
  'HTML',
  'CSS',
  'Python',
  'SQL',
  'Markdown',
  'YAML',
  'XML',
  'Shell',
  'Rust',
  'Go',
  'Java',
  'C',
  'C++',
  'Ruby',
  'PHP',
  'Swift',
  'Kotlin',
  'Dockerfile',
  'TOML',
]

// ─── Content-based language heuristic ────────────────────────────────────────

function detectLanguage(text: string): string {
  const t = text.trimStart()
  if (!t) return 'Plain'

  // JSON
  if ((t.startsWith('{') || t.startsWith('[')) && (() => { try { JSON.parse(t); return true } catch { return false } })()) return 'JSON'

  // HTML / XML
  if (/^<!DOCTYPE\s+html/i.test(t) || /^<html[\s>]/i.test(t)) return 'HTML'
  if (/^<\?xml/i.test(t)) return 'XML'
  if (t.startsWith('<') && /<\/\w+>/.test(t)) return 'HTML'

  // Markdown
  if (/^#{1,6}\s/.test(t) || /^\s*[-*]\s/.test(t) || /^```/.test(t)) return 'Markdown'

  // YAML
  if (/^---\s*\n/.test(t) || /^\w[\w\s]*:\s+\S/.test(t) && !/[{(]/.test(t.slice(0, 60))) return 'YAML'

  // TOML
  if (/^\[[\w.]+\]/.test(t) || /^\w+ = /.test(t)) return 'TOML'

  // Shell
  if (/^#!/.test(t) || /\b(echo|export|source|chmod|grep|awk|sed)\b/.test(t.slice(0, 200))) return 'Shell'

  // Dockerfile
  if (/^FROM\s+\w/im.test(t) && /\b(RUN|CMD|ENTRYPOINT|COPY|ADD|ENV)\b/.test(t)) return 'Dockerfile'

  // SQL
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH)\b/i.test(t)) return 'SQL'

  // Python
  if (/\bdef\s+\w+\s*\(/.test(t) || /^import\s+\w/m.test(t) || /^from\s+\w+\s+import\b/m.test(t)) return 'Python'

  // TypeScript (must come before JS — checks for TS-specific syntax)
  if (/:\s*(string|number|boolean|void|any|never|unknown)\b/.test(t) ||
      /\binterface\s+\w/.test(t) || /\btype\s+\w+\s*=/.test(t) || /\benum\s+\w/.test(t)) return 'TypeScript'

  // JSX / TSX — angle brackets mixed with JS
  if (/return\s*\(?\s*<[A-Z]/.test(t) || /import\s+React/.test(t)) return 'JSX'

  // JavaScript
  if (/\b(const|let|var|function|=>|async|await|require|module\.exports)\b/.test(t)) return 'JavaScript'

  // CSS / SCSS / LESS
  if (/[\w#.[\]:]+\s*\{[^}]*\}/.test(t) || /^@(import|media|keyframes|mixin)\b/m.test(t)) return 'CSS'

  // Rust
  if (/\bfn\s+\w+/.test(t) || /\blet\s+mut\b/.test(t) || /\bimpl\s+\w/.test(t)) return 'Rust'

  // Go
  if (/^package\s+\w/m.test(t) || /\bfunc\s+\w/.test(t)) return 'Go'

  // Java / Kotlin
  if (/\bpublic\s+(class|interface|enum)\b/.test(t) || /\bimport\s+java\./.test(t)) return 'Java'
  if (/\bfun\s+\w+\s*\(/.test(t) && /\bval\b|\bvar\b/.test(t)) return 'Kotlin'

  return 'Plain'
}

// ─── Load a LanguageDescription by name (async, lazy) ─────────────────────────

async function loadLanguageExtension(name: string) {
  if (name === 'Plain') return []
  const desc = LanguageDescription.matchLanguageName(languages, name, true)
  if (!desc) return []
  const lang = await desc.load()
  return [lang]
}

// ─── Theme ───────────────────────────────────────────────────────────────────

const appTheme = EditorView.theme({
  '&': {
    fontSize: '12px',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    color: '#1C1917',
    height: '100%',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    height: '100%',
  },
  '.cm-content': { padding: '12px 4px', caretColor: '#EA580C' },
  '.cm-line': { padding: '0 8px' },
  '.cm-gutters': {
    background: '#FFF7ED',
    borderRight: '1px solid #E7E5E4',
    color: '#A8A29E',
    fontSize: '11px',
  },
  '.cm-activeLineGutter': { background: '#FEF3C7' },
  '.cm-activeLine': { background: 'rgba(234, 88, 12, 0.04)' },
  '.cm-selectionBackground': { background: 'rgba(234, 88, 12, 0.15) !important' },
  '&.cm-focused .cm-selectionBackground': { background: 'rgba(234, 88, 12, 0.2) !important' },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor': { borderLeftColor: '#EA580C' },
  // MergeView diff highlights
  '.cm-deletedChunk': { background: 'rgba(239,68,68,0.08)' },
  '.cm-deletedChunk .cm-deletedLine, .cm-deletedLine': { background: 'rgba(239,68,68,0.12)' },
  '.cm-changedLine': { background: 'rgba(16,185,129,0.08)' },
  '.cm-changedText': { background: 'rgba(16,185,129,0.25)', borderRadius: '2px' },
  '.cm-deletedText': { background: 'rgba(239,68,68,0.35)', borderRadius: '2px', textDecoration: 'none' },
  '.cm-mergeGap': { background: '#FFF7ED', borderTop: '1px solid #E7E5E4', borderBottom: '1px solid #E7E5E4' },
})

// ─── Sample content ───────────────────────────────────────────────────────────

const SAMPLE_LEFT = `function greet(name) {
  const message = "Hello, " + name;
  console.log(message);
  return message;
}

const result = greet("World");
console.log(result);`

const SAMPLE_RIGHT = `function greet(name, greeting = "Hello") {
  const message = \`\${greeting}, \${name}!\`;
  console.log(message);
  return message;
}

const result = greet("World", "Hi");
console.log("Result:", result);`

// ─── Component ────────────────────────────────────────────────────────────────

export default function DiffViewerTool() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mergeViewRef = useRef<MergeView | null>(null)
  // One compartment per pane — allows hot-swapping language without remount
  const langCompartmentA = useRef(new Compartment())
  const langCompartmentB = useRef(new Compartment())

  const [leftText, setLeftText]   = useState(SAMPLE_LEFT)
  const [rightText, setRightText] = useState(SAMPLE_RIGHT)
  const [stats, setStats]         = useState({ added: 0, removed: 0 })
  const [expanded, setExpanded]   = useState(false)

  // 'auto' means follow detection; any other value is a manual override
  const [langOverride, setLangOverride] = useState<string>('auto')
  const [detectedLang, setDetectedLang] = useState<string>(() => detectLanguage(SAMPLE_LEFT))

  // The effective language name used for highlighting
  const activeLang = langOverride === 'auto' ? detectedLang : langOverride

  // ── Mount MergeView ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const mv = new MergeView({
      a: {
        doc: leftText,
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          appTheme,
          langCompartmentA.current.of([]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) setLeftText(u.state.doc.toString())
          }),
        ],
      },
      b: {
        doc: rightText,
        extensions: [
          basicSetup,
          EditorView.lineWrapping,
          appTheme,
          langCompartmentB.current.of([]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) setRightText(u.state.doc.toString())
          }),
        ],
      },
      parent: containerRef.current,
      revertControls: 'a-to-b',
      highlightChanges: true,
      collapseUnchanged: { margin: 3, minSize: 4 },
    })

    mergeViewRef.current = mv

    return () => {
      mv.destroy()
      mergeViewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Apply language to both panes ─────────────────────────────────────────────
  const applyLanguage = useCallback(async (name: string) => {
    const mv = mergeViewRef.current
    if (!mv) return
    const ext = await loadLanguageExtension(name)
    mv.a.dispatch({ effects: langCompartmentA.current.reconfigure(ext) })
    mv.b.dispatch({ effects: langCompartmentB.current.reconfigure(ext) })
  }, [])

  useEffect(() => {
    applyLanguage(activeLang)
  }, [activeLang, applyLanguage])

  // ── Auto-detect language from left pane content (debounced 500ms) ────────────
  useEffect(() => {
    if (langOverride !== 'auto') return
    const id = setTimeout(() => {
      const detected = detectLanguage(leftText || rightText)
      setDetectedLang(detected)
    }, 500)
    return () => clearTimeout(id)
  }, [leftText, rightText, langOverride])

  // ── Sync stats from text ────────────────────────────────────────────────────
  useEffect(() => {
    const leftLines  = leftText.split('\n')
    const rightLines = rightText.split('\n')
    const maxLen = Math.max(leftLines.length, rightLines.length)
    let added = 0, removed = 0
    for (let i = 0; i < maxLen; i++) {
      if (leftLines[i] !== rightLines[i]) {
        if (i >= leftLines.length) added++
        else if (i >= rightLines.length) removed++
        else { added++; removed++ }
      }
    }
    setStats({ added, removed })
  }, [leftText, rightText])

  // ── Esc to collapse ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Swap ────────────────────────────────────────────────────────────────────
  const handleSwap = () => {
    const mv = mergeViewRef.current
    if (!mv) return
    const a = mv.a.state.doc.toString()
    const b = mv.b.state.doc.toString()
    mv.a.dispatch({ changes: { from: 0, to: mv.a.state.doc.length, insert: b } })
    mv.b.dispatch({ changes: { from: 0, to: mv.b.state.doc.length, insert: a } })
    setLeftText(b)
    setRightText(a)
  }

  // ── Clear ───────────────────────────────────────────────────────────────────
  const handleClear = () => {
    const mv = mergeViewRef.current
    if (!mv) return
    mv.a.dispatch({ changes: { from: 0, to: mv.a.state.doc.length, insert: '' } })
    mv.b.dispatch({ changes: { from: 0, to: mv.b.state.doc.length, insert: '' } })
    setLeftText('')
    setRightText('')
  }

  // ── Sample ──────────────────────────────────────────────────────────────────
  const handleSample = () => {
    const mv = mergeViewRef.current
    if (!mv) return
    mv.a.dispatch({ changes: { from: 0, to: mv.a.state.doc.length, insert: SAMPLE_LEFT } })
    mv.b.dispatch({ changes: { from: 0, to: mv.b.state.doc.length, insert: SAMPLE_RIGHT } })
    setLeftText(SAMPLE_LEFT)
    setRightText(SAMPLE_RIGHT)
    setLangOverride('auto')
  }

  const identical = leftText === rightText
  const hasDiff   = !identical && (leftText || rightText)
  const editorHeight = expanded ? 'calc(100vh - 161px)' : '500px'

  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <div
          className="fixed left-0 right-0 bottom-0 bg-black/40 z-40 backdrop-blur-sm"
          style={{ top: '41px' }}
          onClick={() => setExpanded(false)}
        />
      )}

      <div className={cn('space-y-4 animate-fade-in', expanded && 'relative z-50')}>
        {/* Breadcrumb & Header */}
        {!expanded && (
          <div className="space-y-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white">
                <GitCompare className="w-3.5 h-3.5" />
              </div>
              <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
                Diff <span className="text-[var(--color-accent)]">Viewer</span>
              </h1>
            </div>
          </div>
        )}

        {/* Main Card */}
        <Card
          className={cn(expanded && 'fixed left-4 right-4 bottom-4 z-50 shadow-2xl overflow-auto')}
          style={expanded ? { top: 'calc(41px + 8px)' } : undefined}
        >
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Labels + stats + language selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[var(--color-ink)]">Original</span>
                <span className="text-[var(--color-border-dark)]">→</span>
                <span className="text-xs font-semibold text-[var(--color-ink)]">Modified</span>
                {hasDiff && (
                  <div className="flex items-center gap-1 ml-1">
                    <Badge variant="success" className="text-[10px]">+{stats.added}</Badge>
                    <Badge variant="error" className="text-[10px]">−{stats.removed}</Badge>
                  </div>
                )}
                {identical && (leftText || rightText) && (
                  <Badge variant="default" className="text-[10px] ml-1">identical</Badge>
                )}

                {/* Language selector */}
                <div className="flex items-center gap-1 ml-1">
                  <select
                    value={langOverride}
                    onChange={(e) => setLangOverride(e.target.value)}
                    className="h-6 text-[10px] font-mono pl-1.5 pr-5 rounded-md border border-[var(--color-border)] bg-[var(--color-cream-dark)] text-[var(--color-ink-muted)] hover:border-[var(--color-border-dark)] focus:outline-none focus:border-[var(--color-accent)] focus:text-[var(--color-ink)] transition-colors cursor-pointer appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2378716C'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
                    title="Language for syntax highlighting"
                  >
                    <option value="auto">auto: {detectedLang}</option>
                    {LANG_OPTIONS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleSample} className="gap-1 text-xs h-7 px-2">
                  <Sparkles className="w-3 h-3" />
                  Sample
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSwap} disabled={!leftText && !rightText} className="gap-1 text-xs h-7 px-2">
                  <ArrowLeftRight className="w-3 h-3" />
                  Swap
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-xs h-7 px-2">
                  <Trash2 className="w-3 h-3" />
                  Clear
                </Button>
                <button
                  onClick={() => setExpanded((v) => !v)}
                  title={expanded ? 'Collapse' : 'Expand'}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer"
                >
                  {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Column labels */}
            <div className="grid grid-cols-2 gap-px mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Original</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">Modified</span>
            </div>

            {/* MergeView container */}
            <div
              ref={containerRef}
              style={{ height: editorHeight }}
              className="rounded-lg border border-[var(--color-border)] overflow-auto"
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────


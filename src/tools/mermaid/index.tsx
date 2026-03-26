import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { renderMermaidSVG, THEMES } from 'beautiful-mermaid'
import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { StreamLanguage } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { ChevronLeft, GitBranch, Trash2, Download, Maximize2, Minimize2, Code, Eye, Columns2, ZoomIn, ZoomOut, Shrink } from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── CodeMirror theme ─────────────────────────────────────────────────────────

const appTheme = EditorView.theme(
  {
    '&': {
      fontSize: '13px',
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      background: '#FFFBF5',
      color: '#1C1917',
      border: '1px solid #E7E5E4',
      borderRadius: '8px',
      outline: 'none',
      height: '100%',
    },
    '&.cm-focused': {
      outline: 'none',
      border: '1px solid #EA580C',
      boxShadow: '0 0 0 3px rgba(234, 88, 12, 0.15)',
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
    '.cm-cursor': { borderLeftColor: '#EA580C' },
  },
  { dark: false },
)

// ─── Samples ──────────────────────────────────────────────────────────────────

const SAMPLES: Record<string, { label: string; code: string }> = {
  flowchart: {
    label: 'Flowchart',
    // "This is Fine" — the dog's internal decision tree
    code: `graph TD
  A([Wake up]) --> B{Is the room on fire?}
  B -->|No| C[Carry on]
  B -->|Yes| D{Is the coffee ready?}
  D -->|No| E[Wait for coffee]
  D -->|Yes| F[Pour coffee]
  E --> F
  F --> G{Still on fire?}
  G -->|Yes| H[This is fine]
  G -->|No| I[Mild concern]
  H --> J([Sip coffee])
  I --> J`,
  },
  sequence: {
    label: 'Sequence',
    // The Matrix — Neo takes the red pill
    code: `sequenceDiagram
  participant Neo
  participant Morpheus
  participant Matrix
  participant RealWorld

  Morpheus->>Neo: Red pill or blue pill?
  Neo->>Morpheus: Red pill
  Matrix-->>Neo: Simulation terminating...
  Neo->>RealWorld: Wake up in pod
  RealWorld-->>Neo: Welcome to the desert of the real
  Morpheus->>Neo: We've been waiting for you, Mr. Anderson
  Neo-->>Morpheus: My name is Neo`,
  },
  state: {
    label: 'State',
    // Git — Linus creates the kernel repo, 1991
    code: `stateDiagram-v2
  [*] --> Untracked: git init
  Untracked --> Staged: git add
  Staged --> Committed: git commit
  Committed --> Branched: git branch linus-1991
  Branched --> Merged: git merge
  Committed --> Detached: git checkout v0.01
  Detached --> Committed: git switch -
  Merged --> Tagged: git tag v1.0-torvalds
  Tagged --> [*]`,
  },
  class: {
    label: 'Class',
    // Avengers — superhero class hierarchy
    code: `classDiagram
  class Avenger {
    +String name
    +String alias
    +assemble() void
  }
  class TonyStark {
    +IronManSuit armor
    +int IQ
    +buildSuit() void
    +iAmIronMan() void
  }
  class SteveRogers {
    +Shield vibraniumShield
    +boolean outOfTime
    +onYourLeft() void
  }
  class ThorOdinson {
    +Hammer mjolnir
    +boolean worthy
    +callLightning() void
  }
  class NatashaRomanoff {
    +ledger red
    +vanish() void
  }
  Avenger <|-- TonyStark
  Avenger <|-- SteveRogers
  Avenger <|-- ThorOdinson
  Avenger <|-- NatashaRomanoff`,
  },
  er: {
    label: 'ER',
    // Original Unix V7 filesystem entities, ~1979
    code: `erDiagram
  INODE ||--o{ FILE : "describes"
  INODE ||--o{ DIRECTORY : "describes"
  DIRECTORY ||--|{ INODE : "contains entries for"
  PROCESS ||--o{ FILE : "opens"
  SUPERUSER ||--|{ INODE : "owns"
  INODE {
    int ino PK
    int mode
    int uid
    int size
    int nlinks
  }
  FILE {
    string name
    int inode FK
    string data
  }
  PROCESS {
    int pid PK
    int uid
    string cmd
  }`,
  },
  xychart: {
    label: 'XY Chart',
    // Moore's Law — transistor counts at key milestones
    code: `xychart-beta
  title "Moore's Law: Transistors per Chip"
  x-axis ["4004 71", "8086 78", "386 85", "Pent 93", "P4 00", "Core2 06", "i7 11", "M1 20"]
  y-axis "Transistors (millions)" 0 --> 16000
  bar [0.002, 0.029, 0.275, 3.1, 42, 291, 1160, 16000]`,
  },
}

// ─── Theme options ─────────────────────────────────────────────────────────────

const THEME_OPTIONS = Object.keys(THEMES).map(k => ({ value: k, label: k }))

const SAMPLE_OPTIONS = [
  { value: '', label: 'Examples…' },
  ...Object.entries(SAMPLES).map(([k, s]) => ({ value: k, label: s.label })),
]

// ─── View mode ────────────────────────────────────────────────────────────────

type ViewMode = 'split' | 'editor' | 'preview'

// ─── resolveSvgForRaster ──────────────────────────────────────────────────────
// Canvas cannot resolve CSS custom properties or color-mix(). Before PNG export
// we inline all vars to literal hex values, strip @import, and inject a solid
// background rect so the PNG isn't transparent.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function mixHex(fg: string, bg: string, fgPct: number): string {
  const f = hexToRgb(fg), b = hexToRgb(bg), t = fgPct / 100
  return '#' + ([0, 1, 2] as const)
    .map(i => Math.round(f[i]! * t + b[i]! * (1 - t)).toString(16).padStart(2, '0'))
    .join('')
}

function resolveSvgForRaster(svg: string): string {
  // Extract --bg and --fg seed colors from the root <svg> style attribute
  const bgMatch = svg.match(/--bg:(#[0-9a-fA-F]{6})/)
  const fgMatch = svg.match(/--fg:(#[0-9a-fA-F]{6})/)
  const bg = bgMatch?.[1] ?? '#ffffff'
  const fg = fgMatch?.[1] ?? '#000000'

  // Pre-compute all derived vars used by beautiful-mermaid
  const vars: Record<string, string> = {
    '--bg':           bg,
    '--fg':           fg,
    '--_text':        fg,
    '--_text-sec':    mixHex(fg, bg, 60),
    '--_text-muted':  mixHex(fg, bg, 40),
    '--_text-faint':  mixHex(fg, bg, 25),
    '--_line':        mixHex(fg, bg, 50),
    '--_arrow':       mixHex(fg, bg, 85),
    '--_node-fill':   mixHex(fg, bg, 3),
    '--_node-stroke': mixHex(fg, bg, 20),
    '--_group-fill':  bg,
    '--_group-hdr':   mixHex(fg, bg, 5),
    '--_label-bg':    bg,
  }

  // Also pick up any explicit overrides defined in the SVG (--accent, --surface, etc.)
  for (const [, name, value] of svg.matchAll(/--([a-z][\w-]*):\s*(#[0-9a-fA-F]{6})/g)) {
    if (!vars[`--${name}`]) vars[`--${name!}`] = value!
  }

  // Replace every var(--xxx) reference with its resolved value, up to 3 passes
  // to handle vars that reference other vars
  let out = svg
  for (let pass = 0; pass < 3; pass++) {
    out = out.replace(/var\(--([\w-]+)(?:,\s*[^)]+)?\)/g, (_, name: string) => vars[`--${name}`] ?? bg)
  }

  // Strip @import (Google Fonts — cross-origin, blocked when loading from blob)
  out = out.replace(/@import[^;]+;/g, '')

  // Inject solid background rect immediately after the opening <svg ...> tag
  const insertAt = out.indexOf('>') + 1
  const vbMatch = out.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/)
  const wMatch = out.match(/\bwidth="([\d.]+)"/)
  const hMatch = out.match(/\bheight="([\d.]+)"/)
  const bgRect = vbMatch
    ? `<rect x="${vbMatch[1]}" y="${vbMatch[2]}" width="${vbMatch[3]}" height="${vbMatch[4]}" fill="${bg}"/>`
    : `<rect x="0" y="0" width="${wMatch?.[1] ?? 800}" height="${hMatch?.[1] ?? 600}" fill="${bg}"/>`

  return out.slice(0, insertAt) + bgRect + out.slice(insertAt)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MermaidTool() {
  const [code, setCode] = useState(SAMPLES['flowchart']!.code)
  const [themeName, setThemeName] = useState('zinc-light')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [expanded, setExpanded] = useState(false)

  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)

  // ── Render SVG synchronously via useMemo ────────────────────────────────────
  const { svg, error, svgW, svgH } = useMemo(() => {
    if (!code.trim()) return { svg: '', error: '', svgW: 0, svgH: 0 }
    try {
      const theme = THEMES[themeName] ?? THEMES['zinc-light']!
      const result = renderMermaidSVG(code, { ...theme, transparent: false, padding: 32 })
      const wMatch = result.match(/\bwidth="([\d.]+)"/)
      const hMatch = result.match(/\bheight="([\d.]+)"/)
      const svgW = wMatch ? parseFloat(wMatch[1]!) : 0
      const svgH = hMatch ? parseFloat(hMatch[1]!) : 0
      return { svg: result, error: '', svgW, svgH }
    } catch (e) {
      return { svg: '', error: e instanceof Error ? e.message : 'Render failed', svgW: 0, svgH: 0 }
    }
  }, [code, themeName])

  // ── Track preview pane size for scale-to-fit ────────────────────────────────
  const previewPaneRef = useRef<HTMLDivElement>(null)
  const [paneSize, setPaneSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = previewPaneRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setPaneSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const svgScale = useMemo(() => {
    if (!svgW || !svgH || !paneSize.w || !paneSize.h) return 1
    const padding = 32 // account for p-4 on each side
    return Math.min(1, (paneSize.w - padding) / svgW, (paneSize.h - padding) / svgH)
  }, [svgW, svgH, paneSize])

  // ── User zoom — null means "auto-fit" ────────────────────────────────────────
  const [userZoom, setUserZoom] = useState<number | null>(null)
  const effectiveScale = userZoom ?? svgScale

  const handleZoomIn  = useCallback(() => setUserZoom(z => Math.min(4, (z ?? svgScale) * 1.25)), [svgScale])
  const handleZoomOut = useCallback(() => setUserZoom(z => Math.max(0.05, (z ?? svgScale) * 0.8)), [svgScale])
  const handleZoomFit = useCallback(() => setUserZoom(null), [])

  // ── Esc to collapse ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── CodeMirror setup ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editorContainerRef.current) return

    // Use stex as a basic fallback language — good enough for mermaid keywords
    const state = EditorState.create({
      doc: SAMPLES['flowchart']!.code,
      extensions: [
        basicSetup,
        StreamLanguage.define(stex),
        appTheme,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) setCode(update.state.doc.toString())
        }),
      ],
    })

    const view = new EditorView({ state, parent: editorContainerRef.current })
    editorViewRef.current = view
    return () => { view.destroy(); editorViewRef.current = null }
  }, [])

  // ── Replace editor content ──────────────────────────────────────────────────
  const setEditorContent = useCallback((text: string) => {
    const view = editorViewRef.current
    if (!view) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
  }, [])

  const handleSample = useCallback((key: string) => {
    const sample = SAMPLES[key]
    if (sample) setEditorContent(sample.code)
  }, [setEditorContent])

  const handleClear = useCallback(() => setEditorContent(''), [setEditorContent])

  // ── Download SVG ────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!svg) return
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagram.svg'
    a.click()
    URL.revokeObjectURL(url)
  }, [svg])

  // ── Download PNG ────────────────────────────────────────────────────────────
  const handleDownloadPng = useCallback(() => {
    if (!svg) return
    const fixed = resolveSvgForRaster(svg)
    const wMatch = fixed.match(/\bwidth="([\d.]+)"/)
    const hMatch = fixed.match(/\bheight="([\d.]+)"/)
    const w = wMatch ? Math.ceil(parseFloat(wMatch[1]!)) : 800
    const h = hMatch ? Math.ceil(parseFloat(hMatch[1]!)) : 600
    const scale = 2 // 2× for retina
    const blob = new Blob([fixed], { type: 'image/svg+xml;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const img  = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = w * scale
      canvas.height = h * scale
      const ctx = canvas.getContext('2d')!
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const a = document.createElement('a')
      a.href     = canvas.toDataURL('image/png')
      a.download = 'diagram.png'
      a.click()
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }, [svg])

  const PANE_HEIGHT = expanded ? 'calc(100vh - 161px)' : 560

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
                <GitBranch className="w-3.5 h-3.5" />
              </div>
              <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
                Mermaid <span className="text-[var(--color-accent)]">Diagrams</span>
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
            <div className="flex items-center justify-between gap-2">
              {/* Left: view toggles + sample picker */}
              <div className="flex items-center gap-1.5">
                {/* View mode */}
                <div className="flex items-center gap-0.5 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded-lg p-0.5">
                  {(['editor', 'split', 'preview'] as ViewMode[]).map((mode) => {
                    const Icon = mode === 'editor' ? Code : mode === 'split' ? Columns2 : Eye
                    return (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer capitalize',
                          viewMode === mode
                            ? 'bg-white text-[var(--color-ink)] shadow-sm'
                            : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {mode}
                      </button>
                    )
                  })}
                </div>

                {/* Sample picker */}
                <div className="w-32">
                  <Select
                    options={SAMPLE_OPTIONS}
                    value=""
                    onChange={e => { if (e.target.value) handleSample(e.target.value) }}
                    className="h-7 text-xs py-0"
                  />
                </div>
              </div>

              {/* Right: theme picker + actions */}
              <div className="flex items-center gap-1.5">
                <div className="w-36">
                  <Select
                    options={THEME_OPTIONS}
                    value={themeName}
                    onChange={e => setThemeName(e.target.value)}
                    className="h-7 text-xs py-0"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={handleDownload} disabled={!svg} className="gap-1 text-xs h-7 px-2">
                  <Download className="w-3 h-3" />
                  SVG
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDownloadPng} disabled={!svg} className="gap-1 text-xs h-7 px-2">
                  <Download className="w-3 h-3" />
                  PNG
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-xs h-7 px-2">
                  <Trash2 className="w-3 h-3" />
                  Clear
                </Button>
                <button
                  onClick={() => setExpanded(v => !v)}
                  title={expanded ? 'Collapse' : 'Expand'}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer"
                >
                  {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className={cn(viewMode === 'split' && 'grid grid-cols-2 gap-3')}>

              {/* ── Editor pane ─────────────────────────────────────────── */}
              <div
                className={cn(viewMode === 'preview' && 'hidden')}
                style={{ height: PANE_HEIGHT }}
              >
                <div ref={editorContainerRef} className="h-full rounded-lg" />
              </div>

              {/* ── Preview pane ─────────────────────────────────────────── */}
              <div
                ref={previewPaneRef}
                className={cn(
                  'relative rounded-lg border border-[var(--color-border)] overflow-auto flex flex-col items-center justify-center p-4',
                  viewMode === 'editor' && 'hidden',
                )}
                style={{ height: PANE_HEIGHT, background: THEMES[themeName]?.bg ?? '#fff' }}
              >
                {error ? (
                  <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-mono whitespace-pre-wrap">
                    {error}
                  </div>
                ) : svg ? (
                  <div
                    className="max-w-full"
                    style={{ transform: `scale(${effectiveScale})`, transformOrigin: 'center center' }}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                ) : (
                  <p className="text-xs text-[var(--color-ink-muted)] italic mt-8">
                    Start typing to render a diagram
                  </p>
                )}

                {/* ── Zoom controls overlay ──────────────────────────────── */}
                {svg && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-[var(--color-surface)]/80 backdrop-blur-sm border border-[var(--color-border)] rounded-lg px-1 py-0.5 shadow-sm">
                    <button
                      onClick={handleZoomOut}
                      title="Zoom out"
                      className="inline-flex items-center justify-center w-6 h-6 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-[var(--color-ink-muted)] w-9 text-center select-none">
                      {Math.round(effectiveScale * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      title="Zoom in"
                      className="inline-flex items-center justify-center w-6 h-6 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)] transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3.5 bg-[var(--color-border)] mx-0.5" />
                    <button
                      onClick={handleZoomFit}
                      title="Fit to window"
                      className={cn(
                        'inline-flex items-center justify-center w-6 h-6 rounded transition-colors cursor-pointer',
                        userZoom === null
                          ? 'text-[var(--color-accent)]'
                          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)]'
                      )}
                    >
                      <Shrink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-[10px] text-[var(--color-ink-muted)]">
                {code.split('\n').length} lines
              </span>
              {expanded && (
                <span className="text-[10px] text-[var(--color-ink-muted)]">
                  Press <kbd className="px-1 py-0.5 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded text-[9px]">Esc</kbd> or click outside to collapse
                </span>
              )}
              <span className="text-[10px] text-[var(--color-ink-muted)] ml-auto">
                Powered by <a href="https://github.com/lukilabs/beautiful-mermaid" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent)] transition-colors">beautiful-mermaid</a>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

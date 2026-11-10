import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { renderMermaidSVG, THEMES } from 'beautiful-mermaid'
import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { Compartment } from '@codemirror/state'
import { EditorState } from '@codemirror/state'
import { StreamLanguage } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'
import {
  useExpandable,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandToggleButton,
  ExpandHint,
  EXPANDED_PANE_HEIGHT,
} from '../../components/ui/ExpandableCard'
import { Workflow, Trash2, Download, Code, Eye, Columns2, ZoomIn, ZoomOut, Shrink } from 'lucide-react'
import { cn } from '../../lib/utils'
import { appTheme, appThemeDark } from '../../lib/codemirrorTheme'
import { useTheme } from '../../contexts/ThemeContext'
import { resolveSvgForRaster } from './raster'

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function MermaidTool() {
  const { isDark } = useTheme()
  const [code, setCode] = useState(SAMPLES['flowchart']!.code)
  const [themeName, setThemeName] = useState(() => {
    const stored = localStorage.getItem('mermaid-theme')
    if (stored && stored in THEMES) return stored
    return isDark ? 'zinc-dark' : 'zinc-light'
  })
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const { expanded, setExpanded } = useExpandable()
  const isDarkRef = useRef(isDark)
  isDarkRef.current = isDark

  // ── Auto-follow dark mode when the user has no stored preference ─────────────
  useEffect(() => {
    if (localStorage.getItem('mermaid-theme')) return
    setThemeName(isDark ? 'zinc-dark' : 'zinc-light')
  }, [isDark])

  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const themeComp = useRef(new Compartment())

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
    const padding = 32 // margin inside the content box, which already excludes p-4
    return Math.min(1, (paneSize.w - padding) / svgW, (paneSize.h - padding) / svgH)
  }, [svgW, svgH, paneSize])

  // ── User zoom — null means "auto-fit" ────────────────────────────────────────
  const [userZoom, setUserZoom] = useState<number | null>(null)
  const effectiveScale = userZoom ?? svgScale
  const svgScaleRef = useRef(svgScale)
  svgScaleRef.current = svgScale

  const handleZoomIn  = useCallback(() => setUserZoom(z => Math.min(4, (z ?? svgScaleRef.current) * 1.25)), [])
  const handleZoomOut = useCallback(() => setUserZoom(z => Math.max(0.05, (z ?? svgScaleRef.current) * 0.8)), [])
  const handleZoomFit = useCallback(() => setUserZoom(null), [])

  // ── Trackpad pinch-to-zoom ────────────────────────────────────────────────────
  useEffect(() => {
    const el = previewPaneRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const factor = Math.exp(-e.deltaY * 0.01)
      setUserZoom(z => Math.min(4, Math.max(0.05, (z ?? svgScaleRef.current) * factor)))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Esc handled by useExpandable ────────────────────────────────────────────

  // ── CodeMirror setup ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!editorContainerRef.current) return

    // Use stex as a basic fallback language — good enough for mermaid keywords
    const state = EditorState.create({
      doc: SAMPLES['flowchart']!.code,
      extensions: [
        basicSetup,
        StreamLanguage.define(stex),
        themeComp.current.of(isDarkRef.current ? appThemeDark : appTheme),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ 'aria-label': 'Mermaid source' }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) setCode(update.state.doc.toString())
        }),
      ],
    })

    const view = new EditorView({ state, parent: editorContainerRef.current })
    editorViewRef.current = view
    return () => { view.destroy(); editorViewRef.current = null }
  }, [])

  // Reconfigure CodeMirror syntax highlighting when dark mode changes
  useEffect(() => {
    const view = editorViewRef.current
    if (!view) return
    view.dispatch({ effects: themeComp.current.reconfigure(isDark ? appThemeDark : appTheme) })
  }, [isDark])

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

  const PANE_HEIGHT = expanded ? EXPANDED_PANE_HEIGHT : 560

  return (
    <>
      <div className={cn('space-y-4 animate-fade-in', expanded && 'relative z-50')}>
        {/* Breadcrumb & Header */}
          {!expanded && (
            <ToolHeader icon={<Workflow />} title="Mermaid" accentedSuffix="Diagrams" />
          )}

        {/* Main card */}
        <ExpandableCard expanded={expanded} onExpandedChange={setExpanded}>
          <ExpandableCardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Left: view toggles + sample picker */}
              <div className="flex flex-wrap items-center gap-1.5">
                {/* View mode */}
                <SegmentedControl value={viewMode} onChange={(v) => setViewMode(v as ViewMode)}>
                  {(['editor', 'split', 'preview'] as ViewMode[]).map((mode) => {
                    const Icon = mode === 'editor' ? Code : mode === 'split' ? Columns2 : Eye
                    return (
                      <SegmentedControlItem
                        key={mode}
                        value={mode}
                        title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                        className="px-2 py-1 capitalize"
                      >
                        <Icon className="w-3 h-3" />
                        {mode}
                      </SegmentedControlItem>
                    )
                  })}
                </SegmentedControl>

                {/* Sample picker */}
                <div className="w-32">
                  <Select
                    options={SAMPLE_OPTIONS}
                    aria-label="Load a sample diagram"
                    value=""
                    onChange={e => { if (e.target.value) handleSample(e.target.value) }}
                    className="h-7 text-xs py-0"
                  />
                </div>
              </div>

              {/* Right: theme picker + actions */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="w-36">
                  <Select
                    options={THEME_OPTIONS}
                    aria-label="Diagram theme"
                    value={themeName}
                    onChange={e => { localStorage.setItem('mermaid-theme', e.target.value); setThemeName(e.target.value) }}
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
                <ExpandToggleButton />
              </div>
            </div>
          </ExpandableCardHeader>

          <ExpandableCardContent>
            <div className={cn(viewMode === 'split' && 'grid grid-cols-1 md:grid-cols-2 gap-3')}>

              {/* ── Editor pane ─────────────────────────────────────────── */}
              <div
                className={cn(viewMode === 'preview' && 'hidden')}
                style={{ height: PANE_HEIGHT }}
              >
                <div ref={editorContainerRef} className="h-full rounded-lg" />
              </div>

              {/* ── Preview pane ─────────────────────────────────────────── */}
              <div
                className={cn(
                  'relative rounded-lg border border-[var(--color-border)] overflow-hidden',
                  viewMode === 'editor' && 'hidden',
                )}
                style={{ height: PANE_HEIGHT, background: THEMES[themeName]?.bg ?? '#fff' }}
              >
                {/* The zoom sets the layout size, not a transform, so the scroll
                    area matches the diagram. Auto margins centre it without
                    pushing the top-left corner out of the scroll area. */}
                <div
                  ref={previewPaneRef}
                  className={cn(
                    'h-full overflow-auto flex flex-col p-4',
                    !svg && 'items-center justify-center',
                  )}
                >
                  {error ? (
                    <div className="w-full p-3 bg-[var(--color-error-bg)] border border-[var(--color-error-border)] rounded-lg text-xs text-[var(--color-error-text)] font-mono whitespace-pre-wrap">
                      {error}
                    </div>
                  ) : svg ? (
                    <div
                      className="m-auto shrink-0 [&>svg]:block [&>svg]:w-full [&>svg]:h-full"
                      style={svgW && svgH ? { width: svgW * effectiveScale, height: svgH * effectiveScale } : undefined}
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  ) : (
                    <p className="text-xs text-[var(--color-ink-muted)] italic mt-8">
                      Start typing to render a diagram
                    </p>
                  )}
                </div>

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
                          ? 'text-[var(--color-accent-text)]'
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
              <ExpandHint />
              <span className="text-[10px] text-[var(--color-ink-muted)] ml-auto">
                Powered by <a href="https://github.com/lukilabs/beautiful-mermaid" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--color-ink)] transition-colors">beautiful-mermaid</a>
              </span>
            </div>
          </ExpandableCardContent>
        </ExpandableCard>
      </div>
    </>
  )
}

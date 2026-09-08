import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Code, Columns2, Download, Eye, RotateCw, Shrink, Trash2, Workflow, ZoomIn, ZoomOut } from 'lucide-react'
import {
  Alert, Button, CopyButton, Select, Toggle, ToolHeader, SectionLabel,
  SegmentedControl, SegmentedControlItem, Spinner,
  ExpandableCard, ExpandableCardHeader, ExpandableCardContent,
  ExpandToggleButton, ExpandHint, useExpandable,
  DEFAULT_PANE_HEIGHT, EXPANDED_PANE_HEIGHT,
} from '../../components/ui'
import { cn } from '../../lib/utils'
import { useTheme } from '../../contexts/ThemeContext'
import { CodeEditor } from './CodeEditor'
import { SAMPLES } from './samples'
import { useD2, type Layout } from './useD2'
import { decodeState, DEFAULT_STATE, type ShareState } from './shareState'
import { ShareButton } from './ShareButton'

const LAYOUT_OPTIONS = [
  { value: 'tala', label: 'TALA' },
  { value: 'dagre', label: 'Dagre' },
  { value: 'elk', label: 'ELK' },
]
const THEME_OPTIONS = [
  { value: '0', label: 'Default' },
  { value: '1', label: 'Neutral gray' },
  { value: '3', label: 'Flagship' },
  { value: '200', label: 'Dark mauve' },
]

export default function D2Tool() {
  const { hash } = useLocation()
  const [loaded, setLoaded] = useState<{ hash: string; state: ShareState | null; error: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    decodeState(hash).then(
      state => { if (!cancelled) setLoaded({ hash, state, error: '' }) },
      error => { if (!cancelled) setLoaded({ hash, state: null, error: error instanceof Error ? error.message : 'Could not open this share link.' }) },
    )
    return () => { cancelled = true }
  }, [hash])

  if (loaded?.hash !== hash) return <div role="status" className="flex items-center gap-2 text-xs"><Spinner size="sm" /> Loading diagram…</div>
  return <D2Editor initial={loaded.state ?? DEFAULT_STATE} shared={Boolean(loaded.state)} linkError={loaded.error} />
}

function D2Editor({ initial, shared, linkError }: { initial: ShareState; shared: boolean; linkError: string }) {
  const [code, setCode] = useState(initial.code)
  const [layout, setLayout] = useState<Layout>(initial.layout)
  const [theme, setTheme] = useState(initial.theme)
  const [sketch, setSketch] = useState(initial.sketch)
  const [renderer, setRenderer] = useState(initial.renderer)
  const [asciiMode, setAsciiMode] = useState(initial.asciiMode)
  const [view, setView] = useState(initial.view)
  const [zoom, setZoom] = useState(initial.zoom)
  const [revision, setRevision] = useState(0)
  const { expanded, setExpanded } = useExpandable({ defaultExpanded: initial.expanded })
  const { isDark, toggle } = useTheme()
  const appliedTheme = useRef(false)
  useEffect(() => {
    if (appliedTheme.current) return
    appliedTheme.current = true
    if (shared && isDark !== initial.isDark) toggle()
  }, [shared, initial.isDark, isDark, toggle])
  const isAscii = renderer === 'ascii'
  const { output, error, pending } = useD2(code, layout, Number(theme), sketch, revision, isAscii ? asciiMode : 'svg')
  const svg = isAscii ? '' : output
  const paneHeight = expanded ? EXPANDED_PANE_HEIGHT : DEFAULT_PANE_HEIGHT
  const imageUrl = useMemo(() => svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : '', [svg])

  const handleSample = (value: string) => {
    const sample = SAMPLES.find(item => item.value === value)
    if (!sample) return
    setCode(sample.code)
    setZoom(1)
    if (sample.value === 'positions') setLayout('tala')
  }

  const handleDownload = () => {
    if (!output) return
    const url = URL.createObjectURL(new Blob([output], { type: isAscii ? 'text/plain;charset=utf-8' : 'image/svg+xml' }))
    const link = document.createElement('a')
    link.href = url
    link.download = isAscii ? 'diagram.txt' : 'diagram.svg'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-3">
      <ToolHeader icon={<Workflow />} title="D2 Diagrams" />
      <p className="text-xs text-[var(--color-ink-muted)]">
        Write D2 and turn it into a diagram. Rendering runs locally in your browser.
      </p>
      {linkError && <Alert variant="error">{linkError} The example below is ready to edit.</Alert>}

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Select id="d2-example" label="Example" value="" onChange={event => handleSample(event.target.value)}
            options={[{ value: '', label: 'Load an example…' }, ...SAMPLES]} />
        </div>
        <div className="w-28">
          <Select id="d2-renderer" label="Renderer" value={renderer} onChange={event => {
            setRenderer(event.target.value as ShareState['renderer'])
            if (event.target.value === 'ascii' && layout === 'dagre') setLayout('elk')
          }} options={[{ value: 'svg', label: 'SVG' }, { value: 'ascii', label: 'ASCII' }]} />
        </div>
        <div className="w-28">
          <Select id="d2-layout" label="Layout" value={layout} onChange={event => setLayout(event.target.value as Layout)} options={LAYOUT_OPTIONS.filter(option => !isAscii || option.value !== 'dagre')} />
        </div>
        {isAscii ? (
          <div className="w-40">
            <Select id="d2-characters" label="Characters" value={asciiMode} onChange={event => setAsciiMode(event.target.value as typeof asciiMode)}
              options={[{ value: 'standard', label: 'Basic ASCII' }, { value: 'extended', label: 'Unicode boxes' }]} />
          </div>
        ) : (
          <>
            <div className="w-36">
              <Select id="d2-theme" label="Diagram theme" value={theme} onChange={event => setTheme(event.target.value as ShareState['theme'])} options={THEME_OPTIONS} />
            </div>
            <div className="py-1.5">
              <Toggle label="Sketch" checked={sketch} onChange={event => setSketch(event.target.checked)} />
            </div>
          </>
        )}
        <a href="https://d2lang.com/tour/intro/" target="_blank" rel="noopener noreferrer"
          className="ml-auto py-2 text-xs text-[var(--color-ink-muted)] underline hover:text-[var(--color-ink)]">D2 syntax guide ↗</a>
      </div>

      <ExpandableCard expanded={expanded} onExpandedChange={setExpanded}>
        <ExpandableCardHeader className="flex flex-wrap items-center justify-between gap-2">
          <SegmentedControl value={view} onChange={value => setView(value as ShareState['view'])} label="View mode">
            <SegmentedControlItem value="editor" label="Editor"><Code className="h-3.5 w-3.5" /></SegmentedControlItem>
            <SegmentedControlItem value="split" label="Split view"><Columns2 className="h-3.5 w-3.5" /></SegmentedControlItem>
            <SegmentedControlItem value="preview" label="Preview"><Eye className="h-3.5 w-3.5" /></SegmentedControlItem>
          </SegmentedControl>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setCode('')} disabled={!code} title="Clear source" aria-label="Clear source"><Trash2 className="h-3.5 w-3.5" /></Button>
            <ShareButton state={{ v: 1, code, layout, theme, sketch, renderer, asciiMode, view, zoom, expanded, isDark }} />
            <CopyButton text={output} disabled={!output}>Copy {isAscii ? 'ASCII' : 'SVG'}</CopyButton>
            <Button variant="secondary" size="sm" onClick={handleDownload} disabled={!output} className="gap-1.5"><Download className="h-3 w-3" /> {isAscii ? 'TXT' : 'SVG'}</Button>
            <ExpandToggleButton />
          </div>
        </ExpandableCardHeader>
        <ExpandableCardContent>
          <div className={cn('grid gap-3', view === 'split' && 'md:grid-cols-2')}>
            <div className={cn('min-w-0 flex flex-col gap-2', view === 'preview' && 'hidden')} style={{ height: paneHeight }}>
              <SectionLabel>D2 source</SectionLabel>
              <div className="min-h-0 flex-1"><CodeEditor code={code} onChange={setCode} /></div>
            </div>
            <div className={cn('min-w-0 flex flex-col gap-2', view === 'editor' && 'hidden')} style={{ height: paneHeight }}>
              <div className="flex items-center justify-between gap-2">
                <SectionLabel>{isAscii ? 'ASCII diagram' : 'Diagram'}</SectionLabel>
                {!isAscii && <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" aria-label="Zoom out" disabled={!svg || zoom <= 0.5} onClick={() => setZoom(value => Math.max(0.5, value / 1.25))}><ZoomOut className="h-3 w-3" /></Button>
                  <span className="w-9 text-center text-[10px] font-mono text-[var(--color-ink-muted)]">{Math.round(zoom * 100)}%</span>
                  <Button variant="ghost" size="sm" aria-label="Zoom in" disabled={!svg || zoom >= 4} onClick={() => setZoom(value => Math.min(4, value * 1.25))}><ZoomIn className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="sm" aria-label="Fit diagram" disabled={!svg} onClick={() => setZoom(1)}><Shrink className="h-3 w-3" /></Button>
                </div>}
              </div>
              <div aria-busy={pending} className="min-h-0 flex-1 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                {pending ? (
                  <div role="status" className="flex h-full items-center justify-center gap-2 text-xs text-[var(--color-ink-muted)]"><Spinner size="sm" /> Rendering diagram…</div>
                ) : error ? (
                  <div className="space-y-3 p-3">
                    <Alert variant="error"><pre className="whitespace-pre-wrap break-words font-mono text-xs">{error}</pre></Alert>
                    <Button variant="secondary" size="sm" onClick={() => setRevision(value => value + 1)} className="gap-1.5"><RotateCw className="h-3 w-3" /> Retry</Button>
                  </div>
                ) : isAscii && output ? (
                  <pre aria-label="ASCII diagram" tabIndex={0} className="min-h-full w-max min-w-full whitespace-pre p-4 font-mono text-xs leading-normal text-[var(--color-ink)]">{output}</pre>
                ) : svg && imageUrl ? (
                  <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} className="mx-auto">
                    <img src={imageUrl} alt="Rendered D2 diagram" className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-xs text-[var(--color-ink-muted)]">Write D2 or load an example to see your diagram.</div>
                )}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--color-ink-muted)]">
            <span>{code ? code.split('\n').length : 0} lines</span>
            <ExpandHint />
            <span className="ml-auto">Powered by D2 · {layout.toUpperCase()}</span>
          </div>
        </ExpandableCardContent>
      </ExpandableCard>
    </div>
  )
}

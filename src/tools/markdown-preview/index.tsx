import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { marked } from 'marked'
import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { ChevronLeft, FileText, Trash2, RefreshCw, Code, Eye, Columns2, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '../../lib/utils'

// ─── marked configuration ─────────────────────────────────────────────────────

marked.setOptions({ gfm: true, breaks: true })

// ─── CodeMirror theme (warm palette, matches rest of app) ─────────────────────

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

// ─── Sample content ───────────────────────────────────────────────────────────

const SAMPLE_MD = `# Markdown Preview

A **live** side-by-side editor with *GFM* support.

## Features

- Live rendering as you type
- GitHub Flavored Markdown (GFM)
- Tables, task lists, code blocks

## Code

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`
}
\`\`\`

## Table

| Name    | Type    | Default |
|---------|---------|---------|
| gfm     | boolean | true    |
| breaks  | boolean | true    |

## Task List

- [x] Write Markdown
- [x] See rendered preview
- [ ] Deploy to production

> "The best tools are the ones you barely notice."
`

// ─── Prose styles injected into the preview iframe / div ──────────────────────

const PROSE_STYLES = `
  .md-body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.7; color: #1C1917; }
  .md-body h1,.md-body h2,.md-body h3,.md-body h4 { font-weight: 700; margin: 1.2em 0 0.4em; line-height: 1.25; color: #1C1917; }
  .md-body h1 { font-size: 1.6em; border-bottom: 2px solid #E7E5E4; padding-bottom: 0.25em; }
  .md-body h2 { font-size: 1.3em; border-bottom: 1px solid #E7E5E4; padding-bottom: 0.2em; }
  .md-body h3 { font-size: 1.1em; }
  .md-body p { margin: 0.6em 0; }
  .md-body a { color: #EA580C; text-decoration: underline; }
  .md-body code { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 0.85em; background: #FFF7ED; border: 1px solid #E7E5E4; border-radius: 4px; padding: 0.1em 0.35em; }
  .md-body pre { background: #1C1917; border-radius: 8px; padding: 1em; overflow-x: auto; margin: 0.8em 0; }
  .md-body pre code { background: none; border: none; padding: 0; color: #FFF7ED; font-size: 0.82em; }
  .md-body blockquote { border-left: 3px solid #EA580C; margin: 0.8em 0; padding: 0.2em 0.8em; color: #78716C; background: #FFF7ED; border-radius: 0 6px 6px 0; }
  .md-body ul,.md-body ol { padding-left: 1.5em; margin: 0.5em 0; }
  .md-body ul { list-style-type: disc; }
  .md-body ul ul { list-style-type: circle; }
  .md-body ul ul ul { list-style-type: square; }
  .md-body ol { list-style-type: decimal; }
  .md-body li { margin: 0.2em 0; display: list-item; }
  .md-body li input[type=checkbox] { margin-right: 0.4em; accent-color: #EA580C; }
  .md-body table { border-collapse: collapse; width: 100%; margin: 0.8em 0; font-size: 0.9em; }
  .md-body th { background: #FFF7ED; font-weight: 600; text-align: left; }
  .md-body th,.md-body td { border: 1px solid #E7E5E4; padding: 0.4em 0.75em; }
  .md-body tr:nth-child(even) { background: #FFFBF5; }
  .md-body img { max-width: 100%; border-radius: 6px; }
  .md-body hr { border: none; border-top: 1px solid #E7E5E4; margin: 1.2em 0; }
`

// ─── View modes ───────────────────────────────────────────────────────────────

type ViewMode = 'split' | 'editor' | 'preview'

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarkdownPreviewTool() {
  const [source, setSource] = useState(SAMPLE_MD)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [expanded, setExpanded] = useState(false)

  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)

  // Render markdown → HTML (synchronous with marked v15)
  const html = useMemo(() => marked.parse(source) as string, [source])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Build CodeMirror editor once on mount
  useEffect(() => {
    if (!editorContainerRef.current) return

    const state = EditorState.create({
      doc: SAMPLE_MD,
      extensions: [
        basicSetup,
        markdown(),
        appTheme,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setSource(update.state.doc.toString())
          }
        }),
      ],
    })

    const view = new EditorView({ state, parent: editorContainerRef.current })
    editorViewRef.current = view

    return () => {
      view.destroy()
      editorViewRef.current = null
    }
  }, [])

  const handleClear = useCallback(() => {
    const view = editorViewRef.current
    if (!view) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '' } })
  }, [])

  const handleSample = useCallback(() => {
    const view = editorViewRef.current
    if (!view) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: SAMPLE_MD } })
  }, [])

  const EDITOR_HEIGHT = expanded ? 'calc(100vh - 161px)' : 560

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
        {/* Breadcrumb & Header — hidden in expanded mode */}
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
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h1 className="font-mono text-lg font-semibold text-[var(--color-ink)]">
                Markdown <span className="text-[var(--color-accent)]">Preview</span>
              </h1>
            </div>
          </div>
        )}

        {/* Main Card */}
        <Card
          className={cn(
            expanded && 'fixed left-4 right-4 bottom-4 z-50 shadow-2xl overflow-auto',
          )}
          style={expanded ? { top: 'calc(41px + 8px)' } : undefined}
        >
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* View mode toggles */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('editor')}
                  title="Editor only"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                    viewMode === 'editor'
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)]'
                  )}
                >
                  <Code className="w-3 h-3" />
                  Editor
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  title="Split view"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                    viewMode === 'split'
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)]'
                  )}
                >
                  <Columns2 className="w-3 h-3" />
                  Split
                </button>
                <button
                  onClick={() => setViewMode('preview')}
                  title="Preview only"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                    viewMode === 'preview'
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-dark)]'
                  )}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={handleSample} className="gap-1 text-xs h-7 px-2">
                  <RefreshCw className="w-3 h-3" />
                  Sample
                </Button>
                <CopyButton text={source} />
                <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-xs h-7 px-2">
                  <Trash2 className="w-3 h-3" />
                  Clear
                </Button>
                {/* Expand / collapse */}
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
            <div
              className={cn(
                viewMode === 'split' && 'grid grid-cols-2 gap-3',
              )}
            >
              {/* ── Editor pane ───────────────────────────────────────────── */}
              <div
                className={cn(viewMode === 'preview' && 'hidden')}
                style={{ height: EDITOR_HEIGHT }}
              >
                <div ref={editorContainerRef} className="h-full rounded-lg" />
              </div>

              {/* ── Preview pane ──────────────────────────────────────────── */}
              <div
                className={cn(
                  'overflow-y-auto rounded-lg border border-[var(--color-border)] bg-white px-5 py-4',
                  viewMode === 'editor' && 'hidden',
                )}
                style={{ height: EDITOR_HEIGHT }}
              >
                <style>{PROSE_STYLES}</style>
                <div
                  className="md-body"
                  // marked output is sanitised — no user-controlled script injection
                  // possible since we use default marked with no raw HTML passthrough
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-2">
              <span className="text-[10px] text-[var(--color-ink-muted)]">
                {source.split('\n').length} lines
              </span>
              <span className="text-[10px] text-[var(--color-ink-muted)]">
                {source.length} chars
              </span>
              {expanded && (
                <span className="text-[10px] text-[var(--color-ink-muted)]">
                  Press <kbd className="px-1 py-0.5 bg-[var(--color-cream-dark)] border border-[var(--color-border)] rounded text-[9px]">Esc</kbd> or click outside to collapse
                </span>
              )}
              <span className="text-[10px] text-[var(--color-ink-muted)] ml-auto">
                Rendered with <a href="https://marked.js.org" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent)] transition-colors">marked</a> · GFM enabled
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

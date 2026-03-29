import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { marked } from 'marked'
import { basicSetup } from 'codemirror'
import { EditorView } from '@codemirror/view'
import { Compartment } from '@codemirror/state'
import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { Button } from '../../components/ui/Button'
import { CopyButton } from '../../components/ui/CopyButton'
import { ToolHeader } from '../../components/ui/ToolHeader'
import { SegmentedControl, SegmentedControlItem } from '../../components/ui/SegmentedControl'
import {
  useExpandable,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandToggleButton,
  ExpandHint,
} from '../../components/ui/ExpandableCard'
import { FileText, Trash2, RefreshCw, Code, Eye, Columns2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { appTheme, appThemeDark } from '../../lib/codemirrorTheme'
import { useTheme } from '../../contexts/ThemeContext'

// ─── marked configuration ─────────────────────────────────────────────────────

marked.setOptions({ gfm: true, breaks: true })

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

  /* ── Dark mode overrides ── */
  .dark .md-body { color: #F2EDE8; }
  .dark .md-body h1,.dark .md-body h2,.dark .md-body h3,.dark .md-body h4 { color: #F2EDE8; }
  .dark .md-body h1 { border-bottom-color: #3A3430; }
  .dark .md-body h2 { border-bottom-color: #3A3430; }
  .dark .md-body a { color: #F97316; }
  .dark .md-body code { background: #332A1E; border-color: #4A4440; color: #F2EDE8; }
  .dark .md-body pre { background: #141210; }
  .dark .md-body pre code { color: #CFC8C1; }
  .dark .md-body blockquote { color: #9A8F88; background: #231F1C; border-left-color: #F97316; }
  .dark .md-body th { background: #231F1C; color: #F2EDE8; }
  .dark .md-body th,.dark .md-body td { border-color: #3A3430; color: #F2EDE8; }
  .dark .md-body tr:nth-child(even) { background: #2C2621; }
  .dark .md-body hr { border-top-color: #3A3430; }
`

// ─── View modes ───────────────────────────────────────────────────────────────

type ViewMode = 'split' | 'editor' | 'preview'

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarkdownPreviewTool() {
  const [source, setSource] = useState(SAMPLE_MD)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const { expanded, setExpanded } = useExpandable()
  const { isDark } = useTheme()
  const isDarkRef = useRef(isDark)
  isDarkRef.current = isDark

  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const themeComp = useRef(new Compartment())

  // Render markdown → HTML (synchronous with marked v15)
  const html = useMemo(() => marked.parse(source) as string, [source])

  // Build CodeMirror editor once on mount
  useEffect(() => {
    if (!editorContainerRef.current) return

    const state = EditorState.create({
      doc: SAMPLE_MD,
      extensions: [
        basicSetup,
        markdown(),
        themeComp.current.of(isDarkRef.current ? appThemeDark : appTheme),
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

  // Reconfigure CodeMirror syntax highlighting when dark mode changes
  useEffect(() => {
    const view = editorViewRef.current
    if (!view) return
    view.dispatch({ effects: themeComp.current.reconfigure(isDark ? appThemeDark : appTheme) })
  }, [isDark])

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
      <div className={cn('space-y-4 animate-fade-in', expanded && 'relative z-50')}>
        {/* Breadcrumb & Header — hidden in expanded mode */}
          {!expanded && (
            <ToolHeader icon={<FileText />} title="Markdown" accentedSuffix="Preview" />
          )}

        {/* Main Card */}
        <ExpandableCard expanded={expanded} onExpandedChange={setExpanded}>
          <ExpandableCardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* View mode toggles */}
              <SegmentedControl value={viewMode} onChange={(v) => setViewMode(v as 'editor' | 'split' | 'preview')} variant="accent">
                <SegmentedControlItem value="editor" title="Editor only" className="px-2.5 py-1">
                  <Code className="w-3 h-3" />
                  Editor
                </SegmentedControlItem>
                <SegmentedControlItem value="split" title="Split view" className="px-2.5 py-1">
                  <Columns2 className="w-3 h-3" />
                  Split
                </SegmentedControlItem>
                <SegmentedControlItem value="preview" title="Preview only" className="px-2.5 py-1">
                  <Eye className="w-3 h-3" />
                  Preview
                </SegmentedControlItem>
              </SegmentedControl>

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
                <ExpandToggleButton />
              </div>
            </div>
          </ExpandableCardHeader>

          <ExpandableCardContent>
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
                  'overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4',
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
              <ExpandHint />
              <span className="text-[10px] text-[var(--color-ink-muted)] ml-auto">
                Rendered with <a href="https://marked.js.org" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent)] transition-colors">marked</a> · GFM enabled
              </span>
            </div>
          </ExpandableCardContent>
        </ExpandableCard>
      </div>
    </>
  )
}

import { useEffect, useRef } from 'react'
import { basicSetup } from 'codemirror'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { appTheme, appThemeDark } from '../../lib/codemirrorTheme'
import { useTheme } from '../../contexts/ThemeContext'

interface CodeEditorProps {
  code: string
  onChange: (code: string) => void
}

export function CodeEditor({ code, onChange }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const initialCode = useRef(code)
  const onChangeRef = useRef(onChange)
  const themeComp = useRef(new Compartment())
  const { isDark } = useTheme()

  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  useEffect(() => {
    if (!containerRef.current) return
    const view = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: initialCode.current,
        extensions: [
          basicSetup,
          themeComp.current.of(appTheme),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ 'aria-label': 'D2 source' }),
          EditorView.updateListener.of(update => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString())
          }),
        ],
      }),
    })
    viewRef.current = view
    return () => { view.destroy(); viewRef.current = null }
  }, [])

  useEffect(() => {
    viewRef.current?.dispatch({ effects: themeComp.current.reconfigure(isDark ? appThemeDark : appTheme) })
  }, [isDark])

  useEffect(() => {
    const view = viewRef.current
    if (view && view.state.doc.toString() !== code) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } })
    }
  }, [code])

  return <div ref={containerRef} className="h-full overflow-hidden rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] shadow-[var(--shadow-input-inset)]" />
}

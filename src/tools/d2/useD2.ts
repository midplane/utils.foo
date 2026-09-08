import { useEffect, useRef, useState } from 'react'
import { D2 } from '@d2lang/d2'
import type { CompileOptions } from '@d2lang/d2'
import { formatD2Error, sanitizeSvg } from './render'

export type Layout = NonNullable<CompileOptions['layout']>
export type RenderFormat = 'svg' | 'standard' | 'extended'

interface Result {
  key: string
  output: string
  error: string
}

export function useD2(code: string, layout: Layout, themeID: number, sketch: boolean, revision: number, format: RenderFormat = 'svg') {
  const engineRef = useRef<D2 | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const key = JSON.stringify([code, layout, themeID, sketch, revision, format])

  useEffect(() => () => {
    void engineRef.current?.dispose()
    engineRef.current = null
  }, [])

  useEffect(() => {
    if (!code.trim()) return
    let cancelled = false
    let deadline: ReturnType<typeof setTimeout> | undefined
    const timer = setTimeout(async () => {
      const engine = engineRef.current ?? new D2()
      engineRef.current = engine
      try {
        const render = async () => {
          const ascii = format !== 'svg'
          const options: CompileOptions = {
            layout: ascii && layout === 'dagre' ? 'elk' : layout,
            themeID, sketch: !ascii && sketch, pad: 32,
            ascii, asciiMode: ascii ? format : undefined,
          }
          const compiled = await engine.compile(code, options)
          if (cancelled) return ''
          return engine.render(compiled.diagram, {
            ...compiled.renderOptions, noXMLTag: true,
            ascii, asciiMode: options.asciiMode,
          })
        }
        const timeout = new Promise<never>((_resolve, reject) => {
          deadline = setTimeout(() => {
            reject(new Error('Rendering took too long. Try a smaller diagram or another layout, then retry.'))
            if (engineRef.current === engine) engineRef.current = null
            void engine.dispose()
          }, 30_000)
        })
        const output = await Promise.race([render(), timeout])
        if (!cancelled) setResult({ key, output: format === 'svg' ? sanitizeSvg(output) : output, error: '' })
      } catch (error) {
        if (!cancelled) setResult({ key, output: '', error: formatD2Error(error) })
      } finally {
        clearTimeout(deadline)
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [code, layout, themeID, sketch, format, key])

  const current = code.trim() && result?.key === key ? result : null
  return {
    output: current?.output ?? '',
    error: current?.error ?? '',
    pending: Boolean(code.trim()) && !current,
  }
}

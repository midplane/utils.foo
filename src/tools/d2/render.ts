import DOMPurify from 'dompurify'

// Keep D2's SVG styles, embedded fonts and Markdown labels. Preview this as an
// image so diagram styles cannot affect the page and links cannot execute.
export function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    ADD_TAGS: ['foreignObject'],
    HTML_INTEGRATION_POINTS: { foreignobject: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  })
}

export function formatD2Error(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  try {
    const diagnostics: unknown = JSON.parse(message)
    if (Array.isArray(diagnostics) && diagnostics.length > 0 && diagnostics.every(
      item => item && typeof item === 'object' && typeof item.errmsg === 'string'
    )) {
      return diagnostics.map(item => item.errmsg).join('\n')
    }
  } catch { /* Worker and initialization errors are plain text. */ }
  return message
}

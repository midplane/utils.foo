import DOMPurify from 'dompurify'

// Keep D2's SVG styles, embedded fonts and Markdown labels. Preview this as an
// image so diagram styles cannot affect the page and links cannot execute.
export function sanitizeSvg(svg: string): string {
  const fragment = DOMPurify.sanitize(svg, {
    ADD_TAGS: ['foreignObject'],
    HTML_INTEGRATION_POINTS: { foreignobject: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    RETURN_DOM_FRAGMENT: true,
  })
  // An SVG file and an SVG image must be well-formed XML. HTML serialization
  // writes "&nbsp;" and unclosed void tags, which XML parsers reject, so use
  // the XML serializer. It writes namespace declarations itself, and HTML
  // parsing keeps "xmlns" on HTML elements as a plain attribute. Remove that
  // attribute to prevent a duplicate.
  for (const element of fragment.querySelectorAll('*')) {
    for (const { name, namespaceURI } of Array.from(element.attributes)) {
      if (namespaceURI === null && (name === 'xmlns' || name.startsWith('xmlns:'))) element.removeAttribute(name)
    }
  }
  const serializer = new XMLSerializer()
  return Array.from(fragment.childNodes, node => serializer.serializeToString(node)).join('')
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

// ─── Lossless JSON formatting ──────────────────────────────────────────────────
//
// JSON.stringify(JSON.parse(text)) changes data: integers above 2^53 lose
// digits, 1e400 becomes null, -0 becomes 0, 1.0 becomes 1, and duplicate keys
// are removed. These functions use JSON.parse only to validate the input. Then
// they change only the whitespace between tokens, so each number, string and
// key stays exactly as the user wrote it.

const WHITESPACE = new Set([' ', '\t', '\n', '\r'])

function reformat(text: string, indent: string): string {
  JSON.parse(text)

  const pretty = indent !== ''
  let out = ''
  let depth = 0
  let i = 0
  const newline = () => '\n' + indent.repeat(depth)

  while (i < text.length) {
    const ch = text[i]!

    if (WHITESPACE.has(ch)) { i++; continue }

    if (ch === '"') {
      let j = i + 1
      while (text[j] !== '"') j += text[j] === '\\' ? 2 : 1
      out += text.slice(i, j + 1)
      i = j + 1
      continue
    }

    if (ch === '{' || ch === '[') {
      let j = i + 1
      while (WHITESPACE.has(text[j]!)) j++
      if (text[j] === (ch === '{' ? '}' : ']')) {
        out += ch + text[j]
        i = j + 1
        continue
      }
      depth++
      out += pretty ? ch + newline() : ch
    } else if (ch === '}' || ch === ']') {
      depth--
      out += pretty ? newline() + ch : ch
    } else if (ch === ',') {
      out += pretty ? ',' + newline() : ','
    } else if (ch === ':') {
      out += pretty ? ': ' : ':'
    } else {
      out += ch
    }
    i++
  }

  return out
}

/** Pretty-print valid JSON with the given indent. Throws when the JSON is not valid. */
export function prettifyJson(text: string, indent = '  '): string {
  return reformat(text, indent)
}

/** Remove all whitespace between tokens of valid JSON. Throws when the JSON is not valid. */
export function minifyJson(text: string): string {
  return reformat(text, '')
}

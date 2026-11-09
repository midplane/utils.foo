// ─── Content-based language heuristic ────────────────────────────────────────

export function detectLanguage(text: string): string {
  const t = text.trimStart()
  if (!t) return 'Plain'

  // JSON
  if ((t.startsWith('{') || t.startsWith('[')) && (() => { try { JSON.parse(t); return true } catch { return false } })()) return 'JSON'

  // HTML / XML
  if (/^<!DOCTYPE\s+html/i.test(t) || /^<html[\s>]/i.test(t)) return 'HTML'
  if (/^<\?xml/i.test(t)) return 'XML'
  if (t.startsWith('<') && /<\/\w+>/.test(t)) return 'HTML'

  // Markdown
  if (/^#{1,6}\s/.test(t) || /^\s*[-*]\s/.test(t) || /^```/.test(t)) return 'Markdown'

  // YAML
  if (/^---\s*\n/.test(t) || /^\w[\w\s]*:\s+\S/.test(t) && !/[{(]/.test(t.slice(0, 60))) return 'YAML'

  // TOML
  if (/^\[[\w.]+\]/.test(t) || /^\w+ = /.test(t)) return 'TOML'

  // Shell. Only `export NAME=` is a shell export; `export const` is an ES module.
  if (/^#!/.test(t) || /\b(echo|source|chmod|grep|awk|sed)\b|\bexport\s+\w+=/.test(t.slice(0, 200))) return 'Shell'

  // Dockerfile
  if (/^FROM\s+\w/im.test(t) && /\b(RUN|CMD|ENTRYPOINT|COPY|ADD|ENV)\b/.test(t)) return 'Dockerfile'

  // SQL
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|WITH)\b/i.test(t)) return 'SQL'

  // Python. `import x from 'y'` is an ES module, so a Python import must end the line.
  if (/\bdef\s+\w+\s*\(/.test(t) || /^import\s+[\w.]+(\s+as\s+\w+)?\s*$/m.test(t) || /^from\s+[\w.]+\s+import\b/m.test(t)) return 'Python'

  // TypeScript (must come before JS — checks for TS-specific syntax)
  if (/:\s*(string|number|boolean|void|any|never|unknown)\b/.test(t) ||
      /\binterface\s+\w/.test(t) || /\btype\s+\w+\s*=/.test(t) || /\benum\s+\w/.test(t)) return 'TypeScript'

  // JSX / TSX — angle brackets mixed with JS
  if (/return\s*\(?\s*<[A-Z]/.test(t) || /import\s+React/.test(t)) return 'JSX'

  // JavaScript
  if (/\b(const|let|var|function|=>|async|await|require|module\.exports)\b/.test(t)) return 'JavaScript'

  // Rust
  if (/\bfn\s+\w+/.test(t) || /\blet\s+mut\b/.test(t) || /\bimpl\s+\w/.test(t)) return 'Rust'

  // Go
  if (/^package\s+\w/m.test(t) || /\bfunc\s+\w/.test(t)) return 'Go'

  // Java / Kotlin
  if (/\bpublic\s+(class|interface|enum)\b/.test(t) || /\bimport\s+java\./.test(t)) return 'Java'
  if (/\bfun\s+\w+\s*\(/.test(t) && /\bval\b|\bvar\b/.test(t)) return 'Kotlin'

  // CSS / SCSS / LESS. This is after the brace languages, because `Name { ... }`
  // also matches a Java class or a Rust impl block.
  if (/[\w#.[\]:]+\s*\{[^}]*\}/.test(t) || /^@(import|media|keyframes|mixin)\b/m.test(t)) return 'CSS'

  return 'Plain'
}

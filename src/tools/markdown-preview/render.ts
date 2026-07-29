import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/core'

// ─── Language registration ────────────────────────────────────────────────────
// Curated subset rather than the full highlight.js bundle — keeps this tool's
// lazy chunk small while covering the languages developers actually paste.

import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import markdown from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'
import swift from 'highlight.js/lib/languages/swift'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

const LANGUAGES = {
  bash, c, cpp, csharp, css, diff, go, ini, java, javascript, json, kotlin,
  markdown, php, python, ruby, rust, shell, sql, swift, typescript, xml, yaml,
} as const

for (const [name, def] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, def)
}

// Common aliases → registered language names
const ALIASES: Record<string, string> = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python', rb: 'ruby', rs: 'rust', kt: 'kotlin', cs: 'csharp',
  'c++': 'cpp', h: 'c', hpp: 'cpp',
  sh: 'bash', zsh: 'bash', console: 'shell',
  html: 'xml', svg: 'xml', vue: 'xml',
  yml: 'yaml', toml: 'ini', md: 'markdown',
  postgres: 'sql', postgresql: 'sql', mysql: 'sql',
}

function resolveLanguage(lang: string | undefined): string | null {
  if (!lang) return null
  // Fenced info strings can carry extra metadata, e.g. ```ts title="x"
  const raw = lang.trim().split(/\s+/)[0]?.toLowerCase()
  if (!raw) return null
  const name = ALIASES[raw] ?? raw
  return hljs.getLanguage(name) ? name : null
}

// ─── marked configuration ─────────────────────────────────────────────────────

marked.setOptions({ gfm: true, breaks: true })

marked.use({
  renderer: {
    code({ text, lang }) {
      const language = resolveLanguage(lang)
      if (language) {
        const { value } = hljs.highlight(text, { language, ignoreIllegals: true })
        return `<pre><code class="hljs language-${language}">${value}</code></pre>`
      }
      // Unknown/absent language — emit escaped plain text. DOMPurify runs over
      // the final document regardless, but escaping here keeps output correct.
      return `<pre><code class="hljs">${escapeHtml(text)}</code></pre>`
    },
  },
})

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Renders Markdown to HTML.
 *
 * `marked` does NOT sanitise — it passes raw HTML in the source straight
 * through — so the result is run through DOMPurify before it reaches
 * `dangerouslySetInnerHTML`. Without this, pasting markdown containing
 * `<img src=x onerror=...>` would execute script in the preview pane.
 */
export function renderMarkdown(source: string): string {
  const raw = marked.parse(source) as string
  return DOMPurify.sanitize(raw, {
    // Task lists render as disabled checkboxes; keep them.
    ADD_ATTR: ['target', 'rel'],
    USE_PROFILES: { html: true },
  })
}

import { EditorView } from '@codemirror/view'
import { syntaxHighlighting } from '@codemirror/language'
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark'
import type { Extension } from '@codemirror/state'

/**
 * Shared CodeMirror theme that uses CSS custom properties from index.css.
 * This allows the editor to automatically adapt to theme changes (e.g., dark mode).
 *
 * Usage:
 *   import { appTheme, appThemeDark } from '../../lib/codemirrorTheme'
 *   // Pass the appropriate one based on useTheme().isDark
 */

// ─── Shared base rules (all colors reference CSS custom properties) ───────────
const baseRules = {
  '&': {
    fontFamily: 'var(--font-mono)',
    height: '100%',
    outline: 'none',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--font-mono)',
    height: '100%',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-cream-dark)',
    borderRight: '1px solid var(--color-border)',
    color: 'var(--color-ink-muted)',
    fontSize: '11px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--color-editor-active-line)',
  },
  // Selection: drawn overlay (.cm-selectionBackground) + native (::selection).
  // IMPORTANT: never set `color` in ::selection — Chrome's inheritance bug
  // propagates parent ::selection color to children, breaking syntax highlighting.
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(234, 88, 12, 0.15) !important',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(234, 88, 12, 0.10) !important',
  },
} as const satisfies Record<string, Record<string, string>>

// ─── App theme — light (general-purpose editor) ───────────────────────────────
export const appTheme: Extension = EditorView.theme(
  {
    ...baseRules,
    '&': { ...baseRules['&'], fontSize: '13px' },
    '.cm-gutter-lint': {
      width: '18px',
      backgroundColor: 'var(--color-cream-dark)',
    },
    '.cm-lint-marker-error': {
      content: '""',
      display: 'block',
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: 'var(--color-error-icon)',
      margin: '0 auto',
    },
  },
  { dark: false }
)

// ─── App theme — dark ─────────────────────────────────────────────────────────
// Structural colors come from CSS variables (auto-adapted by .dark overrides).
// oneDarkHighlightStyle replaces the light defaultHighlightStyle from basicSetup.
export const appThemeDark: Extension = [
  EditorView.theme(
    {
      ...baseRules,
      '&': { ...baseRules['&'], fontSize: '13px' },
      '.cm-gutter-lint': {
        width: '18px',
        backgroundColor: 'var(--color-cream-dark)',
      },
      '.cm-lint-marker-error': {
        content: '""',
        display: 'block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: 'var(--color-error-icon)',
        margin: '0 auto',
      },
    },
    { dark: true }
  ),
  syntaxHighlighting(oneDarkHighlightStyle),
]

// ─── Diff theme — light (MergeView) ──────────────────────────────────────────
export const diffTheme: Extension = EditorView.theme(
  {
    ...baseRules,
    '&': { ...baseRules['&'], fontSize: '12px' },
    '.cm-deletedChunk': {
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    '.cm-deletedChunk .cm-deletedLine, .cm-deletedLine': {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
    },
    '.cm-changedLine': {
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
    },
    '.cm-changedText': {
      backgroundColor: 'rgba(16, 185, 129, 0.25)',
      borderRadius: '2px',
    },
    '.cm-deletedText': {
      backgroundColor: 'rgba(239, 68, 68, 0.35)',
      borderRadius: '2px',
      textDecoration: 'none',
    },
    '.cm-mergeGap': {
      backgroundColor: 'var(--color-cream-dark)',
      borderTop: '1px solid var(--color-border)',
      borderBottom: '1px solid var(--color-border)',
    },
  },
  { dark: false }
)

// ─── Diff theme — dark ────────────────────────────────────────────────────────
export const diffThemeDark: Extension = [
  EditorView.theme(
    {
      ...baseRules,
      '&': { ...baseRules['&'], fontSize: '12px' },
      '.cm-deletedChunk': {
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
      },
      '.cm-deletedChunk .cm-deletedLine, .cm-deletedLine': {
        backgroundColor: 'rgba(239, 68, 68, 0.18)',
      },
      '.cm-changedLine': {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
      },
      '.cm-changedText': {
        backgroundColor: 'rgba(16, 185, 129, 0.30)',
        borderRadius: '2px',
      },
      '.cm-deletedText': {
        backgroundColor: 'rgba(239, 68, 68, 0.40)',
        borderRadius: '2px',
        textDecoration: 'none',
      },
      '.cm-mergeGap': {
        backgroundColor: 'var(--color-cream-dark)',
        borderTop: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      },
    },
    { dark: true }
  ),
  syntaxHighlighting(oneDarkHighlightStyle),
]

import { EditorView } from '@codemirror/view'

/**
 * Shared CodeMirror theme that uses CSS custom properties from index.css.
 * This allows the editor to automatically adapt to theme changes (e.g., dark mode).
 * 
 * Usage:
 *   import { appTheme } from '../../lib/codemirrorTheme'
 *   // ... in EditorState.create extensions array:
 *   extensions: [basicSetup, json(), appTheme, ...]
 */

// ─── Shared base rules ───────────────────────────────────────────────────────
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
    backgroundColor: '#FEF3C7',
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

// ─── App theme (general-purpose editor) ──────────────────────────────────────
export const appTheme = EditorView.theme(
  {
    ...baseRules,
    '&': { ...baseRules['&'], fontSize: '13px' },
    // Lint gutter
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

// ─── Diff theme (MergeView) ─────────────────────────────────────────────────
export const diffTheme = EditorView.theme(
  {
    ...baseRules,
    '&': { ...baseRules['&'], fontSize: '12px' },
    // MergeView diff highlights
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

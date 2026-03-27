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
export const appTheme = EditorView.theme(
  {
    '&': {
      fontSize: '13px',
      fontFamily: 'var(--font-mono)',
      backgroundColor: 'var(--color-cream)',
      color: 'var(--color-ink)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      outline: 'none',
      height: '100%',
    },
    '&.cm-focused': {
      outline: 'none',
      border: '1px solid var(--color-accent)',
      boxShadow: '0 0 0 3px rgba(234, 88, 12, 0.15)',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'var(--font-mono)',
      height: '100%',
    },
    '.cm-content': {
      padding: '12px 4px',
      caretColor: 'var(--color-accent)',
    },
    '.cm-line': {
      padding: '0 8px',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-cream-dark)',
      borderRight: '1px solid var(--color-border)',
      color: 'var(--color-ink-muted)',
      fontSize: '11px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: '#FEF3C7', // amber-100, highlight color
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(234, 88, 12, 0.04)',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(234, 88, 12, 0.15) !important',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(234, 88, 12, 0.2) !important',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--color-accent)',
    },
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
    // Diagnostic underline
    '.cm-lintRange-error': {
      backgroundImage:
        "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 2.5 l2 -1.5 l2 1.5 l2 -1.5' stroke='%23EF4444' fill='none' stroke-width='1.2'/></svg>\")",
      backgroundRepeat: 'repeat-x',
      backgroundPosition: 'bottom',
      paddingBottom: '2px',
    },
    // Tooltip
    '.cm-tooltip': {
      backgroundColor: 'var(--color-ink)',
      color: 'var(--color-cream-dark)',
      border: 'none',
      borderRadius: '6px',
      fontSize: '11px',
      padding: '4px 8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    },
    '.cm-tooltip-lint': {
      backgroundColor: 'var(--color-ink)',
      borderRadius: '6px',
      padding: '4px 8px',
    },
    // JSON syntax colours
    '.tok-propertyName': { color: '#C2410C', fontWeight: '500' }, // keys: deep orange
    '.tok-string': { color: '#15803D' }, // strings: forest green
    '.tok-number': { color: '#1D4ED8' }, // numbers: blue
    '.tok-bool': { color: '#7C3AED' }, // booleans: purple
    '.tok-null': { color: '#6B7280' }, // null: muted
    '.tok-punctuation': { color: 'var(--color-ink-muted)' },
    '.tok-bracket': { color: 'var(--color-ink-muted)' },
  },
  { dark: false }
)

/**
 * Minimal theme for diff viewer that doesn't override MergeView styles
 */
export const diffTheme = EditorView.theme(
  {
    '&': {
      fontSize: '12px',
      fontFamily: 'var(--font-mono)',
      color: 'var(--color-ink)',
      height: '100%',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'var(--font-mono)',
      height: '100%',
    },
    '.cm-content': {
      padding: '12px 4px',
      caretColor: 'var(--color-accent)',
    },
    '.cm-line': {
      padding: '0 8px',
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
    '.cm-activeLine': {
      backgroundColor: 'rgba(234, 88, 12, 0.04)',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(234, 88, 12, 0.15) !important',
    },
    '&.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(234, 88, 12, 0.2) !important',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--color-accent)',
    },
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

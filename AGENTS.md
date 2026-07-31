# AGENTS.md — Developer & Agent Guide

This file documents conventions, commands, and patterns for the `utils.foo.v2` repository.

## Project Overview

A Vite + React + TypeScript SPA providing developer utility tools (JWT decoder, JSON formatter, etc.).
Each tool lives under `src/tools/<tool-name>/` and is lazy-loaded via `React.lazy()` from the registry.

**Stack**: React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router 7, CodeMirror 6, Vitest 4, ESLint 10.

## Commands

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # tsc type-check + Vite production build (outputs to dist/)
npm run preview      # Serve the production build locally
npm run lint         # Run ESLint over src/
npm run lint:fix     # Run ESLint with --fix
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run
```

**Verification**: `npm run lint && npm run build && npm run test:run`.

### Known-failing baseline

Do not assume a clean run means you broke nothing — compare against these known failures:

- **ESLint: 7 errors.** All `react-hooks/refs` ("Cannot access refs during render") in
  `ThemeContext.tsx`, `data-converter`, `json-formatter`, `markdown-preview`, `mermaid` (×2).
- **Vitest: 14 failures** of 226 tests across 10 files, all in `src/__tests__/useFavorites.test.ts`.
  The jsdom environment provides `document` but not `localStorage`, so `localStorage.clear()`
  throws in `beforeEach`.

If your change adds failures beyond these, it regressed something.

## Repository Structure

```
src/
├── __tests__/            # Vitest suites (flat directory, not co-located)
├── components/ui/        # Shared UI components + barrel (index.ts)
├── components/layout/    # Header, Footer, Layout, useContentWidth
├── contexts/             # ThemeContext — useTheme() gives { isDark, toggle }
├── hooks/                # useFavorites
├── lib/utils.ts          # cn() helper (clsx + tailwind-merge)
├── lib/codemirrorTheme.ts # Shared CodeMirror themes
├── lib/site.ts           # Site name/mark constants
├── pages/                # Home.tsx, Components.tsx (component gallery)
├── tools/                # One directory per tool (kebab-case)
│   ├── types.ts          # ToolMeta interface
│   ├── registry.ts       # Central tool registry — lazy imports + metadata
│   └── <tool-name>/      # index.tsx + meta.ts
└── index.css             # CSS variables in @theme block + global rules
```

## Component Library — ALWAYS REUSE

**CRITICAL**: Before writing custom UI, check `src/components/ui/` for existing components.
Import from the barrel file:

```tsx
import { Button, Alert, ToolHeader, ResultBox, SegmentedControl } from '../../components/ui'
```

### Available Components

| Component | Purpose |
|-----------|---------|
| `ToolHeader` | Icon + title + optional accented suffix for tool pages |
| `FlowDivider` | Horizontal divider with icon, supports `hasOutput` success state |
| `Divider` | Plain horizontal rule |
| `SectionLabel` | Standardized label styling (10px uppercase) |
| `SearchInput` | Search box with icon and clear button |
| `EmptyState` | "No results" message with `query`, `message`, `size` props |
| `ResultBox` | Output container with label, empty state, optional `copyText` |
| `InfoCard` | Icon + title + description card |
| `ExpandableCard` | Card that expands to fill the viewport (see below) |
| `Alert` | Status messages: `variant="info\|success\|warning\|error"`, `size="sm\|default"` |
| `SegmentedControl` | Toggle groups: `variant="pill\|bordered"` |
| `Button`, `Input`, `Textarea`, `Select` | Form primitives |
| `Checkbox`, `Radio`, `Toggle` | Form controls |
| `Card`, `Badge`, `Tabs`, `Modal`, `Tooltip` | Layout & feedback |
| `CopyButton`, `Spinner`, `Skeleton`, `Kbd` | Utilities |
| `DataInput` | CSV/TSV entry: paste, file upload, drag-drop, sample loading, collapses once parsed |

`src/pages/Components.tsx` renders a live gallery of these — check it before building anything new.

### ExpandableCard Pattern

For tools that benefit from a fullscreen mode (editors, diff panels, previews):

```tsx
import {
  useExpandable,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandToggleButton,
  ExpandHint,
  EXPANDED_PANE_HEIGHT,
  DEFAULT_PANE_HEIGHT,
} from '../../components/ui'

function MyTool() {
  const { expanded, setExpanded } = useExpandable()

  return (
    <ExpandableCard expanded={expanded} onExpandedChange={setExpanded}>
      <ExpandableCardHeader className="flex items-center justify-between">
        <span>Title</span>
        <ExpandToggleButton />
      </ExpandableCardHeader>
      <ExpandableCardContent>
        <div style={{ height: expanded ? EXPANDED_PANE_HEIGHT : DEFAULT_PANE_HEIGHT }}>Content</div>
        <ExpandHint /> {/* "Press Esc to collapse", only while expanded */}
      </ExpandableCardContent>
    </ExpandableCard>
  )
}
```

**Behaviour:**
- Expands edge-to-edge (`inset-0`), covering the site header
- Escape collapses; background scroll is locked while expanded
- Child components read state via context (no prop drilling)
- **There is no click-outside-to-collapse** — a viewport-filling card has no outside

**Sizing:** use the two exported constants for scrollable panes rather than hand-rolling
heights. `EXPANDED_PANE_HEIGHT` encodes the card's chrome (header + padding + footer row)
for the fullscreen state; five tools previously duplicated the same `calc(100vh - Npx)`
and all of them were wrong after a layout change. `DEFAULT_PANE_HEIGHT` is the collapsed
state and scales with the viewport, so tall monitors do not leave dead space and short
laptops are not forced to scroll. Some tools still carry hardcoded pixel defaults
(`json-formatter`, `data-converter`, `mermaid`) — prefer the constant in new work.

**Stacking-context gotcha:** `<main>` is `relative z-10`, which creates a stacking context.
A descendant's `z-index` is only compared against siblings *inside* that context, so no
value — however large — lets the card paint above the sibling `<header>` (`z-50`).
`ExpandableCard` works around this by setting `data-expanded-card` on `<body>`, which a rule
in `index.css` uses to lift `<main>` while expanded. A React portal would be the textbook
fix, but relocating the subtree remounts children and would destroy live CodeMirror
instances along with the user's input. **Do not "simplify" this into a portal.**

### CSS Variables (use instead of hardcoded colors)

```tsx
// Semantic colors — use these, not Tailwind color classes
className="bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
className="bg-[var(--color-error-bg)] border-[var(--color-error-border)]"
// Also: --color-warning-*, --color-info-*, --color-purple-*
// Each has: -bg, -bg-subtle, -border, -text, -icon variants
```

`--app-header-height` is the sticky header height; anything sticking to the top of the page
scroll must offset by it or it slides underneath.

### Form fields

Fields have their own tokens and **must not** reuse `--color-surface`/`--color-border`:

```tsx
className="bg-[var(--color-input-bg)] border border-[var(--color-input-border)] shadow-[var(--shadow-input-inset)]"
```

Most inputs sit inside a `Card`, and a `--color-surface` field on a `--color-surface` card
left the border as the only affordance — at `--color-border` that was 1.15:1 in light mode
and 1.4:1 in dark, so a text box read as a flat area of nothing. `--color-input-bg` is
recessed relative to the card, `--color-input-border` clears the 3:1 WCAG 1.4.11 floor for
component boundaries, and `--shadow-input-inset` sells the recess in light mode (dark mode
has no usable shadow, so there the fill step and border carry it).

Fields take `focus:border-[var(--color-accent)]` as a secondary cue on top of the global
focus outline. Do not dim placeholders with an opacity suffix — `placeholder-[…]/60` was
about 2.5:1 and failed contrast.

### What the accent colour means

**Accent marks selection and focus, and nothing else.** A selected segment/tab is accent; the
focus outline is accent. It is never a hover colour and never the fill of a primary button —
`Button variant="primary"` is ink and darkens to `--color-ink-light` on hover. Accent
previously meant "brand", "hover", and "selected" in different components, which left users
with no way to learn what orange signified. Ink carries primary emphasis, accent carries state.

### Focus states

There is exactly one focus indicator: the global `*:focus-visible` rule in `index.css`
(2px accent outline, 2px offset). **Do not write `focus:outline-none` with a replacement
ring in a component.** Doing so previously produced three competing indicators, one of which
(`focus:ring-[var(--color-ink)]/5`) was invisible, and several keyed off `focus` rather than
`focus-visible` so they fired on mouse click.

Two legitimate exceptions, both already handled: `Toggle` mirrors the outline onto its visible
track with `peer-focus-visible:` because its real `<input>` is `sr-only`, and `Checkbox`/`Radio`
do the same for their custom-drawn boxes. Inputs may still change `border-color` on focus as a
secondary cue — just not suppress the outline.

The codebase is clean of `focus:outline-none` — `rg "focus:outline-none" src/` should return
nothing. If that grep starts matching, a regression has been introduced.

### Colour on filled elements

`text-white` is only correct on an **accent** fill — accent is orange in both themes, so it
does not invert. On a `--color-ink` fill use `--color-cream`: ink is near-white in dark mode,
and `text-white` there produced an invisible tooltip label and an invisible checkbox tick.

Never reach for raw Tailwind palette classes (`text-red-600`, `bg-emerald-500`,
`border-blue-200`). They do not respond to the dark-mode overrides. The semantic tokens
(`--color-error-*`, `--color-success-*`, `--color-info-*`, `--color-warning-*`) exist for this
and cover bg / bg-subtle / border / text / icon.

### Motion

`index.css` carries a `prefers-reduced-motion: reduce` block that collapses all animation and
transition durations. It deliberately does **not** set `animation: none` — several animations
(`fadeInUp`, `fadeIn`) start from `opacity: 0` and rely on `forwards`, so removing them
outright would leave elements permanently invisible.

### Overlays and scroll locking

`Modal` and `ExpandableCard` share the ref-counted `useScrollLock` hook in
`src/hooks/useScrollLock.ts`. Do not set `document.body.style.overflow` directly: both
components can be on screen simultaneously (a modal opened from inside a fullscreen card),
and whichever unmounted first used to release the lock for both.

`Modal` traps Tab inside the dialog and restores focus to the trigger on close. If you add
another overlay, do the same — without a trap, Tab walks out into the page behind the overlay.

### Tabs vs SegmentedControl

They share a visual language on purpose: `Tabs` imports `SEGMENTED_GROUP_CLASS` and
`segmentedItemClass` from `SegmentedControl` so the two cannot drift apart (they were
previously pixel-identical by accident, via duplicated class strings). They remain separate
components because they mean different things — `Tabs` swaps panels and carries
`tablist`/`tab`/`tabpanel` semantics, `SegmentedControl` sets a value and is a group of toggle
buttons. Pick by meaning, not appearance.

`SegmentedControl` has two variants and deliberately no more: `pill` for 2-4 short options
inline in a toolbar, `bordered` for many options or long labels that need to wrap. The old
`accent` and `ink` variants were removed because they differed from `bordered` only by a
border and a fill colour. For **icon-only** items pass `label` (a real accessible name);
`title` is supplementary hover text and is not an accessible name on its own.

## Page Width

The content column is capped by `useContentWidth()`, consumed by `Layout`, `Header` and
`Footer` so their edges stay aligned. Tools default to a narrow column and opt into a wider
one via their meta:

```ts
export const meta: ToolMeta = { /* ... */, wide: true }
```

Use `wide` for split-pane or canvas-style tools (side-by-side editors, diagrams, charts).
Do not widen the shared default — it affects every tool at once.

## Reusing the Pivot Table engine

`src/tools/pivot-table/engine/` is not private to that tool. Chart Builder consumes
`createAggregator` (sum/average/median/count/…), `parseDate` and `looksLikeDate` from it
rather than reimplementing them. Before writing aggregation, date parsing, filtering or
number formatting anywhere, check that directory first.

One caveat: the engine's own `toNumber` is deliberately strict (it rejects `"$1,200"` so
that ISO dates are not mistaken for numbers). Chart Builder coerces with its own lenient
parser *before* pushing into an aggregator, so currency and percent columns still sum.

## Adding a New Tool

1. Create `src/tools/<tool-name>/meta.ts` — `export const meta: ToolMeta`
2. Create `src/tools/<tool-name>/index.tsx` — `export default function ToolName()`
3. Register in `src/tools/registry.ts`: add the `lazy()` import, the `meta` import, and an
   entry in the `tools` array (`{ ...meta, component: Tool }`)

**No `App.tsx` change is needed.** Routing is a single dynamic `/:toolId` route that resolves
through `getToolByPath()`; the registry is the only place tools are wired up.

## Code Style

### Imports
- **Relative paths only** — no `@/` aliases
- Import from barrel files: `from '../../components/ui'`
- Third-party before internal imports
- Prefix unused params with `_`

### Naming Conventions
| Entity | Convention | Example |
|--------|------------|---------|
| Component files | `PascalCase.tsx` | `ToolCard.tsx` |
| Tool directories | `kebab-case/` | `jwt-decoder/` |
| Interfaces | `PascalCase` | `ToolMeta`, `ButtonProps` |
| Variables/state | `camelCase` | `searchQuery` |
| Constants | `SCREAMING_SNAKE` | `ALGORITHMS` |
| Event handlers | `handle` prefix | `handleCopy` |

### Formatting
- 2-space indentation, no Prettier
- Use `// ─── Section ───` comment delimiters in longer files
- Single-line guard returns: `if (!value.trim()) { setOutput(''); return }`

### React Patterns
- Functional components only
- `forwardRef` on primitive UI components
- `useCallback` for stable callbacks in effect deps
- `useMemo` for expensive derived values
- `useState(() => initial)` for expensive initial values

### Styling
- **Tailwind CSS 4** — theme tokens in `src/index.css` `@theme` block
- Use `cn()` helper for conditional classes:
  ```tsx
  import { cn } from '../../lib/utils'
  className={cn('base', isActive && 'active', className)}
  ```
- Use CSS variables as arbitrary values: `text-[var(--color-accent)]`
- No inline `style={{}}` unless absolutely necessary (computed heights are the common exception)

### TypeScript
- Strict mode enabled (`noUncheckedIndexedAccess`, etc.)
- No `@ts-ignore` or untyped `any` without comments
- Fix all errors before committing

### Comments
Comments must describe what the code actually does. A stale or aspirational comment is worse
than none — this file and the codebase have both shipped comments that actively misled later
work (a "this is sanitised" note above unsanitised output, a hint advertising an interaction
that did not exist). If you change behaviour, grep for prose describing it.

## Rendering Untrusted HTML

Anything reaching `dangerouslySetInnerHTML` must be sanitized first. `marked` does **not**
sanitize — it passes raw HTML in the source straight through, so markdown containing
`<img src=x onerror=...>` executes. See `src/tools/markdown-preview/render.ts` for the
DOMPurify wrapper; reuse that path rather than calling `marked.parse()` directly into the DOM.

## Error Handling

**Pattern 1: Local state (most common)**
```tsx
const [error, setError] = useState('')
try {
  setResult(process(input)); setError('')
} catch (e) {
  setError(e instanceof Error ? e.message : 'Operation failed')
}
// Display with: <Alert variant="error">{error}</Alert>
```

**Pattern 2: Early-return guards**
```tsx
if (!value.trim()) { setOutput(''); return }
```

## CodeMirror Integration

Themes live in `src/lib/codemirrorTheme.ts`, which exports `appTheme`, `appThemeDark`,
`diffTheme` and `diffThemeDark`. Dark mode is swapped at runtime through a `Compartment`
rather than by rebuilding the editor:

```tsx
const themeComp = useRef(new Compartment())

// On mount
const state = EditorState.create({
  doc: initial,
  extensions: [
    basicSetup,
    markdown(),
    themeComp.current.of(isDarkRef.current ? appThemeDark : appTheme),
    EditorView.lineWrapping,
    EditorView.updateListener.of((u) => { if (u.docChanged) setSource(u.state.doc.toString()) }),
  ],
})

// When isDark changes
view.dispatch({ effects: themeComp.current.reconfigure(isDark ? appThemeDark : appTheme) })
```

Build the view once in a mount effect and mutate it via `dispatch`. Never key the editor on
state that would remount it — that destroys the user's document.

## Dependency Notes

- Use `npm install` only (`.npmrc` has `legacy-peer-deps=true`)
- Tools are lazy-loaded chunks, so a heavy dependency is paid only by the tool that imports
  it. Still check the cost: `npm run build` prints per-chunk gzip sizes.
- `dist/` is gitignored and not committed; deploys build from source.

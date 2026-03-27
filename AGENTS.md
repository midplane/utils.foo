# AGENTS.md — Developer & Agent Guide

This file documents conventions, commands, and patterns for the `utils.foo.v2` repository.

## Project Overview

A Vite + React + TypeScript SPA providing developer utility tools (JWT decoder, JSON formatter, etc.).
Each tool lives under `src/tools/<tool-name>/` and is lazy-loaded via `React.lazy()`.

**Stack**: React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router 7, CodeMirror 6, ESLint.

## Commands

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # tsc type-check + Vite production build (outputs to dist/)
npm run lint         # Run ESLint over src/
npm run lint:fix     # Run ESLint with --fix
```

**No test suite exists.** Verification: `npm run lint && npm run build`.

## Repository Structure

```
src/
├── components/ui/        # Shared UI components (Button, Alert, ToolHeader, etc.)
├── components/layout/    # Header, Footer, Layout
├── lib/utils.ts          # cn() helper (clsx + tailwind-merge)
├── lib/codemirrorTheme.ts # Shared CodeMirror theme
├── pages/                # Home.tsx, Components.tsx
├── tools/                # One directory per tool (kebab-case)
│   ├── types.ts          # ToolMeta interface
│   ├── registry.ts       # Central tool registry
│   └── <tool-name>/      # index.tsx + meta.ts
└── index.css             # CSS variables in @theme block
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
| `SectionLabel` | Standardized label styling (10px uppercase) |
| `SearchInput` | Search box with icon and clear button |
| `EmptyState` | "No results" message with `query`, `message`, `size` props |
| `ResultBox` | Output container with label, empty state, optional `copyText` |
| `InfoCard` | Icon + title + description card |
| `ExpandableCard` | Card that expands to fill viewport with backdrop blur (see below) |
| `Alert` | Status messages: `variant="info|success|warning|error"`, `size="sm|default"` |
| `SegmentedControl` | Toggle groups: `variant="pill|accent|bordered|ink"` |
| `Button`, `Input`, `Textarea`, `Select` | Form primitives |
| `Card`, `Badge`, `Tabs`, `Modal`, `Tooltip` | Layout & feedback |
| `CopyButton`, `Spinner`, `Skeleton`, `Kbd` | Utilities |

### ExpandableCard Pattern

For cards that need fullscreen expand/collapse functionality (code viewers, diff panels, previews):

```tsx
import {
  useExpandable,
  ExpandableCard,
  ExpandableCardHeader,
  ExpandableCardContent,
  ExpandToggleButton,
  ExpandHint,
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
        <div>Content here</div>
        <ExpandHint /> {/* Shows "Press Esc or click outside to collapse" when expanded */}
      </ExpandableCardContent>
    </ExpandableCard>
  )
}
```

**Features:**
- Backdrop blur overlay when expanded
- Escape key to collapse (handled automatically by `useExpandable`)
- Click outside to collapse
- Child components access state via context (no prop drilling)

### CSS Variables (use instead of hardcoded colors)

```tsx
// Semantic colors — use these, not Tailwind color classes
className="bg-[var(--color-success-bg)] text-[var(--color-success-text)]"
className="bg-[var(--color-error-bg)] border-[var(--color-error-border)]"
// Also: --color-warning-*, --color-info-*, --color-purple-*
// Each has: -bg, -bg-subtle, -border, -text, -icon variants
```

## Adding a New Tool

1. Create `src/tools/<tool-name>/meta.ts` — `export const meta: ToolMeta`
2. Create `src/tools/<tool-name>/index.tsx` — `export default function ToolName()`
3. Register in `src/tools/registry.ts`
4. Add `React.lazy()` import and `<Route>` in `src/App.tsx`

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
- No inline `style={{}}` unless absolutely necessary

### TypeScript
- Strict mode enabled (`noUncheckedIndexedAccess`, etc.)
- No `@ts-ignore` or untyped `any` without comments
- Fix all errors before committing

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

Use the shared theme from `src/lib/codemirrorTheme.ts`:
```tsx
import { baseTheme, baseExtensions } from '../../lib/codemirrorTheme'
const view = new EditorView({
  parent: containerRef.current,
  state: EditorState.create({ extensions: [...baseExtensions, lang()] })
})
```

## Dependency Notes

- Use `npm install` only (`.npmrc` has `legacy-peer-deps=true`)
- `dist/` is committed — run build and commit changes when deploying

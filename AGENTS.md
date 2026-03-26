# AGENTS.md — Developer & Agent Guide

This file documents conventions, commands, and patterns for the `utils.foo.v2` repository.
It is intended for both human developers and agentic coding tools.

---

## Project Overview

A Vite + React + TypeScript single-page application providing a collection of developer utility
tools (JWT decoder, JSON formatter, hash generator, etc.). Each tool lives in its own directory
under `src/tools/` and is lazy-loaded via `React.lazy()`.

**Stack**: React 19, TypeScript 6, Vite 8, Tailwind CSS 4, React Router 7, CodeMirror 6, ESLint.

---

## Commands

### Development

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # tsc type-check + Vite production build (outputs to dist/)
npm run preview      # Serve the production build locally
```

### Lint

```bash
npm run lint         # Run ESLint over src/
npm run lint:fix     # Run ESLint with --fix (auto-fix safe issues)
```

After any code change, run `npm run lint` to ensure no ESLint errors, then `npm run build`
(which runs `tsc && vite build`) to confirm the TypeScript build passes.

### Tests

**There is no test suite in this project.** No test runner, no test files, no test script.
Verification is done by running `npm run build` (TypeScript type-check + bundle) and
`npm run lint` (ESLint).

---

## Repository Structure

```
src/
├── main.tsx                  # App entry (mounts root, React.lazy tool imports)
├── App.tsx                   # Root router
├── index.css                 # Global CSS: Tailwind 4 import, @theme vars, animations
├── lib/
│   └── utils.ts              # cn() helper (clsx + tailwind-merge)
├── components/
│   ├── ui/                   # 19 primitive UI components + index.ts barrel
│   ├── layout/               # Header, Footer, Layout + index.ts barrel
│   └── ToolCard.tsx
├── pages/
│   ├── Home.tsx
│   └── Components.tsx
└── tools/
    ├── types.ts              # ToolMeta + Tool interfaces
    ├── registry.ts           # Central array of all registered tools
    └── <tool-name>/          # One directory per tool (kebab-case)
        ├── index.tsx         # Default-exported React component
        └── meta.ts           # Named export: meta: ToolMeta
```

---

## Adding a New Tool

1. Create `src/tools/<tool-name>/meta.ts` with a named `export const meta: ToolMeta`.
2. Create `src/tools/<tool-name>/index.tsx` with a `export default function ToolName()` component.
3. Import and register both in `src/tools/registry.ts`.
4. Add a `React.lazy()` import and `<Route>` in `src/App.tsx`.

---

## TypeScript Configuration

- **Strict mode** is fully enabled: `strict: true`, `noUnusedLocals`, `noUnusedParameters`,
  `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`.
- **Target**: ES2020. **Module**: ESNext with `moduleResolution: bundler`.
- **JSX**: `react-jsx` — do NOT add `import React from 'react'` unless explicitly needed.
- `noEmit: true` — Vite compiles; `tsc` is only for type-checking.
- Fix all TypeScript errors before committing. No `@ts-ignore` or `any` casts without a comment.

---

## Code Style

### Imports

- Use **relative paths** for all internal imports. No path aliases (`@/`, `~/`).
- Import from barrel files where they exist:
  ```tsx
  import { Button, Input, Card } from '../../components/ui'
  import { Layout } from './components/layout'
  ```
- Named imports everywhere **except** tool `index.tsx` files, which use `export default`.
- Third-party imports come before internal imports (no enforced order, but maintain consistency).
- Import only what is used. ESLint enforces `no-unused-vars`; prefix intentionally unused
  parameters with `_` to silence the rule.

### Naming Conventions

| Entity | Convention | Example |
|---|---|---|
| Component/Page files | `PascalCase.tsx` | `ToolCard.tsx`, `Home.tsx` |
| Utility/type files | `camelCase.ts` | `utils.ts`, `registry.ts` |
| Tool directories | `kebab-case/` | `jwt-decoder/`, `epoch-converter/` |
| React components | `PascalCase` function | `function ToolCard()` |
| Interfaces & type aliases | `PascalCase` | `ToolMeta`, `ButtonProps` |
| Props interfaces | `ComponentNameProps` | `ToolCardProps` |
| Context types | `ComponentNameContextType` | `TabsContextType` |
| Variables & state | `camelCase` | `searchQuery`, `isComputing` |
| Module-level constants | `SCREAMING_SNAKE_CASE` | `ALGORITHMS`, `CHARSETS` |
| Event handlers | `handle` prefix | `handleCopy`, `handleModeChange` |
| Tool meta exports | lowercase `meta` | `export const meta: ToolMeta` |
| `forwardRef` components | set `displayName` | `Button.displayName = 'Button'` |

### Formatting

- No Prettier is configured. Match the existing indentation (2 spaces) and style of the file
  you are editing.
- Use `// ─── Section title ───` ASCII-art comment delimiters to separate logical sections
  in longer files.
- Single-line guard returns are acceptable and encouraged:
  ```tsx
  if (!value.trim()) { setOutput(''); return }
  ```

### React Patterns

- **Functional components only** — no class components.
- Use `forwardRef` on all primitive UI components that wrap DOM elements.
- Wrap stable callbacks in `useCallback`, especially when used in `useEffect` dependency arrays.
- Use `useMemo` for expensive derived values.
- Use `React.lazy()` + `<Suspense>` for all tool components (already wired in `App.tsx`).
- Use `useState` initializer functions for expensive initial values: `useState(() => Date.now())`.
- Use `createContext` + `useContext` for scoped compound-component state (e.g., Tabs).

### Styling

- **Tailwind CSS 4** via `@tailwindcss/vite`. No `tailwind.config.js`; theme tokens are defined
  in `src/index.css` inside the `@theme {}` block.
- Use the `cn()` helper from `src/lib/utils.ts` for conditional class merging:
  ```tsx
  import { cn } from '../../lib/utils'
  className={cn('base-class', isActive && 'active-class', className)}
  ```
- Reference CSS custom properties as Tailwind arbitrary values:
  ```tsx
  className="text-[var(--color-accent)] bg-[var(--color-surface)]"
  ```
- Do **not** write inline `style={{}}` objects unless a value cannot be expressed in Tailwind.

### Async / Promises

- Use `async/await` exclusively. Do not use `.then()/.catch()` promise chains.

---

## Error Handling

Three established patterns — pick the one matching the context:

**1. Local state error string (most common in tool components)**
```tsx
const [error, setError] = useState('')

try {
  const result = process(input)
  setResult(result)
  setError('')
} catch (e) {
  setError(e instanceof Error ? e.message : 'Operation failed')
}
```
Display the error inline as a styled red banner. Always use `e instanceof Error` before `.message`.

**2. Return an error field from pure functions**
```tsx
function convert(input: string): { output: string; error?: string } {
  try { return { output: transform(input) } }
  catch (e) { return { output: '', error: (e as Error).message } }
}
```

**3. Early-return guards for invalid input**
```tsx
if (!value.trim()) { setOutput(''); return }
if (isNaN(num)) { setDateString('Invalid timestamp'); return }
```

No global error boundaries, toast notifications, or external error logging exist.
Keep errors local and inline.

---

## ESLint Configuration

Flat config (`eslint.config.js`) using:
- `@eslint/js` recommended
- `typescript-eslint` recommended
- `eslint-plugin-react-hooks` recommended
- Custom: `@typescript-eslint/no-unused-vars: ['error', { argsIgnorePattern: '^_' }]`
- Ignores: `dist/**`, `node_modules/**`

Run `npm run lint` before every commit. Do not disable ESLint rules inline without justification.

---

## CodeMirror Integration

When building tools that need a code editor, follow the imperative pattern used in existing tools:

```tsx
const editorRef = useRef<EditorView | null>(null)
const containerRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  if (!containerRef.current) return
  const view = new EditorView({ parent: containerRef.current, ... })
  editorRef.current = view
  return () => view.destroy()
}, [])

// Update content programmatically:
editorRef.current?.dispatch({ changes: { from: 0, to: doc.length, insert: newValue } })
```

---

## Dependency Notes

- `legacy-peer-deps=true` is set in `.npmrc` — always use `npm install`, not `yarn` or `pnpm`.
- The `dist/` directory is committed to the repository (Netlify/Cloudflare deployment).
- After `npm run build`, stage and commit `dist/` changes if the build is intentional.

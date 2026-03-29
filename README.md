# utils.foo

A collection of developer utility tools built as a fast, client-side SPA. Everything runs in the browser — no server, no data sent anywhere.

## Stack

- **React 19** + **TypeScript 6**
- **Vite 8** for bundling
- **Tailwind CSS 4** for styling
- **React Router 7** for routing
- **CodeMirror 6** for code editors

## Getting Started

```bash
npm install
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Type-check and build to dist/
npm run lint     # Lint source files
```

## Adding a Tool

1. Create `src/tools/<tool-name>/meta.ts` exporting a `ToolMeta` object
2. Create `src/tools/<tool-name>/index.tsx` exporting the tool component
3. Register it in `src/tools/registry.ts`
4. Add a `React.lazy()` import and route in `src/App.tsx`

See `AGENTS.md` for detailed conventions and component documentation.

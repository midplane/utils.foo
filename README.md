# utils.foo

A collection of developer utility tools built as a fast, client-side SPA. Everything runs in the browser — no server, no data sent anywhere.

## Tools

| Tool | Description |
|------|-------------|
| Epoch Converter | Convert Unix timestamps to/from human-readable dates |
| Base64 | Encode and decode Base64 strings |
| Hash | Generate MD5, SHA-1, SHA-256, SHA-512 hashes |
| URL Encoder | Encode and decode URL components |
| JWT Decoder | Decode and inspect JSON Web Tokens |
| Unicode Converter | Convert characters to/from Unicode code points |
| Cron Parser | Parse and describe cron expressions |
| Chmod Calculator | Calculate Unix file permission modes |
| Color Picker | Pick, convert, and inspect colors (HEX, RGB, HSL) |
| UUID Generator | Generate random UUIDs (v4) |
| Password Generator | Generate secure random passwords |
| HMAC Generator | Generate HMAC signatures (SHA-256, etc.) |
| Certificate Decoder | Decode and inspect X.509 certificates |
| JSON Formatter | Format, validate, and minify JSON |
| Diff Viewer | Side-by-side text diff viewer |
| QR Generator | Generate QR codes from text or URLs |
| Data Converter | Convert between JSON, YAML, TOML, CSV, XML |
| Timezone Planner | Compare times across multiple timezones |
| HTTP Status Codes | Browse and search HTTP status code references |
| Country Codes | Browse ISO 3166 country codes |
| Currency Codes | Browse ISO 4217 currency codes |
| Chart Builder | Build charts from data (line, bar, pie, etc.) |
| DNS Lookup | Look up DNS records for a domain |
| Markdown Preview | Render and preview Markdown |
| Markdown Table | Build and edit Markdown tables |
| Mermaid | Render Mermaid diagrams |
| Logo Generator | Generate simple text-based logos |
| Pivot Table | Pivot and summarize tabular data |
| Formula Visualizer | Visualize and evaluate math formulas |

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

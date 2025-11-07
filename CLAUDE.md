# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Development**: `npm run dev` - Start Vite development server
- **Build**: `npm run build` - Build for production
- **Lint**: `npm run lint` - Run ESLint
- **Preview**: `npm run preview` - Preview production build locally

## Architecture

This is a React SPA built with Vite that provides client-side utility tools with a privacy-first design (no server communication, no data transmission).

### Core Structure
- **Entry Point**: `src/main.jsx` renders the app with React Strict Mode and HelmetProvider
- **Router**: `src/App.jsx` contains all route definitions using React Router v6 with lazy-loaded page components
- **Layout**: `src/components/Layout.jsx` provides consistent header/footer wrapper with banner and navigation
- **Analytics**: Google Analytics integration via `src/analytics.js` (GA4, optional via VITE_GA_MEASUREMENT_ID env var)
- **Error Handling**: `src/components/ErrorBoundary.jsx` catches React errors gracefully

### Directory Organization
- **`src/pages/`**: Individual utility tool components (19 total, lazy-loaded for optimal bundle size)
  - Base64, URL, Hash, JSON formatting utilities
  - Epoch converter, Pivot tables, Text diff
  - QR code generator/decoder
  - JWT decoder, Java thread dump analyzer
  - JavaScript to JSON converter, Anomaly detection
  - Mermaid diagram renderer, D2 diagram renderer
  - FAQ, Privacy pages
- **`src/components/`**: Reusable components (Layout, ErrorBoundary, Monaco editor wrapper, ECharts wrapper, theme toggle)
- **`src/utils/`**: Utility functions and helpers (e.g., URL validation)

### Key Dependencies by Feature
- **Code Editing**: Monaco Editor (`@monaco-editor/react`)
- **Data Visualization**: ECharts (`echarts-for-react`)
- **QR Codes**: qrcode.react and jsqr
- **Cryptography**: crypto-js for hashing utilities
- **CSV/Tables**: PapaParse and react-pivottable
- **Diagrams**:
  - Mermaid 11.12.1 (flowcharts, sequence diagrams, class diagrams, etc.)
  - @terrastruct/d2 (D2 diagram language with WASM-based rendering)
- **Icons**: Lucide React and react-icons
- **File Upload**: react-dropzone (for certain utilities)
- **Styling**: Tailwind CSS 3.4.10 with custom gradient backgrounds
- **SEO**: React Helmet Async for dynamic meta tags

### Build Optimization
Vite configuration uses manual chunk splitting to optimize code splitting:
- Separate chunks: vendor, editor, charts, diagrams, pivot, crypto, icons, utils, analytics
- Diagram libraries (Mermaid + D2) share a chunk since both are diagram-focused features
- All page routes are lazy-loaded for reduced initial bundle size
- Source maps disabled in production builds
- Chunk size warning threshold: 1000KB
- Note: @terrastruct/d2 includes WASM binary (~1-2MB), loaded only when navigating to /d2

### Adding New Utility Tools
To add a new utility:
1. Create component in `src/pages/ComponentName.jsx`
2. Add route in `src/App.jsx` using lazy loading: `const NewPage = lazy(() => import('./pages/NewPage.jsx'))`
3. Update the Routes configuration with the new path
4. Consider which chunk it belongs to (may need to update vite.config.js if it uses new dependencies)

### Development Notes
- All processing happens client-side - no server or backend required
- Uses React Router v6 with lazy-loaded routes for performance
- Tailwind CSS with PostCSS autoprefixer
- Configuration via environment variables (`.env.example` provided)
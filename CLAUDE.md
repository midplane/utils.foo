# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Development**: `npm run dev` - Start Vite development server
- **Build**: `npm run build` - Build for production
- **Lint**: `npm run lint` - Run ESLint
- **Preview**: `npm run preview` - Preview production build locally

## Architecture

This is a React SPA built with Vite that provides various client-side utility tools. The application follows these key patterns:

### Core Structure
- **Entry Point**: `src/main.jsx` renders the app with React Strict Mode and Helmet provider
- **Router**: `src/App.jsx` contains all route definitions using React Router
- **Layout**: `src/components/Layout.jsx` provides consistent header/footer wrapper
- **Analytics**: Google Analytics integration via `src/analytics.js`

### Utility Pages
Each utility tool is implemented as a separate page component in `src/pages/`:
- Base64 encoding/decoding
- URL encoding/decoding  
- Hash generation
- JSON formatting
- Epoch conversion
- Pivot tables
- Text diffing
- QR code generation/decoding
- JWT decoding
- Java thread dump analysis
- JavaScript to JSON conversion
- Anomaly detection

### Key Dependencies
- **Monaco Editor**: Code editing functionality (`@monaco-editor/react`)
- **ECharts**: Data visualization (`echarts-for-react`)
- **Tailwind CSS**: Styling framework
- **Lucide React**: Icon library
- **React Helmet**: SEO management

### Development Notes
- All processing happens client-side - no server communication
- Application uses React Router for navigation
- Styling uses Tailwind CSS with custom gradient backgrounds  
- SEO handled through React Helmet Async
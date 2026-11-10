# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
A broad technical audience: working developers, plus data, ops, PM and design-adjacent people who need an occasional utility. They arrive mid-task with a small chore (decode a token, convert a format, build a chart or schedule), want the answer fast, then leave.

## Product Purpose
utils.foo is a collection of 33 utility tools (JWT decoder, JSON formatter, hash, cron parser, diff viewer, Mermaid and D2 diagrams, chart builder, pivot table, Gantt chart, timezone planner, logo generator, and more) delivered as a fast client-side SPA. Success is a user pasting input, getting the result, and leaving quickly, with a reason to return for the next chore.

## Positioning
Three claims, in this order:
1. **Privacy: it runs in the browser.** No server processes user input, and user data is never sent anywhere. A utility site that uploads input to a backend cannot truthfully say this. Known exception: the DNS lookup tool calls Cloudflare's DNS-over-HTTPS resolver (`cloudflare-dns.com`), and the copy must stay honest about that. Sample datasets in Pivot Table and Chart Builder load from the same origin.
2. **Speed and no friction:** the fewest steps from arrival to result.
3. **One coherent toolbox:** one consistent product instead of 30 different sites.

## Operating Context
Static single-page app on Cloudflare Pages (SPA catch-all redirect only). Tools are lazy-loaded from a central registry (`src/tools/registry.ts`); each tool lives in `src/tools/<tool-name>/` with `meta.ts` and `index.tsx`. Some tools (D2, Chart Builder) create compact shareable links that carry state in the URL. Theme choice and favorite tools persist in `localStorage` only. The same build is also served under a second hostname, utils.bar.

## Capabilities and Constraints
- Stack: React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, CodeMirror 6 (already in place; not a stack decision).
- Dual hostname brand: `src/lib/site.ts` sets the site name (utils.foo or utils.bar) and the mark (`u.f` or `u.b`) from the hostname. Every name and mark usage must work for both.
- Light and dark themes are both first-class (ThemeContext, shared CodeMirror themes).
- No backend, ever. A feature that needs a server is out of scope.
- New UI reuses the component library in `src/components/ui/` and the tokens in `src/index.css`; the component gallery at `src/pages/Components.tsx` is the reference.

## Brand Commitments
The name "utils.foo" (and "utils.bar" on its alternate hostname), rendered from the hostname-derived prefix and suffix in `site.ts`.

## Evidence on Hand
A working product with 33 tools and a Vitest suite (`src/__tests__`). No testimonials, usage numbers, customer logos, or press exist; do not fabricate them.

## Product Principles
1. Privacy is the lead claim: keep processing local, and be explicit wherever a tool touches the network.
2. Paste-to-answer speed: the fewest steps from arrival to result; no signup, no interstitials.
3. One coherent toolbox: every tool feels like the same product, built from shared components and tokens.
4. Serve the occasional user: tools must be clear to people who use them rarely, not only to power users.
5. Both themes and both hostnames get equal support.

## Accessibility & Inclusion
The product must meet WCAG 2.2 AA: text and component contrast, full keyboard access, visible focus, and respect for `prefers-reduced-motion`.

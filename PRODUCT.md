# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
A broad technical audience: working developers, plus data, ops, PM and design-adjacent people who need occasional utilities. They arrive mid-task with a small chore (decode a token, convert a format, build a chart or schedule) and want an answer fast, then leave.

## Product Purpose
utils.foo is a collection of 30+ utility tools (JWT decoder, JSON formatter, hash, cron parser, diff viewer, Mermaid and D2 diagrams, chart builder, pivot table, Gantt chart, timezone planner, logo generator, and more) delivered as a fast client-side SPA. Success is a user pasting input, getting the result, and leaving quickly, with a reason to return for the next chore.

## Positioning
Everything runs in the browser: no server, and user data is never sent anywhere. A neighboring utility site that uploads input to a backend could not truthfully say this. Known exception: the DNS lookup tool calls a DNS-over-HTTPS resolver, and the copy must stay honest about that.

## Operating Context
Static single-page app deployed on Cloudflare Pages (SPA catch-all redirect only). Tools are lazy-loaded from a central registry; each tool lives in `src/tools/<tool-name>/` with `meta.ts` and `index.tsx`. Some tools support compact shareable links. Also served under a second hostname, utils.bar.

## Capabilities and Constraints
- Stack: React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, CodeMirror 6 (already in place; not a stack decision).
- Dual brand: `src/lib/site.ts` swaps the site name (utils.foo / utils.bar) by hostname; the wordmark and mark (`u.f` / `u.b` style) must work for both.
- Light and dark themes are both first-class (ThemeContext, shared CodeMirror themes).
- New UI reuses the component library in `src/components/ui/` and the tokens in `src/index.css`; the component gallery at `src/pages/Components.tsx` is the reference.
- No backend. Anything requiring a server is out of scope.

## Brand Commitments
The name "utils.foo" (and "utils.bar" on its alternate hostname), rendered from the hostname-derived prefix/suffix in `site.ts`.

## Evidence on Hand
Working product with 30+ tools and a test suite (`src/__tests__`). No testimonials, usage numbers, or press exist; do not fabricate them.

## Product Principles
1. Privacy is the product claim: keep processing local and be explicit wherever a tool touches the network.
2. Paste-to-answer speed: the fewest steps from arrival to result; no signup, no interstitials.
3. One coherent toolbox: every tool feels like the same product, built from shared components and tokens.
4. Serve the occasional user: tools must be legible to people who use them rarely, not only to power users.
5. Both themes and both hostnames are equally supported.

# Woodshed: project conventions

Music theory practice PWA (Android phone + iPad). [PRD.md](PRD.md) is the spec and the source of truth for scope, milestones and decisions.

## Working rules

- Work one milestone at a time (PRD section 9). Stop at the end of a milestone and show how to try it on the phone.
- If the PRD is unclear, or a better approach conflicts with it, ask before building. When a decision changes, update PRD.md in the same change (section 13 "Decided", and section 8 for technical choices).
- Nothing in the app may be specific to one person (PRD goal 6): no hard-coded names, keys or tunings outside defaults.

## Architecture

- `src/theory/`: **the theory engine. Pure TypeScript, no UI.** No imports from outside `src/theory/`. No DOM, Preact, audio, storage or `window`. Its tsconfig (`tsconfig.theory.json`) has no DOM lib, and `tests/architecture.test.ts` fails on any outside import. Views, audio and mic code import from the engine, never the reverse.
- `src/state/`: app state as `@preact/signals`. UI preferences that must apply before first paint (theme, instrument, view) live in `localStorage` via `state/storage.ts`. Progress data goes in IndexedDB (later milestone).
- `src/ui/`: Preact components (`.tsx`) and `app.css`. Instrument views are SVG (PRD section 8).
- Routing is hash-based (`#/practice`, `#/explore`, `#/progress`, `#/settings`) so GitHub Pages needs no server rewrites.

## Code style

- TypeScript strict, including `noUncheckedIndexedAccess`. No `any`.
- Use `import type` for type-only imports (`verbatimModuleSyntax`).
- Preact with `class`, not `className`. Small function components; shared state through signals, not prop drilling.
- Music text uses the real symbols: ♯ ♭ 𝄪 𝄫 ♮ (not `#`/`b`) in anything user-facing. The engine may use ASCII internally but must render symbols.
- CSS: design tokens are custom properties on `:root`, with dark values under `[data-theme='dark']` and `prefers-color-scheme`. Touch targets are at least 44px. Phone portrait is the default layout; the tablet/desktop layout is in the `min-width: 900px and landscape` media query.
- Keep comments for the *why*; reference PRD requirement IDs (for example `I-1`, `Q-5`) where code implements one.

## Testing

- Vitest. Engine tests sit next to the code as `src/theory/**/*.test.ts`; cross-cutting tests go in `tests/`.
- Note spelling is the most important thing to test (PRD section 8). Test every key, not samples. The paper deck in the PRD appendix is a known-good fixture.
- Before committing, run `npm test` and `npm run build`. CI runs both.

## Build and deploy

- Vite 6 (it supports Node 20.11; Vite 7+ needs Node 20.19+). Base path defaults to `/woodshed/`; CI sets `BASE_PATH` from the repo name.
- `vite-plugin-pwa` generates the manifest, the Workbox service worker (precaches everything) and all icons from `public/icon.svg` at build time. Don't commit generated PNGs.
- The service worker only exists in production builds: test offline and install with `npm run build && npm run preview`.
- Push to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
- npm 10.2 (bundled with Node 20.11) crashes resolving some peer sets (`reading 'edgesOut'`). If that happens, use `npx npm@10.9.4 install`, or upgrade Node.

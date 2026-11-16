# Woodshed

A music theory practice app for musicians. Drill major and minor scales, key signatures, intervals and chords as flash cards and quizzes. You see every answer on a keyboard, a fretboard or a staff, and you can play your answers on a real instrument through the microphone.

Woodshed is an installable web app (PWA). Add it to the home screen on an Android phone or an iPad and it works offline. Everything stays on your device: there are no accounts and no server.

> **Status:** milestone M0 (project setup). The app shell, theme and offline support are in place; the theory engine and drills come next. See [PRD.md](PRD.md) for the full spec and roadmap.

## Use it

Open the hosted app, then install it:

- **Android (Chrome):** menu ⋮ → **Add to Home screen** (or **Install app**).
- **iPad / iPhone (Safari):** Share → **Add to Home Screen**.

After the first load it runs without a network connection.

## Develop

Requires Node.js 22.12 or newer (Node 24 LTS recommended).

```bash
npm install
npm run dev          # dev server at http://localhost:5173/woodshed/
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run dev:lan` | Dev server reachable from other devices on your Wi-Fi |
| `npm test` | Run the test suite once (Vitest) |
| `npm run e2e` | Browser smoke tests (Playwright) against the last build |
| `npm run test:watch` | Run tests on every change |
| `npm run typecheck` | Type-check all TypeScript projects |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Serve the production build at http://localhost:4173/woodshed/ |
| `npm run preview:lan` | Same, reachable from other devices on your Wi-Fi |

The service worker only runs in the production build, so use `npm run build` then `npm run preview` to test install and offline behaviour.

### Try it on a phone during development

1. Make sure the phone and the computer are on the same Wi-Fi.
2. Run `npm run dev:lan` and note the `Network:` address it prints, for example `http://192.168.1.20:5173/woodshed/`.
3. Open that address on the phone. Windows may ask to allow Node.js through the firewall; allow it on private networks.

Over plain `http://` on the LAN, the app loads but cannot be installed, and the microphone will not work later on. Browsers only allow both on HTTPS. For those, use the GitHub Pages deploy.

## Project layout

```
src/
  theory/      Theory engine: pure TypeScript, no UI, DOM or audio (milestone M1)
  state/       App state (signals): section, instrument, view, theme
  ui/          Preact components and styles
  main.tsx     Entry point: renders the app, registers the service worker
tests/         Cross-cutting tests (for example the theory-engine boundary)
public/        Static files; icon.svg is the source for all generated icons
```

The theory engine is kept separate from the UI. Its TypeScript project compiles without DOM types, and a test fails if anything in `src/theory/` imports from outside it.

Built with [Preact](https://preactjs.com/) and [Preact Signals](https://preactjs.com/guide/v10/signals/), [Vite](https://vite.dev/), [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox) and [Vitest](https://vitest.dev/).

## Deploy

Every push to `main` runs the GitHub Actions workflow in `.github/workflows/deploy.yml`. It installs, tests, builds and publishes `dist/` to GitHub Pages. Pull requests are tested and built but not deployed.

One-time setup on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The site is served from `https://<user>.github.io/<repo>/`. The workflow passes the repository name to the build as `BASE_PATH`, so a renamed repo or fork still works. To build for a site at the domain root, run `BASE_PATH=/ npm run build`.

## License

[MIT](LICENSE)

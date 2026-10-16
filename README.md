# sona-frontend

**[Sona](https://trysona.io)** — the audio engineering calculator for touring and installed engineers, houses of worship and students. _Built for engineers behind the show._

An installable, offline-first PWA. Every calculator is a pure TypeScript function that runs in the
browser; the optional [`sona-backend`](https://github.com/trysona/sona-backend) adds accounts,
synced presets and share links.

|           |                                                                             |
| --------- | --------------------------------------------------------------------------- |
| Framework | React 19, TypeScript, Vite                                                  |
| Styling   | Tailwind CSS v4 with design tokens in `src/index.css`                       |
| State     | Zustand (`src/store`)                                                       |
| Forms     | React Hook Form + Zod (auth)                                                |
| HTTP      | Axios with token refresh (`src/api`)                                        |
| Offline   | Workbox service worker (`src/sw.ts`) via `vite-plugin-pwa` (injectManifest) |
| Tests     | Vitest + React Testing Library — ≥ 80 % coverage gate on `src/calculators`  |

## Getting started

Requires Node 20.19+ (CI uses Node 22).

```bash
npm install
npm run dev          # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:8080`, so start the API first if you want
accounts, presets sync or sharing:

```bash
cd ../sona-backend && docker compose up    # API on :8080
```

Calculators, history, local presets, themes and units all work without the backend.

### Scripts

| Command                           |                                                           |
| --------------------------------- | --------------------------------------------------------- |
| `npm run dev`                     | Dev server with HMR                                       |
| `npm run build`                   | Typecheck and build to `dist/` (includes `sw.js`)         |
| `npm run preview`                 | Serve the production build (service worker active)        |
| `npm test` / `npm run test:run`   | Vitest (watch / once)                                     |
| `npm run test:coverage`           | Tests with coverage; fails under 80 % on calculator logic |
| `npm run lint` · `npm run format` | ESLint · Prettier                                         |

## Project layout

```
src/
  calculators/   pure functions + unit tests (no React, no I/O)
  components/
    calculator/  CalcCard, inputs, outputs, and cards/ — one component per calculator
    layout/      Sidebar, Topbar, MobileNav, theme and unit toggles, offline banner
    ui/          buttons, drawer, toasts, icons
  tabs/          the 10 tab pages and their registry
  features/      history, presets, account/auth, share links
  hooks/         routing, online status, temperature auto-fetch, calculator inputs
  store/         Zustand stores (settings, inputs, history, presets, auth)
  api/           Axios client and typed endpoint wrappers
  sw.ts          service worker
```

### How calculators fit together

- Each function in `src/calculators` takes SI inputs and returns `CalcResult<T>` — either
  `{ ok: true, value, warnings }` or `{ ok: false, error }`. Invalid input never produces
  `NaN`/`Infinity`; formatters in `format.ts` render any non-finite value as `—`.
- Card inputs are stored **in SI** in `useInputsStore` (persisted to `localStorage` as
  `sona_inputs`). Fields convert to and from the display unit, so the global metric/imperial
  toggle (`sona_units`) updates every visible input and output at once.
- Temperature is shared across all calculators. On first load each session, if online and
  geolocation is allowed, it is pre-filled from Open-Meteo (skipped once you type one yourself).
- Precision: distances/wavelengths 3 dp, dB 2 dp, Hz whole numbers.

### Persistence keys

| Key                | Storage | Contents                          |
| ------------------ | ------- | --------------------------------- |
| `sona_theme`       | local   | `dark` · `dim` · `bright`         |
| `sona_units`       | local   | `metric` · `imperial`             |
| `sona_temperature` | local   | shared temperature                |
| `sona_inputs`      | local   | calculator inputs                 |
| `sona_presets`     | local   | presets saved while logged out    |
| `sona_auth`        | local   | access/refresh tokens and profile |
| `sona_history`     | session | last 50 results                   |

## Environment variables

Vite inlines these at **build time**.

| Variable            | Default             |                                               |
| ------------------- | ------------------- | --------------------------------------------- |
| `VITE_API_BASE_URL` | empty (same origin) | `https://api.trysona.io` in `.env.production` |
| `VITE_APP_VERSION`  | `1.0.0`             |                                               |

## Docker

```bash
docker compose up --build       # http://localhost
```

nginx serves the build and proxies `/api` to `API_UPSTREAM` (default
`http://host.docker.internal:8080`, i.e. `sona-backend` running on the host). The compose file
maps `host.docker.internal` for Linux.

## Deployment (Vercel)

`main` deploys automatically through `.github/workflows/deploy.yml`.

1. Create a Vercel project from this repo (framework: Vite). `vercel.json` adds SPA rewrites and
   cache headers for the service worker.
2. Add GitHub secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (and optionally `CODECOV_TOKEN`).
3. Point `trysona.io` at the project. The API must allow that origin (`CORS_ORIGINS` on the backend).

## Installing the app

- **Android Chrome:** menu → _Install app_.
- **iOS Safari:** Share → _Add to Home Screen_.

After the first visit the whole app (all ten tabs) works with no connection.

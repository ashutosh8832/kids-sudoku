# Kids Sudoku

A progress-based 9×9 Sudoku for young players, built as a Progressive Web App with Next.js.

- Starts easy (Level 1 ≈ 47 givens) and removes 2 given numbers per level for a gentle difficulty ramp (Level 10≈ and up: 26 givens).
- Wrong entries flash the cell red and are removed automatically — no mistakes limit, infinite retries.
- Touch-first UI sized for iPad, with smart highlighting of the selected cell, matching numbers, and completed rows/columns/boxes.
- Installable PWA: `display: standalone`, generated app icons, and an offline cache via a service worker.
- Progress, current puzzle, level, and timer persist in `localStorage` — no accounts or backend required.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run start      # run the production build
npm run lint
```

## Deploy to Vercel

1. Push this repository to GitHub (or import it directly at https://vercel.com/new).
2. Vercel auto-detects Next.js — the default build command (`next build`) works as-is.
3. Open the deployed URL on the iPad (Safari), then tap **Share → Add to Home Screen** to install it as a full-screen app.

## Project layout

- `lib/sudoku.ts` — puzzle generation (MRV backtracking), validity checks, completion tracking, level curve.
- `app/sudoku-game.tsx` — the game UI: board, number pad, hints, notes, timer, win overlay.
- `app/manifest.ts` — PWA web app manifest (`display: standalone`).
- `app/icon.tsx`, `app/apple-icon.tsx` — generated PNG app icons (favicon + iPad home screen).
- `public/sw.js` — offline cache service worker.
- `next.config.ts` — headers so the service worker is never cached.
# Deployment Guide (Phase 25)

The website is fully static: no backend, no build step. It runs on any static host.

## What the live site needs

| File | Purpose |
|---|---|
| `index.html` | the page |
| `style.css` | styles |
| `script.js` | app logic (contains bot token + chat ID) |
| `data.json` | media library: 11 categories × 500 items (5,500 entries) |
| `assets/` | the photos — one sub-folder per category (`assets/arabic-films/001.jpg` …) plus `assets/legacy/` for old flat exports |
| `logo.svg` | DRIVE DEALS logo (header + tab icon) |

Everything else in this folder (`node_modules/`, `tools/`, `source.xlsx`, `source-legacy.xlsx`, `data-legacy.json`, `server.log`, `*.md`) is development-only — do not upload it.

> To update the library (real data): fill in `source.xlsx` (one sheet per category), put the photos in the matching `assets/<category>/` folder, then run `npm run excel-to-json`. See `ADD_REAL_DATA.md`.

## Before deploying

1. Open `script.js` and confirm the real bot token + chat ID are set at the top (TELEGRAM section).
2. Run `npm run test:deploy` — checks relative paths, static loading of data.json/images, HTTPS safety, and Telegram API reachability.

## Option A — Netlify (easiest)

1. Go to https://app.netlify.com/drop
2. Drag a folder that contains only the 6 items above (or connect this repo via git).
3. You get an instant HTTPS link like `https://your-site.netlify.app` — share it as-is.

## Option B — GitHub Pages

1. Push this folder to a GitHub repository (`node_modules/` is already git-ignored).
2. Settings → Pages → "Deploy from a branch" → choose the branch → Save.
3. Your site is live at `https://<you>.github.io/<repo>/`.
   It works in that sub-folder because every path in the site is relative (verified by `npm run test:deploy`). The empty `.nojekyll` file keeps GitHub from running Jekyll on the repo.

Both hosts provide HTTPS automatically. The site has zero insecure (`http://`) references, so nothing can be blocked as mixed content on HTTPS.

## After deploying — manual checks (Phase 25)

- [ ] Open the link on a real phone and place a test order end-to-end.
- [ ] Test again from a different internet connection (e.g., mobile data instead of Wi-Fi).
- [ ] Confirm the TXT file arrives in your Telegram chat with correct name/phone/value.

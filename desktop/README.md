# Plasgain Sales Workspace — desktop app

An installed program with its own icon and window, in the shape Teams and Slack
use: the window is native, but the workspace itself still runs on the server, so
every rep shares one database and one version with nothing to update by hand.

The shell holds no business logic and no credentials. The Firebase
service-account key that reaches the database stays on the server rather than
being copied onto every laptop.

## Getting the installer

The Windows installer can only be produced on Windows, so it is built in CI:

1. GitHub → **Actions** → **Desktop installers** → **Run workflow**
2. Choose `windows` (or `both` for a macOS `.dmg` too)
3. When it finishes, download **plasgain-desktop-windows** from the run's
   artifacts and run the `.exe` inside

Pushing a tag that starts with `desktop-v` builds both automatically.

> The installer is unsigned, so Windows SmartScreen will warn on first run
> ("More info" → "Run anyway"). Signing it needs a code-signing certificate;
> add it as the `CSC_LINK` and `CSC_KEY_PASSWORD` secrets and electron-builder
> will use it.

## Running it without building an installer

```bash
cd desktop
npm install
npm start
```

## Pointing it somewhere else

It opens `https://plasgain-customer-service.vercel.app` by default. To aim it at
a preview deployment or a laptop running `npm run dev`, either:

- set `PLASGAIN_APP_URL`, e.g. `PLASGAIN_APP_URL=http://localhost:3000 npm start`, or
- write `{"appUrl": "http://localhost:3000"}` into `config.json` in the app's
  user-data folder — **Help → Show settings folder** opens it

No rebuild is needed either way.

## What it adds over a browser tab

- Its own icon in the Start menu and taskbar, and its own window
- Remembers where the window was, and reopens there
- Opens outside links (a council website, a `mailto:`) in the real browser
- A plain "can't reach the workspace" page with a retry button when the server
  is unreachable, instead of Chromium's error screen
- Launching it twice focuses the open window rather than opening a second copy,
  so two windows can't disagree about the same records

## The icon

`build/icon.png` is generated from the same mark as the browser tab by
`node build/make-icon.mjs`. It is a placeholder — drop the real Plasgain logo in
as `build/icon.png` (square, 512×512 or larger) and the script never needs to
run again.

## Files

| File | What it does |
| --- | --- |
| `main.js` | Creates the window, handles navigation, remembers window size |
| `preload.js` | Exposes one function: the offline page's retry button |
| `offline.html` | Shown when the workspace can't be reached |
| `build/make-icon.mjs` | Draws the placeholder icon |

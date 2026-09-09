/**
 * Service worker for the installed app.
 *
 * It caches nothing. That is the point.
 *
 * A CRM shows money: a quote value, a follow-up date, whether a customer has
 * been called. Serving any of that from a cache risks a rep reading a figure
 * that is no longer true, and a cached app shell is how a shipped fix quietly
 * fails to reach the phone that needs it. The workspace already refuses to
 * invent data it cannot ground; a stale cache is the same failure wearing a
 * different hat.
 *
 * So this exists only to make the app installable to a home screen. Chrome
 * requires a service worker that answers a navigation while offline before it
 * will offer to install; that is exactly what this does and no more. Every
 * other request — scripts, styles, and above all /api — passes straight
 * through to the network untouched.
 */

self.addEventListener("install", () => {
  // No pre-caching, so there is nothing to wait for.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Take over any tab still held by an older worker, and clear caches left by
  // one, so an earlier caching version cannot keep serving stale pages.
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

const OFFLINE_PAGE = `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Plasgain Sales Workspace</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         padding:32px; background:#080a09; color:#f4f6f5;
         font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif }
  .card { max-width:380px }
  h1 { font-size:19px; margin:0 0 10px }
  p { margin:0 0 14px; color:#9aa3a0 }
  button { font:inherit; font-weight:600; color:#fff; background:#00a651; border:0;
           border-radius:6px; padding:10px 18px; cursor:pointer }
</style>
</head>
<body>
  <div class="card">
    <h1>You're offline</h1>
    <p>The workspace needs a connection — your accounts and quotes live on the
       server, so there is nothing stored on this phone to show you.</p>
    <p>Nothing has been lost. Reconnect and it will all be here.</p>
    <button onclick="location.reload()">Try again</button>
  </div>
</body>
</html>`;

self.addEventListener("fetch", (event) => {
  // Only page loads are handled. Everything else is left entirely alone.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(OFFLINE_PAGE, {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        })
    )
  );
});

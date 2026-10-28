/*
 * Service worker da Endju: para ligações lentas ou que caem.
 * - Ficheiros com hash do Next (/_next/static), fontes e imagens otimizadas: cache primeiro (não mudam).
 * - Páginas públicas: rede primeiro (preços e estados mudam); sem rede ou passados 6 s, a cópia guardada.
 * - Conta, painel, API, checkout e pedidos de navegação interna (RSC): sempre rede, nunca guardados.
 * Mudar VERSION apaga as caches antigas.
 */
const VERSION = "endju-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const PRIVATE = /^\/(admin|conta|api|checkout|carrinho|convite)(\/|$)/;

const OFFLINE_HTML = `<!doctype html><html lang="pt-AO"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem ligação · Endju</title><body style="font-family:system-ui,sans-serif;background:#f3f0e8;color:#121116;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center"><main><h1 style="font-size:1.5rem">Estás sem ligação</h1><p>Esta página ainda não foi guardada no telemóvel. Tenta de novo quando a rede voltar.</p><button onclick="location.reload()" style="padding:12px 20px;border-radius:999px;border:0;background:#121116;color:#f3f0e8;font-size:1rem">Tentar de novo</button></main></body></html>`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC)).put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("lento")), 6000)),
    ]);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || PRIVATE.test(url.pathname)) return;
  if (request.headers.has("RSC") || url.searchParams.has("_rsc")) return;
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/fonts/")
  ) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  }
});

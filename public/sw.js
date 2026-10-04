/*
 * Service Worker do Manual do Sobrevivente (TacticalGIS).
 *
 * Estratégias:
 *  - Navegações (documentos): rede primeiro; sem rede, usa o shell "/" em cache
 *    ou a página estática /offline.html quando o shell não estiver disponível.
 *  - /assets/* (arquivos com hash no nome): cache-first (imutáveis), com limite.
 *  - Tiles de mapa e fontes: cache-first com limite de entradas.
 *
 * Bump de versão: altere VERSAO ao mudar a lógica deste arquivo — os caches
 * antigos são apagados na ativação.
 */
const VERSAO = "v8";
const CACHE_SHELL = `shell-${VERSAO}`;
const CACHE_ASSETS = `assets-${VERSAO}`;
const CACHE_RUNTIME = `runtime-${VERSAO}`;
const OFFLINE_URL = "/offline.html";
const SHELL_URL = "/";
const MAX_ASSETS = 120;
const MAX_RUNTIME = 400;

const HOSTS_DE_TILES = [
  "tile.opentopomap.org",
  "openstreetmap.org",
  "server.arcgisonline.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_SHELL);
      await cache.addAll([OFFLINE_URL]);
      // Shell: busca o HTML inicial (melhor esforço — falha não bloqueia a instalação).
      try {
        const res = await fetch(SHELL_URL, { cache: "no-store" });
        if (res && res.ok) await cache.put(SHELL_URL, res.clone());
      } catch {
        /* primeiro acesso offline: o shell entra no cache no primeiro carregamento */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const manter = new Set([CACHE_SHELL, CACHE_ASSETS, CACHE_RUNTIME]);
      const nomes = await caches.keys();
      await Promise.all(nomes.map((n) => (manter.has(n) ? null : caches.delete(n))));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

function ehTile(url) {
  return HOSTS_DE_TILES.some((h) => url.hostname === h || url.hostname.endsWith(`.${h}`));
}

/** Remove as entradas mais antigas de um cache, mantendo `limite`. */
async function limitarCache(nome, limite) {
  const cache = await caches.open(nome);
  const chaves = await cache.keys();
  const excesso = chaves.length - limite;
  for (let i = 0; i < excesso; i++) await cache.delete(chaves[i]);
}

async function tratarNavegacao(request) {
  try {
    const res = await fetch(request);
    const cache = await caches.open(CACHE_SHELL);
    if (res && res.ok) {
      // Guarda a última versão do shell para abertura offline do app.
      if (new URL(request.url).pathname === "/") cache.put(SHELL_URL, res.clone());
    }
    return res;
  } catch {
    const caminho = new URL(request.url).pathname;
    const cache = await caches.open(CACHE_SHELL);
    if (caminho === "/") {
      const shell = await cache.match(SHELL_URL);
      if (shell) return shell;
    }
    const offline = await cache.match(OFFLINE_URL);
    return (
      offline ||
      new Response("<h1>Sem conexão</h1>", {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    );
  }
}

async function cacheFirst(request, nomeCache, limite) {
  const cache = await caches.open(nomeCache);
  const emCache = await cache.match(request, { ignoreVary: true });
  if (emCache) return emCache;
  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === "opaque")) {
      await cache.put(request, res.clone());
      if (limite) await limitarCache(nomeCache, limite);
    }
    return res;
  } catch {
    return new Response("", { status: 504, statusText: "Sem conexão" });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Navegações: rede primeiro, fallback offline.
  if (request.mode === "navigate") {
    event.respondWith(tratarNavegacao(request));
    return;
  }

  // Same-origin com hash: cache-first com limite.
  if (url.origin === self.location.origin && url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, CACHE_ASSETS, MAX_ASSETS));
    return;
  }

  // Tiles de mapa: cache-first com limite (complementa o armazenamento offline do app).
  if (ehTile(url)) {
    event.respondWith(cacheFirst(request, CACHE_RUNTIME, MAX_RUNTIME));
    return;
  }

  // Fontes do Google: cache-first.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(request, CACHE_RUNTIME, 60));
    return;
  }

  // Demais requisições: passa direto (não interferir em Supabase, APIs etc.).
});

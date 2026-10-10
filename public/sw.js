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
const VERSAO = "v37";
const CACHE_SHELL = `shell-${VERSAO}`;
const CACHE_ASSETS = `assets-${VERSAO}`;
const CACHE_RUNTIME = `runtime-${VERSAO}`;
const OFFLINE_URL = "/offline.html";
const SHELL_URL = "/";
/** Arquivos da abertura em vídeo — cacheados no shell para tocar offline. */
const ABERTURA_URLS = ["/abertura.mp4", "/abertura.webm", "/abertura-poster.jpg"];
/** Banner do convite — pré-cacheado para o operador divulgar até sem rede. */
const BANNER_CONVITE_URLS = ["/banner-convite.png"];
const MAX_ASSETS = 120;
const MAX_RUNTIME = 400;

const HOSTS_DE_TILES = [
  "tile.opentopomap.org",
  "openstreetmap.org",
  "server.arcgisonline.com",
  // Radar de chuva (RainViewer) — muitos quadros por animação: com cache,
  // o último ciclo fica disponível offline e a rede sofre menos.
  "rainviewer.com",
  // Imagem GeoColor do GOES-Leste (nuvens ao vivo): URL estável "default" —
  // o último quadro visto fica disponível offline.
  "gibs.earthdata.nasa.gov",
];

/**
 * Fila de concorrência dos tiles: os provedores (Esri, OpenTopoMap) recusam
 * RAJADAS de requisições e respondem com um placeholder de erro (imagem
 * cinza "Zoom Level Not Supported" com HTTP 200), que fica pintado no mapa.
 * Um semáforo no Service Worker mantém o fluxo de rede abaixo do limite —
 * acertos de cache não entram na fila (são instantâneos).
 */
const MAX_TILES_SIMULTANEOS = 8;
const filaTiles = { ativos: 0, esperando: [] };

function pegarVagaTile() {
  if (filaTiles.ativos < MAX_TILES_SIMULTANEOS) {
    filaTiles.ativos++;
    return Promise.resolve();
  }
  return new Promise((liberar) => filaTiles.esperando.push(liberar));
}

function devolverVagaTile() {
  filaTiles.ativos--;
  const proximo = filaTiles.esperando.shift();
  if (proximo) proximo();
}

async function cacheFirstComFila(request, nomeCache, limite) {
  const cache = await caches.open(nomeCache);
  const emCache = await cache.match(request, { ignoreVary: true });
  if (emCache) return emCache;
  await pegarVagaTile();
  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === "opaque")) {
      await cache.put(request, res.clone());
      if (limite) await limitarCache(nomeCache, limite);
    }
    return res;
  } catch {
    return new Response("", { status: 504, statusText: "Sem conexão" });
  } finally {
    devolverVagaTile();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_SHELL);
      await cache.addAll([OFFLINE_URL]);
      // Abertura + banner do convite: melhor esforço por arquivo — falha de um
      // não quebra a instalação.
      for (const url of [...ABERTURA_URLS, ...BANNER_CONVITE_URLS]) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res && res.ok) await cache.put(url, res.clone());
        } catch {
          /* offline: entra no cache no primeiro acesso com rede */
        }
      }
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

  // Abertura em vídeo e banner do convite: cache-first no shell (funcionam
  // offline na próxima vez).
  if (
    url.origin === self.location.origin &&
    (ABERTURA_URLS.includes(url.pathname) || BANNER_CONVITE_URLS.includes(url.pathname))
  ) {
    event.respondWith(cacheFirst(request, CACHE_SHELL));
    return;
  }

  // Tiles de mapa: cache-first com limite (complementa o armazenamento
  // offline do app) e fila de concorrência contra placeholders de erro.
  if (ehTile(url)) {
    event.respondWith(cacheFirstComFila(request, CACHE_RUNTIME, MAX_RUNTIME));
    return;
  }

  // Fontes do Google: cache-first.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(cacheFirst(request, CACHE_RUNTIME, 60));
    return;
  }

  // Demais requisições: passa direto (não interferir em Supabase, APIs etc.).
});

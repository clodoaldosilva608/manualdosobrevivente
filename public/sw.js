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
const VERSAO = "v53";
const CACHE_SHELL = `shell-${VERSAO}`;
const CACHE_ASSETS = `assets-${VERSAO}`;
const CACHE_RUNTIME = `runtime-${VERSAO}`;
const OFFLINE_URL = "/offline.html";
const SHELL_URL = "/";
/** Arquivos da abertura em vídeo (briefing + marca) — cacheados no shell para tocar offline. */
const ABERTURA_URLS = [
  "/abertura.mp4",
  "/abertura.webm",
  "/abertura-poster.jpg",
  "/abertura-marca.mp4",
  "/abertura-marca.webm",
  "/abertura-marca-poster.jpg",
];
/** Briefings em vídeo da equipe — cacheados no shell (offline a partir da 1ª vista). */
const BRIEFING_URLS = [
  "/briefing-preparador-urbano.mp4",
  "/briefing-sobrevivente-mato.mp4",
  "/briefing-operadora-tatica.mp4",
];
/** Banner do convite — pré-cacheado para o operador divulgar até sem rede. */
const BANNER_CONVITE_URLS = ["/banner-convite.png"];
const MAX_ASSETS = 120;
/** Runtime generoso: o cache é compartilhado entre TODOS os hosts de tiles
 * (bases, radar de chuva em 13 quadros, nuvens GIBS, BDGEx). Com 400, uma
 * única animação de radar evictava as bases vistas — voltar a uma base
 * recente baixava tudo de novo e a troca "não carregava de imediato". */
const MAX_RUNTIME = 1200;

const HOSTS_DE_TILES = [
  "tile.opentopomap.org",
  "openstreetmap.org",
  "server.arcgisonline.com",
  // Trilhas (CyclOSM) — domínio raiz distinto do OSM clássico.
  "tile-cyclosm.openstreetmap.fr",
  // Radar de chuva (RainViewer) — muitos quadros por animação: com cache,
  // o último ciclo fica disponível offline e a rede sofre menos.
  "rainviewer.com",
  // Imagem GeoColor do GOES-Leste (nuvens ao vivo): URL estável "default" —
  // o último quadro visto fica disponível offline.
  "gibs.earthdata.nasa.gov",
  // Relâmpagos ao vivo (NOAA nowCOAST, WMS): quadro de 15 minutos — com
  // cache, o último quadro visto fica disponível offline como as nuvens.
  "nowcoast.noaa.gov",
  // Carta topográfica do Exército (BDGEx, WMS MapCache): tiles maiores que os
  // demais (uma imagem por tile 256) — com cache, a carta consultada fica
  // disponível offline como as outras bases.
  "bdgex.eb.mil.br",
];

/**
 * Fila de concorrência dos tiles: os provedores (Esri, OpenTopoMap) recusam
 * RAJADAS de requisições e respondem com um placeholder de erro (imagem
 * cinza "Zoom Level Not Supported" com HTTP 200), que fica pintado no mapa.
 * Um semáforo no Service Worker mantém o fluxo de rede abaixo do limite —
 * acertos de cache não entram na fila (são instantâneos).
 */
const MAX_TILES_SIMULTANEOS = 8;
/** Profundidade máxima da fila — acima disso, responde 504 para o mapa
 * refazer depois, em vez de crescer sem fim durante voos longos. */
const MAX_FILA_TILES = 80;
/** Tempo máximo de um tile na rede. O fetch abortado pelo mapa (quadro de
 * animação ultrapassado) pode NUNCA resolver dentro do Service Worker —
 * cada hang segurava uma vaga da fila para sempre e, depois de 8 hangs,
 * TODO tile ficava pendente: o mapa chegava preto no destino do voo e não
 * voltava nem com o radar pausado. O temporizador devolve a vaga sempre. */
const TEMPO_MAXIMO_TILE_MS = 12000;
const filaTiles = { ativos: 0, esperando: [] };

/**
 * Ocupa uma vaga do semáforo.
 * - Promise  → vaga ocupada; o chamador já pode buscar o tile.
 * - null     → fila cheia (alívio de carga): o chamador responde 504 sem
 *              ocupar nada — o MapLibre refaz o pedido ao repintar.
 * A contagem é conservada na transferência de vaga: quem espera recebe a
 * vaga do que saiu (o contador não decrementa duas vezes — era o vazamento
 * que derrubava o limite para zero sob rajada).
 */
function pegarVagaTile() {
  if (filaTiles.esperando.length === 0 && filaTiles.ativos < MAX_TILES_SIMULTANEOS) {
    filaTiles.ativos++;
    return Promise.resolve();
  }
  if (filaTiles.esperando.length >= MAX_FILA_TILES) return null;
  return new Promise((liberar) => filaTiles.esperando.push(liberar));
}

function devolverVagaTile() {
  const proximo = filaTiles.esperando.shift();
  if (proximo) {
    proximo(); // a vaga TRANSFERE — a contagem segue a mesma
  } else {
    filaTiles.ativos--;
  }
}

/** fetch com temporizador próprio — nunca deixa uma vaga presa. */
function buscarComTempo(request) {
  return new Promise((resolver, recusar) => {
    const timer = setTimeout(() => recusar(new Error("tile esgotado")), TEMPO_MAXIMO_TILE_MS);
    fetch(request).then(
      (res) => {
        clearTimeout(timer);
        resolver(res);
      },
      (erro) => {
        clearTimeout(timer);
        recusar(erro);
      },
    );
  });
}

async function cacheFirstComFila(request, nomeCache, limite) {
  const cache = await caches.open(nomeCache);
  const emCache = await cache.match(request, { ignoreVary: true });
  if (emCache) return emCache;
  // Pedido já abortado pelo mapa (quadro ultrapassado do voo/da animação):
  // nem ocupa vaga — responde 504 e o mapa refaz quando repintar.
  if (request.signal && request.signal.aborted) {
    return new Response("", { status: 504, statusText: "Pedido cancelado" });
  }
  const vaga = pegarVagaTile();
  if (!vaga) {
    return new Response("", { status: 504, statusText: "Fila cheia" });
  }
  try {
    await vaga;
    const res = await buscarComTempo(request);
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
      // Abertura + briefings + banner do convite: melhor esforço por arquivo
      // — falha de um não quebra a instalação. Os briefings vão junto: o
      // <video> pede por Range e, sem o arquivo integral no cache, o handler
      // teria que buscar na rede — pré-cacheados, tocam na hora e offline.
      for (const url of [...ABERTURA_URLS, ...BRIEFING_URLS, ...BANNER_CONVITE_URLS]) {
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

/**
 * Vídeos (abertura e briefings): o elemento <video> pede o arquivo por
 * PARTES (Range: bytes=0-). Se o handler buscasse com o Range e guardasse,
 * cache.put rejeita resposta parcial (206) — o catch devolvia 504 e o vídeo
 * NUNCA tocava (o bug "os vídeos não reproduzem"). Aqui: acerto de cache
 * devolve o arquivo INTEIRO (o player aceita resposta integral para um
 * pedido com Range); sem cache, busca SEM Range (resposta 200 completa),
 * guarda e devolve — o vídeo toca na hora e fica no cache para offline.
 */
async function cacheFirstVideo(request, nomeCache) {
  const cache = await caches.open(nomeCache);
  const emCache = await cache.match(request, { ignoreVary: true });
  if (emCache) return emCache;
  try {
    const res = await fetch(new Request(request.url, { method: "GET" }));
    if (res && res.ok && res.status === 200) {
      try {
        await cache.put(request, res.clone());
      } catch {
        /* cache cheio/quota: o vídeo segue tocando da rede */
      }
    }
    return res;
  } catch {
    return new Response("", { status: 504, statusText: "Sem conexão" });
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

  // Abertura/briefings em vídeo: handler próprio (Range do <video>, ver
  // cacheFirstVideo). Banner do convite: cache-first simples no shell.
  if (url.origin === self.location.origin) {
    if (ABERTURA_URLS.includes(url.pathname) || BRIEFING_URLS.includes(url.pathname)) {
      event.respondWith(cacheFirstVideo(request, CACHE_SHELL));
      return;
    }
    if (BANNER_CONVITE_URLS.includes(url.pathname)) {
      event.respondWith(cacheFirst(request, CACHE_SHELL));
      return;
    }
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

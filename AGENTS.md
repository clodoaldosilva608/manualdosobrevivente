# Guia do projeto — Manual do Sobrevivente

App web full-stack offline-first para sobrevivismo e bushcraft com GIS tático
(MapLibre, MGRS, perfil de elevação), tema escuro militar e interface 100% em
português (pt-BR).

## Stack

- TanStack Start (React 19, SSR) + TanStack Router/Query
- Vite 7 + Nitro (preset padrão `vercel`; alternativo `cloudflare-module`)
- Tailwind CSS 4 + shadcn/ui + Lucide
- Supabase (Postgres com RLS + Auth) e Bun como gerenciador de pacotes
- Deploy: Vercel (`bunx vercel deploy --prebuilt --prod`); Cloudflare via
  `NITRO_PRESET=cloudflare-module`

## Comandos

```sh
bun install        # instalar dependências (sempre Bun; não há package-lock.json)
bun run dev        # desenvolvimento na porta 8080
bun run check:all  # lint + auditoria i18n + testes unitários
bun run typecheck  # tsc --noEmit
bun run build      # check:all + build de produção em .output/
```

## Convenções importantes

- **Banco compartilhado (ecossistema)**: o app usa o MESMO projeto Supabase do
  portal Centro de Sobrevivência. Toda tabela do Manual tem o prefixo
  `manual_*` com RLS por `user_id` (policies nomeadas `manual_*`); as tabelas
  do portal (`products`, `ebooks`, `waypoints`, `profiles`, `routes`, ...)
  são intocadas e **não** constam em `src/integrations/supabase/types.ts` —
  jamais consulte-as aqui, e nunca altere código do portal a partir deste repo
  (e vice-versa). Migration de referência:
  `supabase/migrations/20261008090000_manual_schema_sobrevivencia_core.sql`.
- **Idioma**: todo texto de interface e comentários de código em pt-BR. O ESLint
  (`eslint-rules/i18n-pt-br.js`) bloqueia literais em inglês nas telas e exige o
  utilitário central de formatação (`src/lib/format.ts`) para números e datas.
- **Arquitetura de dados (local-first)**: alterações de dados do usuário
  despacham um evento compartilhado no navegador; o backup em pasta
  (`src/lib/auto-backup.ts`) e o coordenador de sync na raiz reagem ao mesmo
  evento. A nuvem é opt-in (toggle em Ajustes, `cloud-auto-sync` no IndexedDB);
  telas de funcionalidade não duplicam lógica de sincronização ou backup.
- **PWA**: o service worker é o `public/sw.js` (sem plugin); em mudanças de
  lógica, aumente a constante `VERSAO` para invalidar caches. O registro só
  ocorre em build de produção (`src/lib/pwa.ts`). Ícones regeneráveis via
  `scripts/generate-icons.mjs`.
- **Backup em pasta**: use sempre os utilitários de `src/lib/backup.ts`
  (permissões, rotação e restauração) — nunca escreva na pasta do usuário
  diretamente das telas.
- **Mobile-first**: novos overlays flutuantes sobre o mapa devem entrar no
  fluxo vertical do HUD (mobile) ou respeitar as zonas reservadas; o teste
  `tests/map-overlap.spec.ts` falha se dois elementos do HUD se sobrepuserem.
- **Modo Osiris (inteligência global)**: o modo "Osiris" renderiza a
  **Visão Osiris** (`src/components/map/VisaoOsiris.tsx`): tela cheia com o
  globo OSIRIS self-hosted (`osiris-fork.vercel.app`) em iframe + painel
  "Camadas" que monta a query `?layers=...` (catálogo em
  `src/components/map/visao-osiris-camadas.ts`, persistido em `osirisVis`
  no usePreferences). A instância do globo precisa listar o domínio do app na
  CSP `frame-ancestors`; sem isso o componente mostra o aviso com instrução e
  o mapa tático nativo fica visível atrás do aviso (com as camadas de
  inteligência). As fontes externas das camadas nativas (USGS, NASA EONET,
  NOAA SWPC, NASA FIRMS, ADS-B.lol, WhereTheISS.at, GDACS, GDELT, Open-Meteo
  Air Quality) só são acessadas via `src/lib/intel.functions.ts` e
  `src/lib/intel-v2.functions.ts` (server functions com cache em memória e
  fallback para os últimos dados bons); o navegador nunca chama as fontes
  diretamente — exceção única: o WebSocket AIS (`src/lib/ais.ts`), que conecta
  direto a aisstream.io usando a chave pessoal do usuário ou a chave do
  servidor entregada pela server function `chavesServidor`
  (`AISSTREAM_API_KEY`; `FIRMS_MAP_KEY` nunca sai do servidor). As camadas de
  inteligência são desenhadas no mapa tático em QUALQUER modo (a Visão Osiris
  do globo cobre o mapa quando o embed funciona) e a coleta periódica roda
  enquanto qualquer camada de `intelVis` estiver ativa; os toggles ficam na
  folha "Camadas do mapa" dos dois modos. Novas camadas
  nativas entram em `src/components/map/intel-layers.ts` (ordem de
  empilhamento fixa documentada no topo do arquivo), com toggle em
  `LINHAS_INTEL` e visibilidade persistida em `intelVis` (usePreferences).
  Datasets curados (conflitos, nucleares, marítimos) são estáticos e em pt-BR.
  A Visão Osiris é coberta por `tests/map-osiris.spec.ts` (iframe, contador,
  painel de camadas, persistência e volta ao tático).
- **Menu geral (hambúrguer)**: o botão hambúrguer (`btn-menu-app`, ao lado do
  alternador de modo no HUD tático e no cabeçalho da Visão Osiris) abre o
  `MenuApp` (`src/components/map/MenuApp.tsx`): navegação entre telas,
  ferramentas do mapa e o submenu "OSIRIS" com todas as funções de
  inteligência. Ações que dependem do mapa nativo passam por `acaoMenu` no
  MapShell, que devolve ao modo tático antes de abrir o painel (os sheets
  ficam por baixo do globo em tela cheia). Coberto por `tests/map-menu.spec.ts`.
- **Limpar tela e elementos da tela**: o botão "Limpar" (rail, menu e folha de
  camadas) apaga medições/perfil de elevação, desarma ferramentas e oculta os
  waypoints do mapa (eles continuam salvos no banco local). O que aparece na
  tela é escolhido na seção "Elementos da tela" da folha de camadas — catálogo
  em `src/components/map/tela-elementos.ts` (`TelaVisibilidade`/`LINHAS_TELA`,
  persistido em `telaVis` no usePreferences): coordenadas, minha posição, ponto
  de posição no mapa, bússola, barra de ferramentas, waypoints e controles
  nativos do MapLibre (adicionados/removidos via `controlesRef`). A
  resincronização após troca de estilo é centralizada em `sincronizarDesenho`
  (load, styledata e troca de camada base) — sem ela medições e waypoints
  sumiam ao trocar a base. Coberto por `tests/map-tela.spec.ts`.
- **Bússola tática**: a configuração de norte (verdadeiro/magnético) é a
  preferência global `northRef` (Ajustes) — compartilhada entre a bússola em
  miniatura, a bússola completa e os Ajustes. O sensor do aparelho vive no
  store compartilhado `src/lib/bussola-sensor.ts` (fora do React): ativado uma
  vez, alimenta as duas bússolas e sobrevive a remontagens. O mostrador traz a
  posição real e atual do Sol, da Lua e do Cruzeiro do Sul/Polaris
  (`posicaoEquatorialParaHorizontal` em `src/lib/celestial.ts`, via tempo
  sideral) — astros abaixo do horizonte aparecem apagados. Coberta por
  `tests/celestial.spec.ts` (unit) e `tests/map-bussola.spec.ts` (E2E).
- **Rotação do mapa + posição travada**: preferências `mapaRotaciona` e
  `posicaoTravada` (usePreferences/IndexedDB). A rotação assina o sensor com
  `observarSensor` FORA do React (o MapShell não re-renderiza a cada leitura;
  só `map.rotateTo` no bearing do rumo — mesmo alvo do mostrador). A trava
  desativa dragPan/keyboard/scrollZoom/doubleClickZoom/boxZoom e desliga a
  rotação por toque; `moveend` devolve o centro ao ponto fixado; qualquer
  `flyTo` (MINHA POSIÇÃO, waypoints, hub) destrava antes. Os controles ficam na
  seção MAPA do cartão da bússola (`src/components/map/mapa-controles.tsx`,
  assinatura do sensor no componente folha via `MapaControlesComSensor`) e o
  chip `mapa-travado` permite ver/destravar com a bússola minimizada.
- **Integração Obsidian** (`src/lib/obsidian.ts`, cartão em Ajustes): o app grava
  notas Markdown direto no vault do usuário — o Obsidian reindexa a pasta
  sozinho, sem plug-in e sem servidor. O fluxo segue o padrão do backup em
  pasta (File System Access API, permissões via `pegarPermissao`/`escreverArquivo`
  de `src/lib/backup.ts`): o usuário escolhe a pasta (de preferência o vault),
  o app cria a subpasta "Manual do Sobrevivente" (Waypoints/, Boletins/,
  Localizações/) e persiste o handle no IndexedDB (`obsidian-folder-handle`).
  Degradê em três níveis: pasta conectada (Chrome/Edge PC+Android) → URI
  `obsidian://new` (Obsidian instalado, texto curto) → baixar `.md` (universal).
  Frontmatter das notas usa `location: "lat,lng"` (compatível com o plug-in
  Map View). Pontos de gravação: cartão Obsidian (sincronizar waypoints),
  botão "Obsidian" no boletim de inteligência e opção "Obsidian" na folha de
  compartilhar (S.O.S). E2E em `tests/map-obsidian.spec.ts` substitui o
  seletor por handles falsos + patch do IndexedDB (handle → descritor
  serializável) — handles OPFS reais derrubam o Chromium headless.
- **Projeção globo**: o mapa tático alterna plano (mercator) ↔ globo 3D
  (`map.setProjection`, MapLibre 5) — botão "Globo" no rail, item "Globo 3D"
  no menu e seção "Projeção do mapa" na folha de camadas; preferência
  `projecao` no usePreferences. A projeção vive no estilo: reaplicada no
  `load` e no `styledata` (troca de camada base). Coberto por
  `tests/map-globo.spec.ts`.
- **Treinamento de bússola**: curso interativo em `/tutorial`
  (`src/routes/tutorial.tsx`, dados em `src/lib/tutorial-bussola.ts`, player em
  `src/components/tutorial/TutorialBussola.tsx` e rosa interativa em
  `RosaTutorial.tsx`). Exercícios: "explorar" (arraste livre), "marcacao"
  (encaixar a luneta no rumo-alvo ±4°) e "rumo" (sensor do aparelho via
  `bussola-sensor.ts`; sem sensor, simulador). Progresso + quiz (mínimo 3/4)
  ficam no `localStorage` (`tgis:tutorial-bussola`) e a insígnia
  "OPERADOR ORIENTADO" exige todas as lições. Entradas: item "Treinamento" no
  menu (ROTAS), banner em /manual e botão de formatura no cartão da bússola.
  Coberto por `tests/tutorial.spec.ts`.
- **Modo noturno (visão noturna vermelha)**: preferências `visaoNoturna`,
  `noturnoVermelho` e `noturnoEscurecer` no usePreferences; aplicação global
  em `src/lib/visao-noturna.ts` — classe `modo-noturno` no `<html>` (tokens
  vermelhos em `styles.css`) + dois overlays não-interativos (tinta vermelha
  `mix-blend-mode: multiply` sobre o mapa e dimmer preto). O espelho em
  `localStorage` (`tgis:visao-noturna`) é aplicado por script inline no
  `RootShell` ANTES da hidratação (sem flash claro); `SincronizadorNoturno`
  no `__root.tsx` mantém o estado global em dia. Controles: Ajustes › Uso
  noturno (toggle + intensidades) e item "Modo noturno" no menu (ação global,
  NÃO devolve ao tático). Coberto por `tests/noturno-rota.spec.ts`.
- **Guia de Rota**: matemática e armazenamento puros em `src/lib/rota.ts`
  (desvio transversal, status de navegação, detecção de círculos, ETA;
  rota/trilha persistidas na loja de settings do IndexedDB). Integração no
  MapShell: camadas `rota`/`trilha` em `adicionarFontesDesenho` + `rotaFC`/
  `trilhaFC` (sobrevivem à troca de base via `sincronizarDesenho`), gravação
  da trilha dentro do `watchPosition` (um ponto a cada 10 m, persistência
  a cada 30 s), navegação com `navRef`/`trilhaRef` (refs — o watch nasce
  uma vez), rumo do operador = GPS course (≥0,5 m/s) ou sensor + declinação.
  UI: `src/components/map/GuiaRota.tsx` (banner HUD no fluxo superior mobile
  e absoluto no desktop + folha "rota" pelo rail/menu). Constantes de campo:
  raio de chegada 25 m, desvio tolerado 100 m, aviso de círculos a cada
  10 min. Coberto por `tests/rota.spec.ts` (unit) e
  `tests/noturno-rota.spec.ts` (E2E).
- **Layout do HUD desktop (sem sobreposições)**: o canto superior direito é
  do hambúrguer + alternador (top-4); os controles nativos do MapLibre
  descem para `top: 4.75rem` via CSS (`styles.css`, com `!important` — o CSS
  do MapLibre é injetado depois e define top: 0); o rail de ações começa em
  `md:top-[13.75rem]` em 2 colunas com `max-h` limitado; a bússola em
  miniatura fica no canto INFERIOR ESQUERDO no desktop (`md:left-4
md:bottom-11`, acima da escala) e o painel flutua à esquerda do rail de 2
  colunas (`md:right-[10.5rem] md:bottom-14`) — o canto direito nunca é
  coberto;
  gráfico de elevação e diálogo de waypoint são centrados embaixo
  (`md:left-1/2 md:-translate-x-1/2`); folhas inferiores têm
  `max-h-[85dvh]` com rolagem interna (sem o corte, o topo do conteúdo
  ficava acima da tela no PC). Qualquer novo elemento fixo deve passar pelo
  teste de sobreposição (`tests/map-overlap.spec.ts`, desktop 1280×720 e
  1366×640 além do celular 390×844).
- **Segurança**: operações administrativas usam o cliente service role
  (`client.server.ts`) apenas em módulos `*.server.ts` — arquivos `*.functions.ts`
  e rotas vão para o bundle do cliente. Rotas autenticadas usam o middleware
  `auth-middleware.ts` (RLS ativa).
- **Cron**: a rota `POST /api/public/reports-weekly` exige o header
  `Authorization: Bearer <CRON_SECRET>`; valide sempre com
  `authenticateCronRequest`.
- **Env**: variáveis `VITE_*` são injetadas em tempo de build pelo
  `vite.config.ts`; nunca versione `.env` (modelo em `.env.example`).

## Project architecture

- Local-first user data changes dispatch one shared browser event; the root sync
  coordinator debounces cloud backup and merges on sign-in or reconnect,
  preventing feature screens from duplicating synchronization logic.
- Scheduled reports use one protected public server route and a workspace-owned
  mail connection; report preferences and delivery history remain owner-scoped
  in the database.

- **MODO ALERTA (radar de proximidade)**: `src/lib/alerta-radar.ts` (puro,
  coberto por `tests/alerta-radar.spec.ts`) cruza o snapshot intel + alertas
  GDACS com a posição do operador (GPS ou centro do mapa) e devolve ameaças
  com nível por distância: focos FIRMS até 50 km (crítico até 15 km), sismos
  USGS M4+ até 600 km (crítico M5,5+ a 300 km ou tsunami), GDACS vermelho/
  laranja até 1000 km (verde até 300 km), EONET até 500 km e tempestade Kp
  (global). UI: resumo no topo do BOLETIM (selo vermelho no botão do rail) +
  folha dedicada "MODO ALERTA" (menu › Modo Alerta ou "Radar completo").
  E2E em `tests/map-alerta.spec.ts`.

## Idioma, SOS, validade e prontidão offline (out/2026)

- **Internacionalização**: `src/lib/i18n/` — o padrão é pt-BR (as chaves dos
  dicionários são as próprias strings pt-BR); seletor em Ajustes com
  español/English/Русский/中文/日本語. Escolha em `localStorage["tgis:idioma"]`,
  aplicada após a hidratação (SSR continua pt-BR; `html lang` troca no cliente).
  `t()` tem fallback progressivo: chave ausente exibe o pt-BR original. Datas e
  números seguem o idioma via `definirLocale()` (`src/lib/format.ts`). Os
  dicionários (`dic-*.ts`) são GERADOS por `scripts/gerar-dicionarios.py` a
  partir de `scripts/tabela_{a,b,c}.py` — não editar à mão; sincronia de chaves
  garantida por `tests/i18n.spec.ts`.
- **Botão SOS**: na navegação inferior é um botão circular vermelho elevado no
  centro (celular) e item vermelho no desktop (`data-test="nav-sos"`).
- **Validade da mochila**: `src/lib/validade.ts` (puro, `tests/validade.spec.ts`)
  classifica itens por `expires_at` (vencido/crítico ≤7d/atenção ≤30d/próximo
  ≤90d/ok); a Mochila mostra painel "Lembretes de validade" na lista e no
  detalhe, selo por item e badge no cartão (`data-test="lembretes-validade*"`).
- **Teste de prontidão offline**: `src/lib/prontidao-offline.ts` (classificação
  pura em `tests/prontidao.spec.ts`) + seção na página Offline que verifica
  Service Worker, cache do shell, /offline.html, áreas, manual, banco local e
  rede — veredito PRONTO/PARCIAL/NÃO PRONTO (`data-test="prontidao-*"`).
- **Manuais dos pôsteres**: 10 verbetes novos em `src/lib/manual-content.ts`
  com imagens em `public/manuals/*.jpg` (geradas de pôsteres do Centro de
  Sobrevivência; JPEG ≤340 KB) e categorias novas
  preparação/mentalidade/equipamento.
- **Boletim 100% pt-BR**: GDELT agora pede `sourcelang:por` com palavras-chave
  bilíngues e `mapearNoticias` descarta artigos fora do português.

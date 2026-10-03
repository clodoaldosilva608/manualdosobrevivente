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
- **Modo Osiris (inteligência global)**: as fontes externas (USGS, NASA EONET,
  NOAA SWPC, NASA FIRMS, ADS-B.lol, WhereTheISS.at, GDACS, GDELT, Open-Meteo
  Air Quality) só são acessadas via `src/lib/intel.functions.ts` e
  `src/lib/intel-v2.functions.ts` (server functions com cache em memória e
  fallback para os últimos dados bons); o navegador nunca chama as fontes
  diretamente — exceção única: o WebSocket AIS do usuário (`src/lib/ais.ts`),
  que conecta direto a aisstream.io com a chave pessoal dele. Novas camadas
  entram em `src/components/map/intel-layers.ts` (ordem de empilhamento fixa
  documentada no topo do arquivo), com toggle em `LINHAS_INTEL` no
  `MapShell.tsx` e visibilidade persistida em `intelVis` (usePreferences).
  Datasets curados (conflitos, nucleares, marítimos) são estáticos e em pt-BR.
  Novos overlays do modo Osiris entram no fluxo vertical do HUD e são cobertos
  por `tests/map-osiris.spec.ts` (inclui regressão de sobreposição).
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

# Manual do Sobrevivente

![CI](https://github.com/clodoaldosilva608/manualdosobrevivente/actions/workflows/ci.yml/badge.svg)

Aplicação web full-stack para praticantes de sobrevivismo e bushcraft, com um
sistema de informações geográficas tático inspirado em ferramentas militares
(como o BDGEx). O app funciona **offline-first**: mapa, manual de
sobrevivência, inventário e ferramentas de orientação continuam úteis mesmo
sem conexão — e os dados sincronizam na nuvem quando uma conta está conectada.

> Marca da interface: **TACTICAL/GIS** — tema tático escuro, tipografia
> monoespaçada e componentes dimensionados para uso com luvas em campo.

---

## Funcionalidades

- **Mapa tático** — MapLibre GL com múltiplas camadas base (satélite,
  topográfico, ruas e tático escuro), suporte a servidores WMS/WMTS/XYZ
  customizados e cache de tiles offline via IndexedDB.
- **Coordenadas profissionais** — leitura em tempo real em graus decimais
  (DD), graus-minutos-segundos (DMS) e MGRS, com ferramenta "ir para
  coordenada" e cálculo de declinação magnética.
- **Medições avançadas** — distâncias (m/km/milhas náuticas), áreas (m²/ha/ac)
  e perfil de elevação com gráfico de seção transversal.
- **Waypoints táticos** — marcadores customizáveis (fonte de água, abrigo,
  zona de perigo, forrageio, cache) com importação/exportação em GPX e KML.
- **Bússola digital** — HUD interativo com direção, azimute até o próximo
  waypoint e referência norte verdadeiro/magnético.
- **Visão Osiris (inteligência global)** — alterne o mapa entre "Tático" e
  "Osiris": o modo Osiris abre em tela cheia o globo 3D do OSIRIS
  self-hosted (mesma apresentação da visão-osiris do Centro de Sobrevivência),
  com painel lateral de 12 camadas (marítimo, satélites, câmeras, notícias ao
  vivo, terremotos, incidentes globais, ciclo dia/noite, cabos submarinos,
  SDKs marítimo/aéreo/naval) que recarrega o globo automaticamente a cada
  mudança. O mapa tático nativo também mantém camadas de inteligência próprias
  (sismos M2,5+ USGS, eventos NASA EONET, focos de calor NASA FIRMS, zonas de
  conflito, terminador dia/noite, voos ADS-B, ISS, alertas GDACS, rotas
  marítimas, centrais nucleares, navios AIS — opcionais) e o **Boletim de
  inteligência** consolidado (incluindo qualidade do ar e manchetes globais).
  Sem internet, o app exibe os últimos dados coletados (cache no aparelho).
- **Manual de sobrevivência offline** — base de conhecimento categorizada e
  pesquisável (primeiros socorros, fogo, água, abrigos, nós) com
  renderização markdown e checklists interativos.
- **Mochila de emergência (BOB)** — gestão de equipamentos por categoria,
  rastreamento de peso total com alertas de limite e avisos de validade.
- **S.O.S.** — sinalização luminosa em código Morse (SOS), localização em
  texto gigante para ditado via rádio e botões de emergência.
- **Painel de dados** — visão consolidada do estado da mochila, checklists e
  waypoints.
- **Downloads offline** — gestão de tiles e conteúdos disponíveis sem rede.
- **PWA instalável** — instale na tela de início (Android/iOS/desktop) com
  ícone próprio, tela cheia, service worker e página offline dedicada.
- **Mobile-first** — interface projetada para toque: HUD do mapa em fluxo
  vertical sem sobreposições (regressão coberta por testes automatizados),
  alvos de toque generosos, safe-areas de iPhone e campos sem zoom automático.
- **Modo local por padrão** — todos os dados (waypoints, mochila, checklist e
  preferências) vivem no banco local do aparelho (IndexedDB). Conta e nuvem
  são opcionais e só entram em ação com o consentimento do usuário.
- **Pasta de backup** — no primeiro uso, um assistente pede ao usuário para
  criar/escolher uma pasta no aparelho (File System Access API); todas as
  atividades são gravadas nela automaticamente, com rotação de versão
  (`backup-anterior.json`) e restauração com um toque.
- **Relatório semanal por e-mail** — envio agendado e protegido de um resumo
  do uso do app (requer gateway de e-mail configurado).
- **Conta e sincronização** — autenticação por e-mail/senha e Google via
  Supabase, com sincronização local-first desativada por padrão.

## Stack tecnológica

| Camada          | Tecnologia                                            |
| --------------- | ----------------------------------------------------- |
| Framework       | [TanStack Start](https://tanstack.com/start) (React 19, SSR) |
| Roteamento      | TanStack Router (file-based) + TanStack Query          |
| Build           | Vite 7 + Nitro (preset `vercel`)                       |
| Estilo          | Tailwind CSS 4 + shadcn/ui + Lucide Icons              |
| Mapas           | MapLibre GL JS + Turf.js + MGRS                        |
| Backend         | Supabase (Postgres + Auth + RLS)                       |
| Deploy          | Vercel (Nitro, preset `vercel`) — alternativa: Cloudflare Workers |
| Gerenciador     | [Bun](https://bun.sh)                                  |
| Testes          | Vitest + Playwright                                    |

## Requisitos

- [Bun](https://bun.sh) 1.2 ou superior
- Um projeto [Supabase](https://supabase.com) (URL e chave publishable) —
  **opcional em modo local**: sem as variáveis, o app funciona 100% offline
  com o banco do aparelho

## Começando

```sh
# 1. Clone o repositório
git clone https://github.com/clodoaldosilva608/manualdosobrevivente.git
cd manualdosobrevivente

# 2. Instale as dependências
bun install

# 3. Configure as variáveis de ambiente
cp .env.example .env
#    Edite o .env com a URL e a chave publishable do seu projeto Supabase.

# 4. Rode em modo de desenvolvimento
bun run dev
```

O app estará disponível em `http://localhost:8080`.

### Banco de dados

As migrations do schema (tabelas de waypoints, mochila, checklists,
preferências e relatórios, todas com RLS) ficam em `supabase/migrations/`.
Para aplicar em um projeto novo:

```sh
bunx supabase link --project-ref SEU-PROJECT-REF
bunx supabase db push
```

Para habilitar o login com Google, ative o provedor em
**Authentication → Providers** no painel do Supabase e configure o client ID
do OAuth. Para os relatórios semanais, defina `CRON_SECRET` e as variáveis do
gateway de e-mail (ver seção abaixo) e agende o POST para
`/api/public/reports-weekly` com o header `Authorization: Bearer <CRON_SECRET>`.

## Scripts disponíveis

| Comando              | Descrição                                                    |
| -------------------- | ------------------------------------------------------------ |
| `bun run dev`        | Servidor de desenvolvimento (porta 8080)                      |
| `bun run build`      | Verificações + build de produção (saída em `.output/`)        |
| `bun run preview`    | Preview do build de produção                                  |
| `bun run lint`       | ESLint (inclui regras de i18n pt-BR)                          |
| `bun run check:i18n` | Auditoria anti-inglês nas telas                               |
| `bun run test`       | Testes unitários (Vitest)                                     |
| `bun run test:e2e`   | Testes E2E (SSR pt-BR e responsividade do mapa)               |
| `bun run typecheck`  | Verificação de tipos TypeScript (`tsc --noEmit`)              |
| `bun run check:all`  | lint + i18n + testes (roda antes de todo build)               |
| `bun run format`     | Formatação com Prettier                                       |

## Variáveis de ambiente

| Variável                       | Onde       | Descrição                                            |
| ------------------------------ | ---------- | ---------------------------------------------------- |
| `SUPABASE_URL`                 | Cliente/SSR | URL do projeto Supabase                              |
| `SUPABASE_PUBLISHABLE_KEY`     | Cliente/SSR | Chave publishable (nova API key `sb_publishable_...`) |
| `VITE_SUPABASE_URL`            | Navegador  | Espelho da URL para substituição em tempo de build    |
| `VITE_SUPABASE_PUBLISHABLE_KEY`| Navegador  | Espelho da chave para substituição em tempo de build  |
| `SUPABASE_SERVICE_ROLE_KEY`    | Servidor   | Chave service role (bypassa RLS; nunca expor)         |
| `CRON_SECRET`                  | Servidor   | Segredo do job de relatórios semanais                 |
| `MAIL_GATEWAY_URL`             | Servidor   | Endpoint compatível com a API do Gmail                |
| `MAIL_GATEWAY_KEY`             | Servidor   | Token Bearer do gateway de e-mail                     |
| `MAIL_CONNECTION_KEY`          | Servidor   | Chave de conexão do gateway (`X-Connection-Api-Key`)  |
| `FIRMS_MAP_KEY`                | Servidor   | Opcional — chave gratuita NASA FIRMS para a camada de focos de calor do modo Osiris (o usuário também pode cadastrar a própria chave em Ajustes, salva só no aparelho) |

Consulte `.env.example` para o modelo completo. **Nunca versione o arquivo
`.env`** — ele está no `.gitignore` por padrão.

## Deploy (Vercel)

O build usa o Nitro com preset `vercel`, gerando em `.vercel/output/` a
estrutura padrão da Vercel (Build Output API):

```sh
# Build completo (roda lint, i18n e testes antes)
bun run build

# Deploy do build para a Vercel (produção)
bunx vercel deploy --prebuilt --prod
```

No primeiro deploy, vincule o projeto com `bunx vercel link`. Defina as
variáveis de ambiente do servidor (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` e as de e-mail) no painel da Vercel
ou via `bunx vercel env add`. Com o projeto vinculado ao repositório GitHub,
todo push na `main` dispara um novo deploy automaticamente.

### Deploy alternativo (Cloudflare Workers)

```sh
NITRO_PRESET=cloudflare-module bunx vite build
bunx nitro deploy --prebuilt
```

A configuração do Worker (nome, data de compatibilidade, `nodejs_compat`)
fica em `wrangler.jsonc`.

## Visão Osiris (inteligência global)

O mapa tem dois modos alternáveis pelo usuário (botão no topo do HUD ou em
*Camadas → Modo de visualização*):

- **Tático** — navegação clássica (bússola, MGRS, medições, waypoints) com
  qualquer camada base.
- **Osiris** — abre a **Visão Osiris** em tela cheia (mesma apresentação da
  `visao-osiris` do Centro de Sobrevivência): o globo 3D de inteligência global
  do OSIRIS self-hosted (`osiris-fork.vercel.app`) roda em um iframe e o painel
  lateral **Camadas** controla o que aparece no globo pela query `?layers=...`
  — o iframe recarrega automaticamente a cada mudança. São 12 camadas
  (Marítimo, Satélites, Câmeras, Preview câmeras, Notícias ao vivo, Terremotos,
  Incidentes globais, Ciclo dia/noite, Cabos submarinos, SDK marítimo, SDK
  aéreo e SDK naval), com "Ativar todas"/"Desativar todas" e contador na barra
  superior ("N camadas ativas"). No celular o painel vira uma folha acionada
  pelo botão da barra superior. A escolha de camadas é persistida no IndexedDB
  (`osirisVis` nas preferências).

  > **CSP (frame-ancestors)**: para o globo ser incorporado, a instância
  > `osiris-fork.vercel.app` precisa listar o domínio deste app na CSP
  > `frame-ancestors` (ex.: `https://manual-do-sobrevivente.vercel.app`).
  > Sem isso, a Visão Osiris exibe um aviso com o domínio a autorizar, botão
  > "Abrir original" (nova aba) e "Tentar novamente" — e o mapa tático nativo
  > continua visível atrás do aviso.

### Camadas de inteligência nativas do mapa (Boletim)

O app também mantém camadas de inteligência nativas no mapa MapLibre — hoje
elas operam atrás da Visão Osiris como experiência de fallback (quando o globo
não pode ser incorporado, o mapa segue visível com estas camadas):

  | Camada | Fonte | Tipo |
  |--------|-------|------|
  | Sismos M2,5+ (24 h) | USGS | ao vivo |
  | Eventos naturais | NASA EONET | ao vivo |
  | Focos de calor (VIIRS) | NASA FIRMS | ao vivo · requer chave (ver abaixo) |
  | Zonas de conflito | dataset curado (`intel-conflicts.ts`) | referência |
  | Terminador dia/noite | SunCalc | calculado no cliente |
  | Clima espacial (Kp) | NOAA SWPC | ao vivo |
  | Voos ao vivo (militares + civis) | rede ADS-B (adsb.lol) | ao vivo |
  | ISS — posição, trajetória e pegada | WhereTheISS.at | ao vivo |
  | Alertas oficiais de desastre | GDACS (UE/ONU) | ao vivo |
  | Rotas marítimas (12 estreitos + 22 portos) | dataset curado (`intel-maritimo.ts`) | referência |
  | Centrais nucleares (~100 instalações) | dataset curado (`intel-nuclear.ts`) | referência |
  | Navios ao vivo (AIS) | AISStream.io | ao vivo · requer chave (ver abaixo) |

- **Boletim de inteligência** — painel consolidado (botão no rail do mapa) com
  clima espacial, qualidade do ar no centro do mapa (Open-Meteo), alertas
  laranja/vermelhos do GDACS, sismos M4,5+, eventos ativos, manchetes globais
  de emergência (GDELT) e situação da ISS — tudo clicável, voando até o ponto
  no mapa.

As fontes são acessadas apenas por server functions
(`src/lib/intel.functions.ts` e `src/lib/intel-v2.functions.ts`) com cache em
memória (45–300 s conforme a fonte) e fallback para os últimos dados bons — o
navegador nunca chama as fontes diretamente (evita CORS e expõe chaves). O
último snapshot bem-sucedido fica salvo no IndexedDB (`intel-cache`) e é
hidratado ao abrir o modo offline. A escolha do modo, das camadas nativas
(`intelVis`) e das camadas da Visão Osiris (`osirisVis`) é persistida no banco
local (IndexedDB) junto das demais preferências.

### Chaves opcionais do usuário (Ajustes → Chaves de inteligência)

As chaves ficam **somente no aparelho** (IndexedDB) e podem ser cadastradas
sem envolver o servidor:

- **NASA FIRMS** (`firms.modaps.eosdis.nasa.gov`, conta Earthdata gratuita) —
  ativa a camada de focos de calor; alternativa à variável `FIRMS_MAP_KEY` do
  servidor.
- **AISStream.io** (registro gratuito) — conecta o WebSocket de AIS no
  navegador e mostra navios ao redor da área visível do mapa (camada
  "Navios ao vivo").

## PWA, modo local e pasta de backup

### Instalar o aplicativo

- **Android/Chrome/desktop** — botão “Instalar aplicativo” no modal de
  boas-vindas ou em *Ajustes → Aplicativo* (usa o `beforeinstallprompt`).
- **iPhone/iPad** — no Safari: Compartilhar → “Adicionar à Tela de Início”
  (a Apple não expõe prompt automático para PWA).

O service worker (`public/sw.js`) cacheia o shell do app, assets com hash,
fontes e tiles de mapa (com limite de espaço). Sem conexão, o app abre em
modo offline; navegações fora do cache recebem a página `public/offline.html`.
Para invalidar caches após mudanças, aumente a constante `VERSAO` no sw.js.

### Banco de dados local

Todos os dados do usuário ficam no IndexedDB do aparelho
(`src/lib/db.ts`). A sincronização com a nuvem é **opt-in**: só acontece com
sessão ativa e com “Sincronizar automaticamente” ativado em *Ajustes*. Sem as
variáveis do Supabase, o app segue funcionando em modo local.

### Pasta de backup

No primeiro acesso, o assistente pede ao usuário para criar/escolher uma
pasta (File System Access API — Chrome/Edge/Android). O aplicativo grava
automaticamente nesta pasta, a cada alteração:

| Arquivo                                    | Conteúdo                              |
| ------------------------------------------ | ------------------------------------- |
| `backup-manual-do-sobrevivente.json`       | Snapshot mais recente dos dados       |
| `backup-manual-do-sobrevivente-anterior.json` | Cópia da versão anterior (rotação) |
| `LEIA-ME.txt`                              | Explicação da pasta                   |

A restauração (mesclagem, vence o registro mais recente) fica em
*Ajustes → Pasta de backup → Restaurar do backup*. Em navegadores sem
suporte à API (Safari/iOS), a seção não aparece e o backup é feito por
exportação/importação de arquivo em *Ajustes*.

## Estrutura do projeto

```
├── .github/workflows/     # CI (lint, i18n, testes, E2E e build)
├── eslint-rules/          # Regras customizadas de i18n pt-BR
├── public/                # Manifest PWA, service worker, ícones e offline.html
├── scripts/               # Utilitários (auditoria i18n, geração de ícones)
├── src/
│   ├── assets/manual/     # Imagens do manual de sobrevivência
│   ├── components/
│   │   ├── ui/            # Componentes shadcn/ui
│   │   ├── map/           # Componentes do mapa (bússola, shell, HUD)
│   │   └── ...            # Navegação, compartilhamento, onboarding, backup
│   ├── hooks/             # Hooks de React (preferências, mobile)
│   ├── integrations/
│   │   └── supabase/      # Clientes, middleware de auth e cron
│   ├── lib/               # Núcleo: geo, coords, db local, backup, PWA, sync…
│   ├── routes/            # Rotas file-based (mapa, manual, mochila, SOS…)
│   ├── router.tsx         # Criação do router (TanStack Router)
│   ├── server.ts          # Entry do servidor SSR com página de erro
│   └── routeTree.gen.ts   # Árvore de rotas gerada (não editar)
├── supabase/
│   ├── config.toml        # Config local do Supabase
│   └── migrations/        # Schema versionado do banco
├── tests/                 # Testes unitários e E2E
├── vite.config.ts         # Config do Vite (TanStack Start + Nitro)
└── wrangler.jsonc         # Config do deploy alternativo no Cloudflare
```

## Arquitetura

- **Local-first** — alterações de dados do usuário disparam um evento único
  no navegador; o backup em pasta reage ao mesmo evento (com debounce e
  rotação de versão), e a sincronização com a nuvem — desativada por padrão —
  agrupa as mudanças quando o usuário consente. As telas não duplicam lógica
  de sincronização.
- **Segurança do servidor** — operações administrativas usam o cliente
  service role apenas dentro de módulos `*.server.ts`; rotas de usuário
  passam pelo middleware de autenticação com RLS ativa.
- **i18n pt-BR** — o ESLint bloqueia literais em inglês nas telas e obriga o
  uso do utilitário central de formatação de números/datas
  (`scripts/check-i18n.mjs` reforça a auditoria no CI).
- **Regressão visual** — `tests/map-overlap.spec.ts` mede as caixas dos
  elementos do HUD do mapa em 390×844 e falha se qualquer par se sobrepor.

Confira `AGENTS.md` para um resumo rápido da arquitetura voltado a
contribuidores (e agentes de código).

## Roadmap

As próximas etapas planejadas estão em [roadmap.md](roadmap.md).

## Licença

Distribuído sob a [Licença MIT](LICENSE).

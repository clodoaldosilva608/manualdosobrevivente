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
- **Relatório semanal por e-mail** — envio agendado e protegido de um resumo
  do uso do app (requer gateway de e-mail configurado).
- **Conta e sincronização** — autenticação por e-mail/senha e Google via
  Supabase, com sincronização automática local-first entre aparelhos.

## Stack tecnológica

| Camada          | Tecnologia                                            |
| --------------- | ----------------------------------------------------- |
| Framework       | [TanStack Start](https://tanstack.com/start) (React 19, SSR) |
| Roteamento      | TanStack Router (file-based) + TanStack Query          |
| Build           | Vite 7 + Nitro (preset `cloudflare-module`)            |
| Estilo          | Tailwind CSS 4 + shadcn/ui + Lucide Icons              |
| Mapas           | MapLibre GL JS + Turf.js + MGRS                        |
| Backend         | Supabase (Postgres + Auth + RLS)                       |
| Deploy          | Cloudflare Workers (compatível com Node via `nodejs_compat`) |
| Gerenciador     | [Bun](https://bun.sh)                                  |
| Testes          | Vitest + Playwright                                    |

## Requisitos

- [Bun](https://bun.sh) 1.2 ou superior
- Um projeto [Supabase](https://supabase.com) (URL e chave publishable)

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

Consulte `.env.example` para o modelo completo. **Nunca versione o arquivo
`.env`** — ele está no `.gitignore` por padrão.

## Deploy (Cloudflare Workers)

O build usa o Nitro com preset `cloudflare-module`, gerando em `.output/` um
Worker pronto para o Cloudflare:

```sh
# Build completo (roda lint, i18n e testes antes)
bun run build

# Deploy do build para o Cloudflare
bunx nitro deploy --prebuilt
```

A configuração do Worker (nome, data de compatibilidade, `nodejs_compat`)
fica em `wrangler.jsonc`. Defina as variáveis de ambiente do servidor
(`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`CRON_SECRET` e as de e-mail) no dashboard do Cloudflare ou via
`wrangler secret put`.

## Estrutura do projeto

```
├── .github/workflows/     # CI (lint, i18n, testes, E2E e build)
├── eslint-rules/          # Regras customizadas de i18n pt-BR
├── scripts/               # Utilitários (auditoria i18n)
├── src/
│   ├── assets/manual/     # Imagens do manual de sobrevivência
│   ├── components/
│   │   ├── ui/            # Componentes shadcn/ui
│   │   ├── map/           # Componentes do mapa (bússola, shell)
│   │   └── ...            # Navegação, compartilhamento, sync
│   ├── hooks/             # Hooks de React (preferências, mobile)
│   ├── integrations/
│   │   └── supabase/      # Clientes, middleware de auth e cron
│   ├── lib/               # Núcleo: geo, coords, sync, manual, GPX/KML…
│   ├── routes/            # Rotas file-based (mapa, manual, mochila, SOS…)
│   ├── router.tsx         # Criação do router (TanStack Router)
│   ├── server.ts          # Entry do servidor SSR com página de erro
│   └── routeTree.gen.ts   # Árvore de rotas gerada (não editar)
├── supabase/
│   ├── config.toml        # Config local do Supabase
│   └── migrations/        # Schema versionado do banco
├── tests/                 # Testes unitários e E2E
├── vite.config.ts         # Config do Vite (TanStack Start + Nitro)
└── wrangler.jsonc         # Config de deploy no Cloudflare
```

## Arquitetura

- **Local-first** — alterações de dados do usuário disparam um evento único
  no navegador; o coordenador de sync na raiz do app agrupa as mudanças
  (debounce) e sincroniza com a nuvem no login ou reconexão. As telas não
  duplicam lógica de sincronização.
- **Segurança do servidor** — operações administrativas usam o cliente
  service role apenas dentro de módulos `*.server.ts`; rotas de usuário
  passam pelo middleware de autenticação com RLS ativa.
- **i18n pt-BR** — o ESLint bloqueia literais em inglês nas telas e obriga o
  uso do utilitário central de formatação de números/datas
  (`scripts/check-i18n.mjs` reforça a auditoria no CI).

Confira `AGENTS.md` para um resumo rápido da arquitetura voltado a
contribuidores (e agentes de código).

## Roadmap

As próximas etapas planejadas estão em [roadmap.md](roadmap.md).

## Licença

Distribuído sob a [Licença MIT](LICENSE).

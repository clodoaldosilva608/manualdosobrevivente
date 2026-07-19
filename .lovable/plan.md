## Diagnóstico do problema do mapa

O mapa aparece em branco (só HUD visível, sem tiles) porque **o CSS do MapLibre GL nunca é importado**. Sem `maplibre-gl.css`, o container `.maplibregl-map` fica sem `position/height` corretos e nenhum tile é pintado, mesmo com os PNGs sendo baixados com sucesso (200 OK). Confirmado via screenshot Playwright e inspeção do `src/components/map/MapShell.tsx` (linha 2 importa só `type maplibregl`, sem o CSS).

## Correções

### 1. Corrigir renderização do mapa

- `src/components/map/MapShell.tsx`: adicionar `import "maplibre-gl/dist/maplibre-gl.css";` no topo do arquivo, ao lado dos outros imports do maplibre. Isso resolve a tela preta e habilita os controles nativos (zoom, escala, geolocalização, atribuição).

### 2. Auditoria final PT-BR (strings remanescentes em inglês)

- `src/lib/error-page.ts`: traduzir a página HTML de fallback SSR:
  - `<title>` → "Esta página não carregou"
  - `<h1>` → "Esta página não carregou"
  - Parágrafo → "Algo deu errado do nosso lado. Você pode tentar atualizar ou voltar para o início."
  - Link "Go home" → "Voltar ao início"
  - Botão de refresh → "Atualizar"
- `src/components/map/MapShell.tsx`:
  - Tooltip do gráfico de elevação: `formatter={(v) => [\`${v} m\`, "Elev"]}` → rótulo `"Elevação"`.
  - `aria-label="Remover"` já em PT; revisar demais tooltips e toasts.
- `src/routes/inventory.tsx`: rótulo do input `"Qtde"` mantido; conferir toasts.
- `src/routes/login.tsx`: mensagem `"Falha"` → `"Falha na autenticação"`.

### 3. Padronização de números, unidades e datas

- `src/lib/geo.ts`: reescrever formatadores para usar `Intl.NumberFormat("pt-BR")`:
  - `formatMeters`: `"1.234,5 m"` / `"12,34 km"`.
  - `formatNauticalMiles`: `"12,34 NM"`.
  - `formatArea`: `"1.234,5 m²"`, `"1,234 ha"`, `"1,234 ac"`.
- `src/components/map/MapShell.tsx`: coordenadas DD já usam ponto (padrão geodésico internacional — manter); rótulo do eixo Y do gráfico de elevação exibindo `${v} m` com locale PT-BR.
- Datas: `toLocaleDateString("pt-BR")` já aplicado em `inventory.tsx`; verificar `manual.$slug.tsx` (não usa datas — OK).

### 4. Teste automatizado de idioma (checklist anti-inglês)

Criar `scripts/check-i18n.mjs` — script Node puro, sem dependências novas — que:

1. Percorre `src/routes/**`, `src/components/**`, `src/lib/manual-content.ts` e `src/lib/error-page.ts`.
2. Extrai literais de string JSX (`>Texto<`), atributos `placeholder=`, `title=`, `aria-label=`, argumentos de `toast.success/error/message(...)` e valores string dentro de `meta`/`head()`.
3. Ignora: nomes técnicos permitidos (allowlist: `MGRS`, `DD`, `DMS`, `GPX`, `KML`, `WMS`, `WMTS`, `SOS`, `GPS`, `HUD`, `TACTICAL/GIS`, `Google`, `E-mail`, unidades `m`, `km`, `ha`, `kg`, `g`, `NM`, `nmi`, `ac`, `m²`, IDs de categoria em inglês usados como chaves internas).
4. Marca como suspeitos tokens que casem `\b(the|and|for|with|save|load|search|weight|expires|download|upload|export|import|layer|waypoint|compass|flashlight|inventory|login|error|success|loading|cancel|confirm|delete|edit|home|about|profile|account|password|submit|send|reset|update|create|remove|category|name|title|description|notes|date|time|today|distance|speed|altitude|elevation|heading|bearing|north|south|east|west|route|track|marker|tools|settings|menu)\b` fora da allowlist.
5. Falha com `process.exit(1)` e lista arquivo:linha:trecho quando encontra suspeitos.
6. Também abre `src/routes/__root.tsx` e valida que existe `lang="pt-BR"` no `<html>` e `og:locale = pt_BR` no head.

Adicionar em `package.json` (`scripts`):

```json
"check:i18n": "node scripts/check-i18n.mjs"
```

Rodar `bun run check:i18n` após as correções e iterar até o script passar.

### 5. Validação SSR de `lang="pt-BR"`

Após o script passar, executar via Playwright em `http://localhost:8080/`:

```js
const html = await page.content();
assert(html.match(/<html[^>]*lang="pt-BR"/));
```

Incorporar essa checagem no mesmo `scripts/check-i18n.mjs` como etapa opcional (se `PLAYWRIGHT=1`), fazendo requisição HTTP a `http://localhost:8080/` com `fetch` e validando por regex no HTML SSR — sem depender do Playwright no CI.

## Fora de escopo desta etapa

- Cache de tiles offline, sincronização em nuvem, bússola nativa (permanecem para uma fase seguinte, conforme já planejado em `.lovable/plan.md`).
- Framework de i18n multilíngue (aplicação continua PT-BR único).

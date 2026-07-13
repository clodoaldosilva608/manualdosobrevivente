## Fase Final — Conclusão + Localização PT-BR

### 1. Localização completa para Português do Brasil

Traduzir 100% da interface, incluindo:
- **Navegação (`AppNav.tsx`):** Mapa, Manual, Mochila, S.O.S, Ajustes
- **Rotas de página:** títulos, subtítulos, descrições, botões, placeholders
  - `index.tsx` (Mapa/HUD): camadas, ferramentas, coordenadas, medição, elevação
  - `manual.tsx` + `manual.$slug.tsx`: "Manual de Sobrevivência", busca, checklist
  - `inventory.tsx`: "Mochila de Emergência", peso, validade, categorias
  - `sos.tsx`: "Central S.O.S", Morse, lanterna, coordenadas para rádio
  - `settings.tsx`: Conta, Dados, Exportar GPX, Sair
  - `login.tsx`: Entrar/Cadastrar, e-mail, senha, Google
  - `__root.tsx`: 404 "Setor não encontrado", erro "Sinal perdido"
- **Conteúdo do manual (`manual-content.ts`):** traduzir todas as entradas em markdown (primeiros socorros, fogo, água, abrigo, nós, navegação) e rótulos de categoria
- **Metadados `<head>`:** title/description/OG em PT-BR
- **Toasts (sonner):** todas as mensagens de sucesso/erro
- **`lang="pt-BR"`** no `<html>` em `__root.tsx`
- **Formatação:** números/datas via `Intl` com locale `pt-BR`

### 2. Conclusão das funcionalidades pendentes

**a) Cache de tiles offline** — completar `offline-tiles.ts`:
- Botão "Baixar área visível" no HUD do mapa
- Service Worker interceptando requisições de tiles → IndexedDB
- Indicador de progresso + gestão de armazenamento em Ajustes (tamanho do cache, limpar)

**b) Sincronização em nuvem** — completar `sync.functions.ts`:
- Server functions `syncWaypoints`, `syncGear`, `syncRoutes` com `requireSupabaseAuth`
- Escrita otimista local (IndexedDB) → push em background quando online
- Pull no login, merge por `updated_at` (last-write-wins)
- Indicador de status de sync no `AppNav` (ícone nuvem: sincronizado / pendente / offline)

**c) Bússola HUD** — finalizar overlay com orientação do dispositivo, azimute (Turf bearing) e declinação magnética (WMM) para waypoint selecionado

**d) Import/Export GPX/KML** — expor no mapa (não só em Ajustes): botão "Importar trilha" que desenha rota + waypoints

**e) Fontes WMS/WMTS customizadas** — UI em Ajustes para adicionar/remover fontes de tiles do usuário, persistido em `custom_tile_sources`

### 3. Correção runtime

Investigar e corrigir `ReferenceError: v is not defined` (provavelmente em código minificado — rastrear via source maps de dev).

### Detalhes técnicos

- Idioma: strings inline traduzidas diretamente (sem i18n framework — app é PT-BR único). Manter chaves de banco/API em inglês.
- Service Worker registrado em `src/routes/__root.tsx` com escopo `/`, apenas em produção.
- Sync usa `navigator.onLine` + evento `online` para disparar flush da fila.
- Bússola só ativa após permissão `DeviceOrientationEvent.requestPermission()` (iOS).

### Fora de escopo

- Framework de i18n multilíngue (só PT-BR)
- Tradução de logs de console/erros técnicos

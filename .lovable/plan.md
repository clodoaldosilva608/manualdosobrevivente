# Correções e novas telas: Manual, Ajustes, Bússola 3D, Mapa e Offline

## 1. Manual não abre os tópicos (causa confirmada)

A página do Manual é hoje ao mesmo tempo a lista e a "página-mãe" dos tópicos, mas ela não abre espaço para o conteúdo do tópico. Por isso o clique muda o endereço e nada aparece.

Correção: separar a lista de assuntos da página-mãe, para que cada tópico abra normalmente com título, aviso de segurança, conteúdo completo, checklist e foto ilustrativa.

## 2. Aba Ajustes

Refazer a tela com seções claras, todas funcionando em celular:

- Conta: e-mail, entrar/sair, estado em tempo real.
- Preferências: unidades (métrico/náutico), formato de coordenada padrão (DD/DMS/MGRS), norte verdadeiro ou magnético — salvos no aparelho e usados no mapa e na bússola.
- Dados no aparelho: contagem de waypoints, itens da mochila, tópicos baixados e espaço usado pelos mapas offline.
- Exportar/importar: GPX e KML de waypoints, e um arquivo único de backup (waypoints + mochila + checklist).
- Nuvem: botões "Enviar para a nuvem" e "Trazer da nuvem", com data da última sincronização.
- Limpeza: apagar mapas offline e apagar dados locais, com confirmação.

## 3. Bússola 3D na aba do mapa

Evoluir a rosa dos ventos atual para uma bússola com aparência tridimensional:

- Disco com inclinação em perspectiva, profundidade, sombra e brilho de vidro.
- Ponteiro girando em tempo real pelo sensor do aparelho, com movimento suavizado (sem tremer).
- Sol, lua, estrelas-guia e direção do litoral posicionados no aro, com animação suave ao mudar de posição.
- Céu do disco muda entre dia, crepúsculo e noite; estrelas piscam suavemente à noite.
- Informações na tela: rumo, norte verdadeiro/magnético, declinação, temperatura, hemisfério, nascer/pôr do sol, fase da lua, litoral mais próximo e rumo até o waypoint mais próximo.
- Toque e arraste continuam funcionando quando não há sensor; respeita "reduzir animações".

## 4. Mapa: início na localização e marcação fixa

- Ao abrir, pedir a localização e centralizar nela (com aviso claro se o usuário negar).
- Marcação fixa da posição atual, com precisão e um cartão mostrando latitude, longitude e altitude atual.
- Botão "Voltar ao último local" que retorna à posição salva anteriormente, e botão de recentralizar na posição atual.

## 5. Tela de Downloads offline

Nova aba "Offline" com duas partes:

- Mapas: escolher a área visível no mapa, definir zoom mínimo/máximo, ver estimativa de tamanho e baixar com barra de progresso; lista de áreas baixadas com tamanho e opção de apagar.
- Manual: baixar todos os tópicos e imagens para leitura sem internet, com indicação de quais já estão salvos e opção de remover.

## 6. Sincronização com a nuvem

- Enviar e trazer waypoints, itens da mochila e checklist do manual.
- Junção por data de alteração (o mais recente vence), sem duplicar itens.
- Envio automático ao voltar a ter internet, com aviso discreto de sucesso ou falha.
- Sem login, tudo continua funcionando só no aparelho, com convite para entrar.

## 7. Revisão em tela de celular

Percorrer Ajustes, SOS e todos os tópicos do Manual em largura de celular e conferir legibilidade do painel de compartilhamento e da bússola, corrigindo textos cortados, botões pequenos e sobreposições.

## Detalhes técnicos

- Rotas: criar `src/routes/manual.index.tsx` com a lista; `src/routes/manual.tsx` vira layout que renderiza `<Outlet />`. Nova rota `src/routes/offline.tsx` + item em `AppNav`.
- Preferências em IndexedDB (`settings` store de `src/lib/db.ts`) via um hook `usePreferences`.
- Bússola: reescrever `CompassRose` como `Compass3D` em SVG com transform 3D/CSS, `requestAnimationFrame` + filtro de suavização do heading, reutilizando `celestial.ts`, `coast.ts`, `weather.functions.ts` e `declination.ts`.
- Mapa: geolocalização com `watchPosition`, marcador de posição + círculo de precisão, altitude via `elevation.functions.ts` (fallback para a altitude do GPS), último local salvo em `settings`.
- Offline: reutilizar `src/lib/offline-tiles.ts` (`tileCountForBbox`, `downloadAreaTiles`, `listAreas`, `deleteArea`); cache do manual em nova store `manual_assets` (bump da versão do IndexedDB para 2).
- Nuvem: estender `src/lib/sync.functions.ts` com checklist (nova tabela `checklist_state` com RLS por dono e GRANTs) e funções `pushAll`/`pullAll` usando `requireSupabaseAuth`.
- Testes: teste de rota do manual (`/manual/<slug>` renderiza o conteúdo), teste de responsividade em 384px para Ajustes/SOS/bússola, e `bun run check:i18n` mantido no CI.

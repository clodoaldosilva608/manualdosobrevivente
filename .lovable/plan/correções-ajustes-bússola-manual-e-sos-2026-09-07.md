# Correções: Ajustes, Bússola, Manual e SOS

## 1. Aba "Ajustes"

Hoje a tela de Ajustes tem apenas duas caixas (conta e exportar GPX) e um erro de execução que aparece na pré-visualização ("v is not defined") pode derrubar a interação. O que será feito:

- Corrigir o erro de execução que está quebrando a navegação/interatividade.
- Evitar a saída inesperada da conta: a tela passa a acompanhar o estado de login em tempo real, em vez de consultar uma única vez.
- Completar a tela com o que ela promete: preferências de unidades e formato de coordenada (DD/DMS/MGRS), tema/brilho tático, exportar e importar (GPX/KML), limpar mapas salvos para uso sem internet, e sincronizar com a conta.

## 2. Bússola com cara de bússola de verdade

Substituir o disco atual por uma rosa dos ventos completa e responsiva:

- Anel graduado com marcas a cada 2°, marcas maiores a cada 10° e números a cada 30°, 16 pontas cardeais, mira/linha de fé e agulha vermelha/branca com brilho.
- Painel de informações ao redor da bússola:
  - Rumo verdadeiro e magnético, com a declinação local.
  - Temperatura e condição do tempo do ponto atual.
  - Dia/noite com horário do nascer e pôr do sol e do crepúsculo.
  - Hemisfério (norte/sul) e latitude/longitude.
  - Direção e distância aproximada até o mar/costa mais próxima.
  - Azimute do sol e da lua (com fase), e referência de estrela: Polaris no hemisfério norte, Cruzeiro do Sul no hemisfério sul, mostrando para onde apontar.
- Tudo funciona com o sensor do aparelho quando disponível e continua arrastável e clicável com o dedo.

## 3. Manual: conteúdo completo com imagens

- Revisar todos os tópicos para que cada um abra com o texto integral (hoje alguns entram com conteúdo curto ou não abrem corretamente).
- Ampliar o conteúdo de cada tópico com passo a passo, avisos de segurança e a lista de verificação.
- Gerar uma imagem ilustrativa para cada tópico (feridas, hipotermia, fogo, água, abrigo, nós, navegação), exibida no topo do verbete e como miniatura na lista.
- Nós e abrigos ganham ilustrações de sequência (diagramas) para acompanhar os passos.

## 4. SOS: compartilhar com escolha de destino

Ao tocar em "Compartilhar" abre um painel com opções diretas:

- WhatsApp, Telegram, SMS, E-mail
- Facebook e X
- Abrir/enviar a posição no Google Maps
- Copiar texto e usar o compartilhamento nativo do celular quando existir

Todas as opções levam as coordenadas em DD, DMS e MGRS mais o link do mapa.

## Detalhes técnicos

- Erro de execução: rastrear a referência `v` (provável efeito de minificação sobre `manual.$slug`/`db`), corrigir a origem e cobrir com teste.
- Bússola: novo componente `CompassRose` (SVG + CSS 3D) em `src/components/map/`; efemérides (sol/lua/fase/crepúsculo) calculadas localmente com `suncalc`; temperatura via Open-Meteo por função de servidor já existente; direção da costa por rumo até o ponto de litoral mais próximo de uma tabela local de referência (sem chamada externa nova).
- Manual: estender `ManualEntry` com `image` e `figures`; imagens geradas em `src/assets/manual/` e importadas como módulos.
- SOS: novo `ShareSheet` com `intents` (`https://wa.me/?text=`, `mailto:`, `sms:`, `t.me/share`, `google.com/maps/search/?api=1&query=lat,lng`), mantendo `navigator.share` e a cópia manual como reserva.
- Ajustes: preferências persistidas no IndexedDB (`src/lib/db.ts`) e sessão observada por `supabase.auth.onAuthStateChange`.
- Textos novos em pt-BR, formatação via `src/lib/format.ts`, e `bun run check:i18n` + testes no fim.

# Bússola flutuante sobre o mapa

Hoje a bússola abre num painel que cobre a tela e esconde o mapa. Ela passa a viver por cima do mapa, em três tamanhos.

## Como vai funcionar

1. **Miniatura (padrão)**: um disco pequeno no canto inferior direito, sempre visível, com a rosa dos ventos girando em tempo real e o rumo em números. O mapa continua totalmente utilizável.
2. **Ao tocar na miniatura**: ela cresce para um painel médio (cerca de 60% da largura em celular, canto inferior direito no desktop), com a bússola utilizável, nível de bolha, sol/lua/vento resumidos — e o mapa continua visível atrás.
3. **Botão "Tela cheia"** dentro do painel médio: abre a bússola completa, com todos os dados atuais (temperatura, dia/noite, hemisfério, litoral, sol, lua, estrelas, nível do mar, vento).
4. Botões de recolher (voltar ao tamanho médio) e minimizar (voltar à miniatura) em cada estado.

A miniatura pode ser arrastada? Não nesta etapa — posição fixa no canto inferior direito, acima da barra de navegação para não cobrir os controles existentes.

## Detalhes técnicos

- `MapShell.tsx`: remover a bússola do `Sheet` e criar um overlay posicionado (`absolute` sobre o mapa) com estado `compassMode: "mini" | "panel" | "full"`, persistido em `localStorage`.
- O botão "Bússola" da barra lateral direita passa a alternar entre miniatura e painel.
- `CompassRose.tsx`: aceitar uma prop `variant` (`mini` | `panel` | `full`) que controla tamanho da rosa e quais blocos de informação são exibidos; a lógica de heading, celestial, vento e mar permanece igual.
- Modo `full` renderiza em camada fixa sobre o mapa com fundo semitransparente, mantendo o mapa parcialmente perceptível.
- Ponteiro e animações continuam em tempo real nos três modos; respeitar `prefers-reduced-motion`.
- Ajustar z-index para não conflitar com HUD de posição, perfil de elevação e barra inferior.
- Rodar verificação de tipos, lint/i18n e conferência em tela móvel.

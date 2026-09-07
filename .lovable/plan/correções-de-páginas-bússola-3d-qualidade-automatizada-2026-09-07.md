# Correções de páginas + bússola 3D + qualidade automatizada

## O que verifiquei antes deste plano

- Todas as rotas (`/`, `/settings`, `/manual`, `/manual/fire-starting`, `/sos`) respondem 200 no servidor e já vêm com `lang="pt-BR"`.
- No navegador em modo de desenvolvimento (tela 390 px) as páginas Ajustes, Manual e SOS carregam **sem erro** e o clique em "Fazer Fogo (Condições Úmidas)" navega corretamente.
- O registro de erros do preview publicado mostra `ReferenceError: v is not defined` — um erro que só ocorre na versão compilada/minificada. É a causa mais provável de "nada funciona ao clicar": a página trava logo após carregar e todos os botões (Ajustes, compartilhar no SOS, itens do Manual) param de responder. **Diagnóstico ainda não confirmado** — confirmar é o primeiro passo.
- O mapa hoje sempre abre em Brasília (coordenada fixa) e o painel "Bússola" existe, mas é um painel simples, sem bússola 3D.

## 1. Confirmar e corrigir o travamento da versão publicada

- Gerar uma compilação de produção e abri-la em navegador real, reproduzindo `v is not defined` com o rastreamento de origem ativado para identificar o trecho responsável (suspeitas iniciais: gráfico de elevação/recharts e a importação dinâmica do mapa).
- Corrigir a causa encontrada e revalidar Ajustes, SOS e Manual na versão compilada.

## 2. SOS — compartilhamento

- Tornar o compartilhamento resistente a falhas: usar o compartilhamento nativo quando disponível, cair para cópia na área de transferência e, se ambos falharem, mostrar o texto selecionável em uma caixa com aviso claro.
- Manter o botão sempre acionável mesmo sem GPS: compartilhar o que houver e avisar que a posição ainda não foi obtida.

## 3. Mapa — abrir na localização do usuário

- Ao abrir o mapa, pedir a posição do aparelho e centralizar nela (zoom ~14). Se o usuário negar ou a posição demorar, manter Brasília como reserva, sem travar a tela.
- Guardar a última posição conhecida para abrir mais rápido nas próximas vezes.

## 4. Bússola 3D na aba "Bússola"

- Nova peça visual: rosa dos ventos em 3D (CSS 3D com leve inclinação e sombra), girando de forma suave conforme a direção do aparelho/mapa.
- Interativa: arrastar/tocar gira a bússola e ajusta a rotação do mapa; tocar no centro volta ao norte; toque duplo alterna entre norte magnético e norte verdadeiro (já existe cálculo de declinação no projeto).
- Totalmente responsiva (dimensiona pelo menor lado disponível), com leitura numérica de rumo, cardeais em português e desativação da animação quando o sistema pede menos movimento.

## 5. Manual — garantir abertura de todos os verbetes

- Após a correção do item 1, validar por teste automatizado a abertura dos sete verbetes (feridas, hipotermia, fogo, água, lona, nós, navegação), incluindo o carregamento do texto e do checklist.

## 6. Utilitário único de formatação pt-BR

- Criar `src/lib/format.ts` como fonte única para: datas e horas, números, distâncias (m/km), náuticas, áreas (m²/ha/ac), pesos (g/kg), coordenadas e porcentagens — tudo com `Intl` em `pt-BR`.
- Migrar mapa, mochila, SOS, ajustes e manual para usar apenas esse utilitário; `src/lib/geo.ts` passa a delegar para ele.
- Regra de lint que proíbe `toLocaleString`/`toFixed` diretos em telas, obrigando o utilitário.

## 7. Verificações automáticas antes de compilar

- Regra ESLint própria (`no-english-literals`) que detecta textos visíveis em inglês em JSX, `placeholder`, `aria-label`, `title` e toasts, reaproveitando a lista de exceções já usada no script atual.
- `bun run build` passa a executar antes: `lint` + `check:i18n`, bloqueando a compilação em caso de falha.

## 8. Testes automatizados

- Instalar Vitest + Playwright como dependências de desenvolvimento.
- **Responsividade do mapa**: teste que abre o mapa em 390x800, 768x1024 e 1440x900, verifica que a tela do mapa ocupa o espaço disponível (sem sobrar faixa preta), que a barra inferior não cobre os controles, e que após redimensionar a janela o mapa se reajusta.
- **E2E de SSR**: teste que busca o HTML de `/` e `/login` direto do servidor e confirma `lang="pt-BR"`, `og:locale=pt_BR` e ausência de palavras em inglês no texto visível; e uma passagem em navegador que percorre mapa, manual, mochila, SOS, ajustes e login capturando qualquer erro de execução.
- Scripts: `test`, `test:e2e`, e `check:all` (lint + i18n + testes).

## 9. CI bloqueando merges

- Adicionar workflow do GitHub Actions (`.github/workflows/ci.yml`) rodando em cada pull request: instala dependências com bun, executa `bun run lint`, `bun run check:i18n`, `bun run test`, `bun run test:e2e` e `bun run build`.
- Instruções curtas no `README` para marcar o job como obrigatório na proteção de branch (isso é ajuste no GitHub, feito por você).

## Detalhes técnicos

- Bússola: componente `src/components/map/Compass3D.tsx`, `transform: perspective() rotateX() rotateZ()`, `DeviceOrientationEvent` com pedido de permissão no iOS, sincronizado com `map.getBearing()`/`map.rotateTo()`.
- Geolocalização inicial: `navigator.geolocation.getCurrentPosition` em efeito no cliente, com tempo limite de 5 s e `map.jumpTo` para não brigar com interação do usuário.
- Testes de responsividade e E2E via Playwright contra o servidor de desenvolvimento local; sem dependência de conta autenticada.

## Fora de escopo

- Cache de tiles offline e sincronização em nuvem (fase seguinte).
- Suporte a outros idiomas.

export interface ManualEntry {
  slug: string;
  title: string;
  category: "first-aid" | "fire" | "water" | "shelter" | "knots" | "navigation";
  summary: string;
  body: string;
  checklist?: string[];
}

export const MANUAL: ManualEntry[] = [
  {
    slug: "wound-care",
    title: "Cuidados com Feridas e Controle de Sangramento",
    category: "first-aid",
    summary: "Estanque sangramentos rapidamente e proteja contra infecção em campo.",
    body: `## Prioridades

1. **Pressão direta** — aplique pressão firme e constante com o pano mais limpo disponível.
2. **Elevação** do membro acima do nível do coração, quando possível.
3. **Curativo compressivo** — enrole com firmeza; verifique o pulso após a ferida.
4. **Torniquete** — apenas para hemorragia grave de membro que você não conseguir controlar de outra forma. Anote o horário no dispositivo.

## Limpeza

- Irrigue com água potável limpa por pelo menos 1–2 minutos.
- Remova detritos visíveis; não esfregue tecido muscular.
- Cubra com curativo estéril e não aderente.

## Sinais de Infecção

Vermelhidão, inchaço, calor, pus, febre, estrias vermelhas. Busque evacuação.`,
    checklist: [
      "Pressão aplicada",
      "Ferida irrigada",
      "Curativo fixado",
      "Pulso abaixo da ferida verificado",
      "Horário do torniquete anotado (se usado)",
    ],
  },
  {
    slug: "hypothermia",
    title: "Resposta à Hipotermia",
    category: "first-aid",
    summary: "Reconheça e reaqueça uma vítima com frio sem piorar o quadro.",
    body: `## Estágios

- **Leve**: tremores, desajeitado, fala arrastada.
- **Moderado**: tremores intensos param, confuso, sonolento.
- **Grave**: rígido, pulso fraco, pode parecer sem vida — manuseie com delicadeza.

## Ações

1. Saia do vento e do molhado.
2. Retire roupas molhadas; isole do solo.
3. Cubra cabeça e pescoço. Use uma barreira de vapor dentro de uma camada isolante (o *envelope de hipotermia*).
4. Ofereça líquidos açucarados quentes apenas se a vítima estiver alerta.
5. **Não** esfregue os membros nem ofereça álcool.`,
    checklist: [
      "Vítima abrigada",
      "Roupas molhadas removidas",
      "Isolamento do solo",
      "Cabeça e pescoço cobertos",
      "Líquidos quentes oferecidos (se alerta)",
    ],
  },
  {
    slug: "fire-starting",
    title: "Fazer Fogo (Condições Úmidas)",
    category: "fire",
    summary: "Consiga chama mesmo quando tudo está encharcado.",
    body: `## Fontes de Isca

- Casca interna de bétula/cedro morto em pé
- Lascas resinosas / fatwood
- Pano carbonizado, felpa de secadora, algodão com vaselina

## Monte a Fogueira

1. Plataforma de gravetos secos para manter a isca fora do solo molhado.
2. Sequência: fino como grafite → lápis → dedo → punho.
3. Acenda a isca por baixo; alimente devagar.
4. Não sufoque — o fogo precisa de oxigênio entre os gravetos.

## Ferro Rod

Segure a haste firme e puxe o raspador em sua direção. Direcione as faíscas para o feixe de isca, não para o vento.`,
    checklist: [
      "Plataforma seca montada",
      "Isca preparada",
      "Sequência de gravetos separada",
      "Anteparo contra o vento instalado",
      "Ignição reserva testada",
    ],
  },
  {
    slug: "water-purification",
    title: "Purificação de Água",
    category: "water",
    summary: "Torne segura a água encontrada em campo.",
    body: `## Hierarquia de Métodos (melhor → pior)

1. **Fervura** — fervura vigorosa por 1 minuto (3 min acima de 2000 m). Elimina tudo o que é biológico.
2. **Filtragem** — filtro de 0,2 mícron remove bactérias e protozoários. Adicione produto químico contra vírus.
3. **Químico** — pastilhas de dióxido de cloro, 30 min de espera (4 h para *Cryptosporidium*).
4. **UV** — apenas água transparente. Agite durante a exposição.

## Pré-filtragem

Coe com uma bandana ou filtro de papel para remover sedimentos — o filtro ou a fervura funcionam melhor em água limpa.`,
    checklist: [
      "Água pré-filtrada",
      "Método de tratamento escolhido",
      "Tempo de espera cumprido",
      "Recipiente esterilizado",
    ],
  },
  {
    slug: "tarp-shelter",
    title: "Abrigos com Lona",
    category: "shelter",
    summary: "Configurações rápidas a partir de uma única lona.",
    body: `## A-Frame (Cumeeira)

Corda-guia entre duas árvores, lona por cima, cantos estacados baixos. Melhor para qualquer clima.

## Meia-água (Lean-To)

Uma borda alta, borda oposta estacada ao chão. Face aberta contrária ao vento, voltada para o fogo.

## Ponta de Arado (Plow Point)

Um único ponto alto, três cantos estacados. Mais rápida em terreno aberto.

## Escolha do Local

- Acima da linha de cheia, fora de trilhas de animais.
- Longe de árvores mortas em pé (*viúvas*).
- Anteparo contra vento; água a até 5 min de caminhada.`,
    checklist: [
      "Local sem riscos",
      "Cumeeira esticada",
      "Cantos estacados",
      "Vala de drenagem cavada (se molhado)",
    ],
  },
  {
    slug: "core-knots",
    title: "Cinco Nós Essenciais",
    category: "knots",
    summary: "Se aprender só cinco, aprenda estes.",
    body: `## Lais-de-guia (Bowline)

O "rei dos nós". Alça fixa que não desliza nem prende. *O coelho sai do buraco, dá a volta na árvore e volta pra dentro.*

## Volta do Fiel Ajustável (Taut-Line Hitch)

Nó ajustável para tensores de barraca.

## Volta do Fiel (Clove Hitch)

Fixação rápida em poste ou galho. Fácil de ajustar; reforce com meia-volta.

## Volta do Caminhoneiro (Trucker's Hitch)

Sistema com vantagem mecânica para tensionar cumeeiras e cargas.

## Nó Direito (Square Knot)

Une duas cordas de mesmo diâmetro — para curativos e amarrados, *não* para cargas de vida.`,
    checklist: [
      "Lais-de-guia (praticar 5x)",
      "Volta do fiel ajustável (praticar 5x)",
      "Volta do fiel (praticar 5x)",
      "Volta do caminhoneiro (praticar 5x)",
      "Nó direito (praticar 5x)",
    ],
  },
  {
    slug: "land-navigation",
    title: "Fundamentos de Navegação Terrestre",
    category: "navigation",
    summary: "Mapa, bússola e associação com o terreno.",
    body: `## Orientar o Mapa

Coloque plano. Alinhe a seta do norte magnético da bússola com a referência de norte magnético do mapa (some ou subtraia a declinação em mapas de norte verdadeiro).

## Associação com o Terreno

Combine o que vê no mapa com o que vê no chão: cristas, drenagens, colos, morros. Ande por *linhas-guia* (feições lineares) e *feições de contenção* (avisam que você passou do ponto).

## Contagem de Passos

Saiba sua contagem para 100 m em terreno plano, em subida e em vegetação densa. Registre com contas de ranger.

## Contra-azimute

Se você tirou um azimute até um ponto, pode voltar pelo azimute ± 180°.`,
    checklist: [
      "Mapa orientado ao norte",
      "Declinação aplicada",
      "Contagem de passos definida",
      "Azimute registrado",
      "Contra-azimute anotado",
    ],
  },
];

export const MANUAL_BY_CATEGORY = MANUAL.reduce<Record<string, ManualEntry[]>>((acc, e) => {
  (acc[e.category] = acc[e.category] || []).push(e);
  return acc;
}, {});

export const CATEGORY_LABELS: Record<ManualEntry["category"], string> = {
  "first-aid": "Primeiros Socorros",
  fire: "Fogo",
  water: "Água",
  shelter: "Abrigo",
  knots: "Nós",
  navigation: "Navegação",
};

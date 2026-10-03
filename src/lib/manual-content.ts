import woundCareImg from "@/assets/manual/wound-care.jpg";
import hypothermiaImg from "@/assets/manual/hypothermia.jpg";
import fireStartingImg from "@/assets/manual/fire-starting.jpg";
import waterImg from "@/assets/manual/water-purification.jpg";
import tarpImg from "@/assets/manual/tarp-shelter.jpg";
import knotsImg from "@/assets/manual/core-knots.jpg";
import navigationImg from "@/assets/manual/land-navigation.jpg";

export interface ManualEntry {
  slug: string;
  title: string;
  category: "first-aid" | "fire" | "water" | "shelter" | "knots" | "navigation";
  summary: string;
  image: string;
  imageAlt: string;
  body: string;
  checklist?: string[];
}

export const MANUAL: ManualEntry[] = [
  {
    slug: "wound-care",
    title: "Cuidados com Feridas e Controle de Sangramento",
    category: "first-aid",
    summary: "Estanque sangramentos rapidamente e proteja contra infecção em campo.",
    image: woundCareImg,
    imageAlt: "Curativo compressivo sendo aplicado em um ferimento no antebraço em campo",
    body: `## Prioridades imediatas

1. **Segurança da cena** — avalie riscos antes de se aproximar. Use luvas ou saco plástico como barreira.
2. **Pressão direta** — pressão firme e contínua por 5 a 10 minutos com o pano mais limpo disponível. Não espie a cada 30 segundos.
3. **Elevação** do membro acima do nível do coração, quando não houver suspeita de fratura.
4. **Curativo compressivo** — enrole com firmeza sobre a compressa; confira o pulso, a cor e a temperatura abaixo da ferida.
5. **Torniquete** — apenas para hemorragia grave de membro que não cede. Aplique de 5 a 7 cm acima da lesão, aperte até o sangramento parar e **anote o horário**. Nunca afrouxe em campo.

## Limpeza e curativo

- Irrigue com água potável sob pressão (garrafa com furo na tampa) por 1 a 2 minutos.
- Remova detritos visíveis com pinça; não esfregue tecido muscular exposto.
- Cubra com curativo estéril não aderente e fixe com bandagem.
- Troque o curativo a cada 24 horas ou quando saturar.

## Ferimentos especiais

- **Objeto encravado**: não remova. Estabilize ao redor e evacue.
- **Ferimento no tórax com sopro de ar**: cubra com plástico selado em três lados.
- **Amputação**: torniquete, envolva a parte amputada em pano limpo e mantenha refrigerada, sem contato direto com gelo.

## Sinais de infecção

Vermelhidão em expansão, inchaço, calor, pus, febre e estrias vermelhas subindo o membro. Evacue imediatamente.

> **Atenção**: qualquer mordida de animal, ferida perfurante profunda ou corte com mais de 2 cm de profundidade exige avaliação médica e reforço antitetânico.`,
    checklist: [
      "Cena segura e barreira de proteção usada",
      "Pressão direta aplicada por 5–10 min",
      "Ferida irrigada com água limpa",
      "Curativo estéril fixado",
      "Pulso e cor abaixo da ferida verificados",
      "Horário do torniquete anotado (se usado)",
    ],
  },
  {
    slug: "hypothermia",
    title: "Resposta à Hipotermia",
    category: "first-aid",
    summary: "Reconheça e reaqueça uma vítima com frio sem piorar o quadro.",
    image: hypothermiaImg,
    imageAlt: "Vítima de hipotermia envolvida em manta térmica dentro de um abrigo",
    body: `## Estágios

- **Leve (35–32 °C)**: tremores intensos, desajeitado, fala arrastada, irritação.
- **Moderada (32–28 °C)**: os tremores cessam, confusão, sonolência, apatia.
- **Grave (< 28 °C)**: rigidez muscular, pulso fraco e lento, pode parecer sem vida. Manuseie com extrema delicadeza — movimentos bruscos podem provocar parada cardíaca.

## Ações no campo

1. Tire a vítima do vento, da chuva e do contato com o solo.
2. Remova toda roupa molhada, cortando-a se necessário.
3. Monte o **envelope de hipotermia**: barreira de vapor (plástico) → isolante seco (saco de dormir, roupas) → barreira externa impermeável.
4. Cubra cabeça e pescoço; eles respondem por grande perda de calor.
5. Calor externo suave no tronco: garrafas mornas nas axilas, virilha e sobre o peito — nunca fervendo.
6. Ofereça líquidos açucarados quentes **apenas** se a vítima estiver plenamente alerta e engolindo bem.

## Nunca faça

- Não esfregue braços e pernas (empurra sangue frio ao centro).
- Não ofereça álcool nem cafeína.
- Não coloque a vítima grave de pé nem a faça caminhar.

## Prevenção

Mantenha-se seco, coma com frequência, use camadas e troque as meias ao fim do dia. Em grupo, verifique uns aos outros a cada hora quando estiver frio e úmido.`,
    checklist: [
      "Vítima abrigada do vento e da chuva",
      "Roupas molhadas removidas",
      "Isolamento do solo instalado",
      "Envelope de hipotermia montado",
      "Cabeça e pescoço cobertos",
      "Líquidos quentes oferecidos (se alerta)",
    ],
  },
  {
    slug: "fire-starting",
    title: "Fazer Fogo (Condições Úmidas)",
    category: "fire",
    summary: "Consiga chama mesmo quando tudo está encharcado.",
    image: fireStartingImg,
    imageAlt: "Faísca de ferro rod acendendo feixe de isca sob floresta úmida",
    body: `## Fontes de isca que funcionam molhadas

- Casca interna de bétula, cedro ou de árvore morta em pé.
- Lascas resinosas (*fatwood*) do centro de tocos de pinheiro.
- Pano carbonizado, felpa de secadora, algodão com vaselina, palha de aço fina.
- Ninhos de aves abandonados e capim seco protegido sob rochas.

## Preparo do combustível

1. **Plataforma seca** de gravetos grossos para isolar a isca do solo molhado.
2. Rache galhos mortos: o interior está seco mesmo com a casca encharcada.
3. Separe em quatro classes: fino como grafite → lápis → dedo → punho.
4. Tenha **três vezes** mais combustível fino do que você acha necessário antes de acender.

## Ignição

1. Monte o feixe de isca em forma de ninho e coloque-o na plataforma.
2. Segure o ferro rod firme e **puxe o raspador em sua direção**, com faíscas dirigidas ao centro do ninho.
3. Sopre longa e suavemente na base assim que houver brasa.
4. Alimente devagar, do fino ao grosso, mantendo espaço entre as peças — o fogo precisa de oxigênio.

## Formatos de fogueira

- **Teepee**: pega rápido, boa para acender.
- **Log cabin**: chama estável, boa para cozinhar.
- **Fogo em vala**: protege do vento e reduz a assinatura visual.
- **Fogo longo (nodding fire)**: aquece um abrigo de meia-água a noite inteira.

> **Segurança**: limpe 1 m ao redor até o solo mineral, tenha água por perto e nunca faça fogo dentro de abrigo fechado sem ventilação.`,
    checklist: [
      "Plataforma seca montada",
      "Isca preparada em ninho",
      "Quatro classes de gravetos separadas",
      "Anteparo contra o vento instalado",
      "Ignição reserva testada",
      "Área limpa e água de segurança por perto",
    ],
  },
  {
    slug: "water-purification",
    title: "Purificação de Água",
    category: "water",
    summary: "Torne segura a água encontrada em campo.",
    image: waterImg,
    imageAlt: "Água fervendo em caneca metálica ao lado de filtro e pastilhas junto a um riacho",
    body: `## Escolha da fonte

Prefira água corrente e nascentes acima de áreas de pasto e habitação. Evite poças paradas, água com espuma ou cheiro forte e trechos abaixo de mineração.

## Hierarquia de métodos (melhor → pior)

1. **Fervura** — fervura vigorosa por 1 minuto (3 minutos acima de 2000 m). Elimina todos os patógenos biológicos.
2. **Filtragem** — filtro de 0,2 mícron elimina bactérias e protozoários. Combine com químico para cobrir vírus.
3. **Químico** — dióxido de cloro: 30 minutos de espera (4 horas para *Cryptosporidium*). Água fria exige o dobro do tempo.
4. **UV** — só funciona em água transparente. Agite o recipiente durante a exposição.
5. **Solar (SODIS)** — garrafa PET transparente deitada ao sol pleno por 6 horas (2 dias se nublado). Último recurso.

## Pré-filtragem

Coe com bandana, meia ou filtro de papel e deixe decantar. Filtro e químico funcionam muito melhor em água limpa.

## Depois de tratar

- Esterilize a rosca e o bico do recipiente com um pouco da água já tratada.
- Marque garrafas tratadas e não tratadas para não confundi-las.
- Consumo mínimo: 3 a 4 litros por dia em atividade moderada.

> **Aviso**: fervura e filtro não removem contaminação química ou metais pesados. Nesses casos, mude de fonte.`,
    checklist: [
      "Fonte avaliada e escolhida",
      "Água pré-filtrada e decantada",
      "Método de tratamento aplicado",
      "Tempo de espera cumprido",
      "Bico e rosca do recipiente esterilizados",
      "Recipientes tratados marcados",
    ],
  },
  {
    slug: "tarp-shelter",
    title: "Abrigos com Lona",
    category: "shelter",
    summary: "Configurações rápidas a partir de uma única lona.",
    image: tarpImg,
    imageAlt: "Lona verde-oliva montada em A-frame entre árvores com fogueira à frente",
    body: `## Escolha do local (antes de montar)

- Acima da linha de cheia e fora de leitos secos de drenagem.
- Longe de árvores mortas em pé e galhos suspensos (*viúvas*).
- Fora de trilhas de animais e formigueiros.
- Terreno levemente inclinado, com anteparo natural contra o vento e água a até 5 minutos.

## A-frame (cumeeira)

Corda-guia esticada entre duas árvores, lona por cima, quatro cantos estacados baixos. Melhor proteção geral em chuva e vento.

## Meia-água (lean-to)

Uma borda alta amarrada na cumeeira, borda oposta estacada ao solo. Face aberta contra o vento e voltada para o fogo — o melhor abrigo para aquecer.

## Ponta de arado (plow point)

Um único ponto alto amarrado a uma árvore e três cantos estacados. É a montagem mais rápida em terreno aberto e com poucos apoios.

## Detalhes que fazem diferença

- Tensione a cumeeira com a volta do caminhoneiro.
- Faça o beiral avançar sobre a entrada para a chuva não entrar.
- Cave uma pequena vala de drenagem no perímetro em solo encharcado.
- Isole o chão com 20 cm de galhos, folhas secas ou capim — o frio vem de baixo.`,
    checklist: [
      "Local sem riscos verificado",
      "Cumeeira esticada e tensionada",
      "Cantos estacados e alinhados",
      "Face aberta protegida do vento",
      "Vala de drenagem cavada (se molhado)",
      "Cama isolante de 20 cm montada",
    ],
  },
  {
    slug: "core-knots",
    title: "Cinco Nós Essenciais",
    category: "knots",
    summary: "Se aprender só cinco, aprenda estes.",
    image: knotsImg,
    imageAlt: "Cinco nós de sobrevivência atados em cordinha laranja sobre ardósia escura",
    body: `## 1. Lais-de-guia (bowline)

Alça fixa que não corre nem aperta sob carga e desata mesmo depois de tensionada. Memorize: *o coelho sai do buraco, contorna a árvore e volta para o buraco*. Uso: resgatar, prender carga, amarrar em torno do corpo.

## 2. Volta do fiel ajustável (taut-line hitch)

Nó corrediço que segura sob tensão e desliza quando aliviado. Uso: tensores de barraca e lona, ajustar a altura da cumeeira.

## 3. Volta do fiel (clove hitch)

Fixação rápida em poste, galho ou estaca. Fácil de ajustar e desfazer; reforce com uma meia-volta quando a carga for constante.

## 4. Volta do caminhoneiro (trucker's hitch)

Sistema com vantagem mecânica de aproximadamente 3:1. Uso: esticar cumeeira, prender carga na mochila ou no veículo.

## 5. Nó direito (square knot)

Une duas cordas de mesmo diâmetro. Uso: amarrados e curativos — **nunca** para carga de vida ou emenda sob tensão (use o nó de escota para diâmetros diferentes).

## Treino

Pratique cada nó cinco vezes por dia durante uma semana, depois de olhos fechados e com luvas. Nó que você não faz no escuro não é nó que você tem.`,
    checklist: [
      "Lais-de-guia (praticar 5x)",
      "Volta do fiel ajustável (praticar 5x)",
      "Volta do fiel (praticar 5x)",
      "Volta do caminhoneiro (praticar 5x)",
      "Nó direito (praticar 5x)",
      "Repetir a série de olhos fechados",
    ],
  },
  {
    slug: "land-navigation",
    title: "Fundamentos de Navegação Terrestre",
    category: "navigation",
    summary: "Mapa, bússola e associação com o terreno.",
    image: navigationImg,
    imageAlt: "Mapa topográfico, bússola e lanterna sobre o solo com cordilheira ao fundo",
    body: `## Orientar o mapa

Coloque o mapa plano, longe de metal e eletrônicos. Alinhe a seta de norte magnético da bússola com a referência do mapa, somando ou subtraindo a declinação em cartas de norte verdadeiro.

## Associação com o terreno

Compare o que o mapa mostra com o que você vê: cristas, drenagens, colos e morros. Navegue por **linhas-guia** (estradas, rios, cercas) e defina **feições de contenção** que avisam quando você passou do ponto.

## Tirar e seguir um azimute

1. Aponte a seta de direção para o objetivo.
2. Gire o limbo até alinhar a agulha à seta de orientação.
3. Leia o azimute na linha de fé e caminhe mantendo o alinhamento, usando pontos intermediários visíveis.

## Contagem de passos

Meça seu número de passos duplos por 100 m em terreno plano, em subida e em vegetação densa. Registre com contas de ranger ou nós na cordinha.

## Contra-azimute

Para retornar, use o azimute de ida ± 180°. Anote sempre o azimute de saída do acampamento.

## Sem bússola

- **Sombra do sol**: marque a ponta da sombra, espere 15 minutos, marque de novo — a linha entre as marcas aponta aproximadamente leste-oeste.
- **Noite, hemisfério sul**: prolongue 4,5 vezes o eixo maior do Cruzeiro do Sul e desça ao horizonte para achar o sul.
- **Noite, hemisfério norte**: Polaris marca o norte verdadeiro.`,
    checklist: [
      "Mapa orientado ao norte",
      "Declinação aplicada",
      "Contagem de passos definida",
      "Azimute registrado",
      "Contra-azimute anotado",
      "Feição de contenção identificada",
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

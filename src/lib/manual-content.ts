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
  category:
    | "first-aid"
    | "fire"
    | "water"
    | "shelter"
    | "knots"
    | "navigation"
    | "preparacao"
    | "mentalidade"
    | "equipamento";
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
  {
    slug: "fundamentos-sobrevivencia",
    title: "Sobrevivência Não É Sorte: Os Fundamentos do Preparo",
    category: "preparacao",
    summary:
      "Sobrevivência é conhecimento, preparo e prática — não sorte. Comece pelos três instrumentos básicos: faca, fogo e corda.",
    image: "/manuals/fundamentos-sobrevivencia.jpg",
    imageAlt:
      "Ferro de fogo com raspador, corda paracord e isca natural sobre um tronco na floresta",
    body: `## O que separa quem volta de quem não volta

Sobrevivência não é sorte: é conhecimento, preparo e prática acumulados antes da emergência. O pôster deste manual mostra os três instrumentos que garantem os três primeiros sistemas de toda situação de campo — corte, fogo e amarração. Com uma faca, um ferro de faísca e 15 metros de paracord você monta abrigo, acende calor, purifica água e sinaliza resgate. Sem eles, mesmo o mais experiente depende do ambiente ceder algo — e o ambiente raramente cede.

## O sistema de corte

A faca é a ferramenta mãe: ela fabrica as outras. Com ela você apara iscas, racha madeira seca, faz cavilhas, prepara armadilhas e improvisa raspadores. Prefira lâmina fixa de 10 a 12 cm, espiga integral (full tang) e aço carbono ou inoxidável de qualidade. Mantenha o fio com pedra de amolar portátil — lâmina cega é risco, porque exige força e escorrega.

## O sistema de fogo

O ferro de fogo (pederneira de magnésio/ferrocerium) funciona molhado, quebrado e congelado: milhares de graus numa faísca. Selecione a isca antes de precisar dela — casca interna seca, felpa de bolso, algodão com vaselina em recipiente fechado. Raspador dedicado (a lombada da faca serve) com cabo de corda nunca se perde. Pratique acender com dez faíscas ou menos; se você precisa de cinquenta, ainda está treinando.

## O sistema de corda

Paracord 550 tem sete fios internos além da capa: cada metro rende linhas de pesca, costura, liga de armadilha e amarração. Leve no mínimo 15 m. Treine os cinco nós essenciais (ver o manual de nós) até fazê-los no escuro. Corda amarrada de qualquer jeito não segura carga — nó mal feito é equipamento que falha.

## A regra das três

O preparo segue prioridades que o corpo impõe: 3 minutos sem ar, 3 horas sem proteção térmica em clima severo, 3 dias sem água, 3 semanas sem comida. O abrigo vem antes do fogo, o fogo antes da água, a água antes da comida. Sinalização e navegação entram assim que a situação estabiliza — socorro só chega se você for encontrado.

## Prática deliberada

Conhecimento que não é praticado se apaga justamente quando você precisa. Uma vez por mês, passe uma tarde de campo usando apenas o kit do pôster: corte, fogo, abrigo. Cada erro em treino é um erro a menos numa emergência real — sorte não é plano; repetição é.`,
    checklist: [
      "Faca de lâmina fixa afiada e com pedra de amolar",
      "Ferro de fogo + raspador dedicado",
      "Isca seca em recipiente à prova d'água",
      "15 m de paracord (ou mais)",
      "Cinco nós essenciais treinados no mês",
      "Regra das três revisada: abrigo → fogo → água → comida",
    ],
  },
  {
    slug: "esteja-pronto",
    title: "Esteja Pronto Antes da Emergência: Kit, Fogo, Abrigo e Orientação",
    category: "preparacao",
    summary:
      "O kit certo, fogo seguro, abrigo eficiente e orientação firme — os quatro pilares para o inesperado não virar tragédia.",
    image: "/manuals/esteja-pronto.jpg",
    imageAlt:
      "Cinco pôsteres do Centro de Sobrevivência: kit de emergência, fogo, abrigo de galhos e bússola sobre mapa",
    body: `## Planeje, prepare-se, proteja-se

Emergência não avisa. A diferença entre um susto e uma tragédia quase sempre está no que estava pronto antes: a mochila montada, a técnica treinada, o rota decidida. Este manual reúne os quatro pilares do pôster — kit, fogo, abrigo e orientação — como um ciclo único de prontidão.

## Pilar 1 — O kit que faz a diferença

Um kit de sobrevivência existe para os primeiros dias, não para conforto: água e meios de tratar, calorias densas, proteção do tempo, corte, fogo, luz, sinalização e primeiros socorros. Regras práticas: cada item deve servir a pelo menos dois propósitos; o kit cabe numa mochila que você carrega sem esforço por horas; e ele é revisado — pilhas, válidos e remédios vencem. Comece pelos modelos prontos da seção Mochila (8h, 12h, 48h, 72h e 300h) e adapte ao seu clima e rota.

## Pilar 2 — Fogo: primeiro recurso

Fogo aquece, ilumina, cozinha, esteriliza, afasta animais e sinaliza. Domine uma fonte primária (ferro de fogo) e uma secundária (fósforos tempestade, lente). Prepare três vezes mais isca do que acha necessário, construa da classe fina para a grossa e limpe 1 m de solo mineral ao redor. Saiba apagar: cobrir, mexer, cobrir de novo — só saia do local quando o cinzeiro tocar o chão frio.

## Pilar 3 — Abrigo: proteção é prioridade

O corpo perde calor para o vento, a chuva e o chão — o chão é o maior ladrão. Antes de montar, escolha: fora de drenagens e linhas de cheia, longe de árvores mortas, com anteparo natural. Um A-frame de lona ou galhos verdes resolve a noite; o importante é a cama isolante de 20 cm e o teto que desvia a água. Use o que a natureza oferece e construa seu refúgio antes do anoitecer — abrigo no escuro sai pior e leva mais tempo.

## Pilar 4 — Não se perca no caminho

Saber se orientar salva vidas: use a bússola, leia o terreno e entenda o ambiente. Antes de sair, defina rota, azimuths e pontos de retorno; durante a marcha, confira o rumo a cada bifurcação; se sentir que se perdeu, pare — sente-se, beba água e decida com calma. Detalhes completos no manual de navegação terrestre.

## O ciclo da prontidão

Prontidão não é um evento, é um hábito: monte o kit, treine as técnicas, revise o material e repita. O que o pôster resume em quatro quadros, a prática transforma em reflexo — e reflexo é o que funciona quando o coração acelera.`,
    checklist: [
      "Kit montado e revisado (pilha, válidos, remédios)",
      "Fonte primária e secundária de fogo testadas no mês",
      "Local de abrigo avaliado: drenagem, viúvas, vento",
      "Cama isolante de 20 cm planejada",
      "Rota e azimuths anotados antes de sair",
      "Ponto de retorno definido para a emergência",
    ],
  },
  {
    slug: "sobreviver-e-uma-escolha",
    title: "Sobreviver É Uma Escolha: Preparação, Água, Mente e Equipamento",
    category: "mentalidade",
    summary:
      "Não espere o momento certo — comece hoje a se preparar para o inesperado. Seu futuro eu agradece.",
    image: "/manuals/sobreviver-e-uma-escolha.jpg",
    imageAlt:
      "Cinco pôsteres do Centro de Sobrevivência: preparação, água, mente forte, equipamento e escolha",
    body: `## A decisão que antecede a emergência

Sobreviver é uma escolha — feita muito antes do acidente. É a escolha de aprender habilidades em vez de só assistir vídeos, de montar o kit em vez de adiar, de treinar a mente em vez de ignorar o medo. O pôster deste manual reúne cinco decisões diárias que compõem essa escolha maior.

## Preparação é liberdade

Quanto mais você se prepara, menos depende da sorte e mais controle tem sobre o seu destino. Aprenda habilidades, tenha equipamentos, fortaleça a mente e cuide da saúde: os quatro eixos da autonomia. Preparar-se não é pessimismo — é a forma mais concreta de otimismo, porque parte do pressuposto de que vale a pena estar pronto.

## Água é vida

Sem água você não vai longe: saiba onde encontrar (fontes seguras, coleta de chuva, indícios do terreno), como tratar (fervura, filtro, químico) e como economizar cada gota. Encontre, trate e armazene com segurança — o detalhe completo está no manual Água É Vida. A regra de ouro: nunca beba sem tratar, não importa o quão limpa pareça.

## Mente forte sobrevive

O maior desafio nem sempre é o ambiente — é a própria mente. Mantenha a calma, controle o medo, foque no presente e lembre-se do seu objetivo. Pânico mata por decisões erradas, não por falta de equipamento. Respiração lenta, prioridade seguinte, um passo por vez: a técnica é simples, o treino é que exige constância.

## Equipamento certo faz toda a diferença

Não é sobre ter tudo — é sobre ter o que realmente importa. Escolha com inteligência, conheça o seu equipamento (use-o antes de precisar), mantenha-o em boas condições e leve sempre o essencial. Equipamento desconhecido na mochila é peso morto; equipamento treinado é multiplicador.

## Seu futuro eu agradece

Cada hora dedicada agora a aprender, montar, treinar e revisar é uma mensagem para o seu eu futuro: preparei o caminho. Comece hoje — pequeno, se for preciso — e mantenha. Quando o inesperado chegar, a escolha que você fez aqui é a que te salva.`,
    checklist: [
      "Uma habilidade nova treinada no mês",
      "Água: fonte, método de tratamento e estoque definidos",
      "Cinco minutos de treino de calma diários",
      "Equipamento conhecido e testado (não só guardado)",
      "O essencial sempre com você (kit de bolso)",
      "Revisão do kit agendada no calendário",
    ],
  },
  {
    slug: "agua-e-vida",
    title: "Água É Vida: Encontrar, Avaliar, Tratar e Armazenar",
    category: "water",
    summary:
      "Em sobrevivência, saber encontrar, avaliar, tratar e armazenar água é fundamental. Aprenda antes de precisar.",
    image: "/manuals/agua-e-vida.jpg",
    imageAlt:
      "Filtro de água de bombeamento enchendo uma caneca de metal junto a um riacho, com mochila tática",
    body: `## Por que a água vem antes de quase tudo

O corpo é 60% água; sem repor, a capacidade física cai antes de 24 horas e a tomada de decisão despenca em 48. Em uma situação de sobrevivência, saber encontrar, avaliar, tratar e armazenar água pode ser fundamental — e conhecimento básico pode fazer uma grande diferença. Aprenda antes de precisar.

## Encontrar

Priorize: água corrente de nascente ou rio alto > lagoa de grande volume > água de chuva recém-coletada > orvalho e vegetação. Indícios de água no terreno: vegetação verde densa em linha (curso subterrâneo), voo de aves ao anoitecer, sulcos de terreno convergindo. Evite água parada, espumante, com espuma, cheiro químico ou abaixo de pastagens e acampamentos.

## Avaliar

Toda água de campo é suspeita até tratada. Avalie transparência (pré-filtrar o turvo com pano), cheiro (podre/químico = troca de fonte), presença de animais mortos a montante e uso humano nas margens. Água cristalina carrega protozoários invisíveis: aparência não é segurança.

## Tratar — a hierarquia

1. **Fervura**: 1 minuto em fogo rolante (3 minutos acima de 2.000 m) — mata tudo que importa biologicamente. Custo: combustível.
2. **Filtro de 0,2 mícron**: elimina bactérias e protozoários na bomba, rápido e frio. Combine com químico para vírus.
3. **Químico (dióxido de cloro)**: 30 min de espera (4 h para Cryptosporidium); água fria dobra o tempo. Leve: sobra espaço na mochila.
4. **SODIS (solar)**: garrafa PET transparente, 6 h de sol pleno (2 dias nublado) — último recurso.

Nunca beba sem tratar, mesmo com sede extrema: diarreia em campo desidrata mais rápido do que a sede mata.

## Armazenar e economizar

Carregue sempre dois recipientes: um de uso (cantil) e um de reserva (garrafa de 1-2 L). Esterilize a rosca e o bico com a própria água tratada; marque o que está tratado. Consumo de referência: 3-4 L/dia em atividade moderada, mais em calor. Economize: sombra, esforço reduzido, respiração pelo nariz — suor é água que você jogou fora.

> **Aviso**: fervura e filtro não removem contaminação química ou metais pesados. Água com cheiro estranho mesmo tratada, ou próxima de mineração/agroindústria, muda a fonte — não o filtro.`,
    checklist: [
      "Fonte avaliada (corrente, transparente, sem indícios químicos)",
      "Água pré-filtrada com pano se turva",
      "Tratamento aplicado e tempo respeitado",
      "Recipiente de uso e de reserva separados",
      "Rosca e bico esterilizados",
      "Marcação do que está tratado",
    ],
  },
  {
    slug: "preparacao-e-liberdade",
    title: "Preparação É Liberdade: Autonomia Que Ninguém Toma",
    category: "preparacao",
    summary:
      "Quanto mais preparado você está, menos depende da sorte. Conhecimento, equipamentos e prática aumentam sua autonomia.",
    image: "/manuals/preparacao-e-liberdade.jpg",
    imageAlt:
      "Mochila tática, garrafa térmica, corda, lanterna, canivete, pederneira e mapa com bússola sobre a rocha ao pôr do sol",
    body: `## Menos sorte, mais controle

Quanto mais preparado você está, menos depende da sorte. Conhecimento, equipamentos e prática não servem apenas para situações extremas — eles aumentam sua autonomia quando o inesperado acontece: a estrada bloqueada, a tempestade na trilha, a queda de energia no bairro. Prepare-se antes de precisar.

## Os quatro eixos da autonomia

**Aprenda habilidades** — orientação, fogo, primeiros socorros, Comunicação de emergência. Habilidade não pesa na mochila e não tem validade; é o único equipamento que você não pode esquecer em casa.

**Tenha equipamentos** — os certos, não todos: água e tratamento, abrigo, corte, luz, fogo, documentos. A lista muda com o cenário (8h de trilha ≠ 72h de crise urbana), mas o princípio não: cada item escolhido a propósito, conhecido e testado.

**Fortaleça a mente** — calma sob pressão, tolerância ao desconforto, decisão com informação incompleta. Treine com pequenos desconfortos voluntários: saia com tempo nublado, cozinhe na chuva, navegue sem GPS um dia.

**Cuide da saúde** — sono, hidratação, condicionamento básico. O corpo é o equipamento principal; o resto é acessório.

## A liberdade na prática

Preparação transforma dependência em escolha: quem tem água tratada não precisa aceitar risco; quem sabe orientar-se não fica refém de sinal de celular; quem tem kit no carro decide se atravessa ou espera, em vez de ser decidido pela fila do pânico. Liberdade é o nome técnico disso: mais opções, menos dependência.

## Comece pequeno, comece hoje

Não espere o kit perfeito nem o curso completo: esta semana, monte a mochila 8h do aplicativo; este mês, acenda fogo com o ferro dez vezes, faça um percurso só com bússola e mapa, revise a validade dos itens. Autonomia se constrói em camadas — e cada camada reduz um pouco o poder da sorte sobre a sua vida.`,
    checklist: [
      "Mochila 8h montada e revisada",
      "Fogo acendido com ferro neste mês",
      "Um percurso feito só com mapa e bússola",
      "Validade dos itens conferida",
      "Um desconforto voluntário treinado (chuva, frio leve)",
      "Documentos e contatos de emergência atualizados",
    ],
  },
  {
    slug: "mente-forte",
    title: "Mente Forte Sobrevive: Controle o Medo, Foque no Próximo Passo",
    category: "mentalidade",
    summary:
      "Nem todo desafio está no ambiente. Manter a calma, observar, pensar com clareza e decidir são habilidades que também precisam ser treinadas.",
    image: "/manuals/mente-forte.jpg",
    imageAlt:
      "Operador agachado junto a fogueira ao entardecer, em reflexão, com mochila tática e caneca de metal",
    body: `## O primeiro abrigo é a cabeça

Nem todo desafio está no ambiente — o mais difícil costuma ser a própria mente. Manter a calma, observar, pensar com clareza e tomar decisões conscientes são habilidades que também precisam ser treinadas. Sobrevivência começa no controle do medo; o resto do kit só funciona depois disso.

## Os quatro pilares da mente de campo

**Foco** — uma prioridade por vez. A lista mental é: respirar, abrigo, sinal, água. Foco é recusar resolver dez problemas ao mesmo tempo quando o próximo passo é um só.

**Calma** — o corpo segue a respiração. Quatro segundos inspirando, seis soltando, por dois minutos: o pulso desce, a visão periférica volta, o raciocínio religa. Calma não é sentimentinho — é técnica fisiológica.

**Decisão** — informação incompleta é a norma em campo. Decida com o que você tem, marque hora para revisar a decisão, ajuste com novos dados. Indecisão prolongada gasta mais energia do que decisão imperfeita corrigida depois.

**Resiliência** — o plano vai falhar; a missão não. Transforme frustração em passo seguinte: "perdi o fogo — refaço a isca", não "perdi o fogo — acabou".

## O método STOP para pânico

Quando sentir o medo tomar conta, use o método militar: **S**top — pare de andar; **T**hink — pense no que sabe de verdade; **O**bserve — o que está ao redor: abrigo, água, referências; **P**lan — escolha o próximo passo concreto e execute. O ciclo quebra o pânico porque devolve controle — e controle é o oposto de medo.

## Treino antes da crise

Mente se treina igual a nó: repetição. Simulações com hora marcada, treinos com GPS desligado, noites frias planejadas, exercícios de respiração diários de cinco minutos. Cada treino voluntário reduz a novidade — e é a novidade, mais do que o perigo em si, que desmonta a cabeça.`,
    checklist: [
      "Dois minutos de respiração 4-6 treinados hoje",
      "Método STOP memorizado",
      "Uma simulação com hora marcada no mês",
      "Prioridades revisadas: respirar, abrigo, sinal, água",
      "Decisões com hora para revisão (não com pressa)",
      "Registro do que funcionou após cada treino",
    ],
  },
  {
    slug: "conhecimento-salva-vidas",
    title: "Conhecimento Salva Vidas: As Cinco Habilidades Fundamentais",
    category: "preparacao",
    summary:
      "Bushcraft, fogo, água, primeiros socorros e orientação — mais do que cursos, é preparação real.",
    image: "/manuals/conhecimento-salva-vidas.jpg",
    imageAlt:
      "Mochila tática, caneca, mapa, bússola e faca sobre a rocha com montanhas ao fundo ao amanhecer",
    body: `## Prepare-se hoje para o amanhã

No Centro de Sobrevivência você aprende as habilidades que realmente importam — e mais do que cursos, é preparação real. Este manual organiza as cinco habilidades do pôster em um mapa de estudo: o que cada uma entrega, por onde começar e como praticar.

## 1. Bushcraft

Técnicas práticas para você se virar na natureza: corte seguro, nós, abrigos improvisados, ferramentas de madeira, leitura do terreno. É a base manual de tudo — sem corte seguro não tem isca, sem nó não tem abrigo, sem leitura não tem rota. Comece por: cinco nós essenciais (manual próprio no app) e corte com faca afiada em direção oposta ao corpo.

## 2. Fogo

Do zero ao fogo, com métodos confiáveis: ferro de faísca, iscas naturais e preparadas, formatos de fogueira, fogo sob chuva. Fogo é aquecimento, água tratada, comida segura, sinal. Pratique dez acendimentos por mês, incluindo um com material molhado.

## 3. Água

Encontre, trate e armazene com segurança: fontes, avaliação, fervura/filtro/químico, estoque. É a habilidade com maior retorno por hora de estudo — desidratação derruba antes de qualquer outra coisa. Domine a hierarquia de tratamento do manual Água É Vida.

## 4. Primeiros socorros

Cuide de você e de quem está com você: controle de sangramento, hipotermia, choque, RCP básica, kit de feridas. Treine com o manual de cuidados com feridas e a resposta à hipotermia do app — e faça um curso presencial quando puder: mão na massa muda tudo.

## 5. Orientação

Navegue e encontre o seu caminho: mapa, bússola, azimute, contagem de passos, navegação celestial. O app tem bússola com sensor real e bússola celeste (Cruzeiro do Sul e Polaris) para praticar. Faça um percurso por mês só com mapa e bússola.

## Como estudar

Uma habilidade por mês, com saída de campo para praticar e registro do que falhou. Conhecimento salva vidas quando virou hábito — não quando está salvo nos favoritos.`,
    checklist: [
      "Cinco nós treinados (bushcraft)",
      "Dez acendimentos no mês (fogo)",
      "Hierarquia de tratamento de água decorada",
      "Kit de feridas revisado (primeiros socorros)",
      "Um percurso por bússola no mês (orientação)",
      "Registro de prática anotado",
    ],
  },
  {
    slug: "seu-futuro-e-preparacao",
    title: "Seu Futuro É Preparação: Aprenda, Equipe-se, Pratique, Esteja Pronto",
    category: "preparacao",
    summary:
      "A vida é imprevisível, mas a capacidade de se adaptar pode ser o seu maior recurso. Hoje você aprende, amanhã você agradece.",
    image: "/manuals/seu-futuro-e-preparacao.jpg",
    imageAlt:
      "Operador de costas contemplando vale ao amanhecer, com garrafa térmica, caneca, mapa, bússola e canivete",
    body: `## Hoje você aprende, amanhã você agradece

A vida é imprevisível. Mas a sua capacidade de se adaptar pode ser o seu maior recurso — e adaptar-se é habilidade treinável, não dom. Este manual transforma o pôster em um plano de quatro etapas: aprenda, equipe-se, pratique, esteja pronto.

## 1. Aprenda

Habilidades que fazem a diferença: comece pelas cinco fundamentais (bushcraft, fogo, água, primeiros socorros, orientação — todas no Manual deste app) e avance para o seu cenário: urbano, trilha, estrada. Um tópico por semana, com prática marcada, rende um ano sólido de preparo.

## 2. Equipe-se

Os equipamentos certos trazem mais segurança: mochila por duração (8h/12h/48h/72h/300h — modelos prontos na seção Mochila), água e tratamento, abrigo, corte, luz, comunicação, documentos. Compre por necessidade, não por coleção — e só liste no kit o que você sabe usar.

## 3. Pratique

A prática transforma conhecimento em confiança: fogo com faísca, percurso por bússola, noite em abrigo improvisado, primeiros socorros em curso. Programe uma prática mensal mínima — o que não se pratica, apaga.

## 4. Esteja pronto

Porque o inesperado não avisa: kit revisado, válidos em dia, plano de família combinado, contatos de emergência no papel (não só no celular), rota de evacuação conhecida. Prontidão é rotina barata que evita crise caríssima.

## O efeito composto

Cada camada de preparo reduz o tamanho do imprevisto: quem aprende decidirá melhor, quem se equipa executará mais rápido, quem pratica erra menos, quem está pronto dorme antes da tempestade. Daqui a um ano, o "seu futuro eu" olha para trás e agradece a semana em que tudo começou.`,
    checklist: [
      "Um tópico do manual estudado nesta semana",
      "Mochila escolhida por duração e montada",
      "Prática mensal agendada no calendário",
      "Válidos e pilhas conferidos",
      "Plano de família e contatos no papel",
      "Rota de evacuação conhecida da casa/trabalho",
    ],
  },
  {
    slug: "disciplina-gera-resultados",
    title: "Disciplina Gera Resultados: Foco, Consistência, Prática, Preparação",
    category: "mentalidade",
    summary:
      "Disciplina é o que transforma conhecimento em habilidade e habilidade em segurança. Disciplina hoje, liberdade amanhã.",
    image: "/manuals/disciplina-gera-resultados.jpg",
    imageAlt:
      "Operador de boné e mochila sentado diante de fogueira com vale e lago ao pôr do sol, mapa, bússola e caneca",
    body: `## Disciplina hoje, liberdade amanhã

No Centro de Sobrevivência você aprende que a disciplina é o que transforma conhecimento em habilidade e habilidade em segurança. Conhecimento guardado em livro não segura um abrigo; habilidade parada enferruja. É o treino repetido — a disciplina — que constrói a resposta automática que salva em campo.

## Os quatro motores da disciplina

**Foco** — mantém sua mente no que realmente importa. Em campo, foco é recusar distração: a prioridade é a prioridade. Em treino, é terminar a série de nós antes de abrir o celular.

**Consistência** — pequenos hábitos criam grandes resultados. Dez nós por dia vencem duzentos num sábado por mês; cinco minutos de respiração diários valem mais que uma meditação heroica por trimestre. Agenda vence motivação.

**Prática** — é no treino que a confiança se constrói. Cada técnica deste app tem lado prático: acender, amarrar, filtrar, navegar, curar. Pratique no pior cenário razoável — chuva leve, luvas, fim de dia — porque é assim que a emergência chega.

**Preparação** — te coloca à frente do inesperado. Kit revisado, válidos em dia, rota estudada, bússola calibrada. Preparação é disciplina aplicada ao futuro.

## O ciclo que compõe

Foco sem consistência é explosão isolada; consistência sem prática é rotina vazia; prática sem preparação é coragem sem margem. Juntos, os quatro formam o ciclo: foca na habilidade do mês, repete até virar hábito, treina em campo, revisa o material — e recomeça na habilidade seguinte.

## Disciplina é sobrevivência

Quando o clima vira, é o nó que você amarrou cem vezes que segura o teto; é a respiração que você treinou que segura a mão; é o kit que você revisou que não falha. Disciplina é sobrevivência em forma de hábito — e a liberdade de amanhã é o recibo de hoje.`,
    checklist: [
      "Prioridade do dia definida (foco)",
      "Série diária cumprida (consistência)",
      "Uma técnica treinada em condições reais (prática)",
      "Kit revisado na semana (preparação)",
      "Falhas anotadas e corrigidas",
      "Habilidade do mês escolhida",
    ],
  },
  {
    slug: "equipamento-e-vida",
    title: "Equipamento É Vida: Escolher, Conhecer e Manter",
    category: "equipamento",
    summary:
      "Ter o equipamento certo não é luxo, é necessidade. Leve o essencial, conheça seu equipamento, use com sabedoria.",
    image: "/manuals/equipamento-e-vida.jpg",
    imageAlt:
      "Operador de mochila tática sentado ao pôr do sol com garrafa, lanterna a óleo, mapa, bússola, facas e corda",
    body: `## O equipamento certo faz toda a diferença

Ter o equipamento certo não é luxo, é necessidade: ele pode garantir sua segurança, seu conforto e aumentar suas chances de sobrevivência. Mas o pôster traz o aviso que separa preparado de colecionador: leve o essencial, conheça o seu equipamento, use com sabedoria.

## Os cinco sistemas básicos

**Mochila** — organização e praticidade para a jornada: tamanho certo para a duração (8h a 300h — veja os modelos na seção Mochila), costura reforçada, capa de chuva, compartimentos por sistema (água, abrigo, fogo, socorro). Mochila bagunçada atrasa o acesso ao que importa.

**Barraca/abrigo** — proteção contra o clima e os perigos da natureza: lona multiuso, toldo, ou barraca — o essencial é teto impermeável e cama isolante. Saiba montar o seu no escuro e sob vento.

**Lanterna** — luz no escuro e segurança em qualquer situação: headlamp deixa as mãos livres, pilhas sobressalentes em recipiente fechado, luz vermelha preserva a visão noturna. Luz é também sinalização de resgate.

**Canivete multiuso** — versatilidade para resolver imprevistos: corte, pinça, alicate, abridor. Complementa — não substitui — a faca de lâmina fixa. Ferramenta que não corta papel não vai no campo: afie antes.

**Sistema de água** — hidratação é vida, sempre com você: garrafa rígida de 1 L + reserva flexível, filtro ou método químico, cantil tratado separado do não tratado. O sistema completa o manual Água É Vida.

## Conhecer antes de precisar

Equipamento novo vai para o quintal antes de ir para o campo: monte a barraca uma vez, bombeie o filtro, acenda o fogão, ajuste a mochila carregada. Cada item precisa de "horas de voo" — o lugar para descobrir que a lanterna come bateria ou que o fogão não acende no frio é o treino, não a emergência.

## Manutenção é parte do equipamento

Seque tudo antes de guardar, limpe filtros, lubrique zíperes com cera, recarregue pilhas e confira validades (o app avisa — veja os lembretes de validade na Mochila). Equipamento mantido é equipamento que funciona; equipamento abandonado é peso com cheiro de mofo.`,
    checklist: [
      "Mochila dimensionada para a duração da jornada",
      "Abrigo montado ao menos uma vez em treino",
      "Lanterna + pilhas reserva testadas",
      "Canivete afiado e faca fixa revisada",
      "Sistema de água completo (uso + reserva + tratamento)",
      "Manutenção e validades conferidas no mês",
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
  preparacao: "Preparação",
  mentalidade: "Mentalidade",
  equipamento: "Equipamento",
};

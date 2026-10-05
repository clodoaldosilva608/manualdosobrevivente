import woundCareImg from "@/assets/manual/wound-care.jpg";
import hypothermiaImg from "@/assets/manual/hypothermia.jpg";
import fireStartingImg from "@/assets/manual/fire-starting.jpg";
import waterImg from "@/assets/manual/water-purification.jpg";
import tarpImg from "@/assets/manual/tarp-shelter.jpg";
import knotsImg from "@/assets/manual/core-knots.jpg";
import navigationImg from "@/assets/manual/land-navigation.jpg";
import conhecimentoSalvaVidasImg from "@/assets/manual/conhecimento-salva-vidas.jpg";
import aguaEVidaImg from "@/assets/manual/agua-e-vida.jpg";
import cincoPilaresImg from "@/assets/manual/cinco-pilares.jpg";
import seuFuturoImg from "@/assets/manual/seu-futuro-e-preparacao.jpg";
import preparacaoLiberdadeImg from "@/assets/manual/preparacao-e-liberdade.jpg";
import menteForteImg from "@/assets/manual/mente-forte-sobrevive.jpg";
import disciplinaImg from "@/assets/manual/disciplina-gera-resultados.jpg";
import sobreviverEscolhaImg from "@/assets/manual/sobreviver-e-uma-escolha.jpg";
import equipamentoVidaImg from "@/assets/manual/equipamento-e-vida.jpg";
import sobrevivenciaNaoSorteImg from "@/assets/manual/sobrevivencia-nao-e-sorte.jpg";

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
    | "fundamentos"
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
    slug: "conhecimento-salva-vidas",
    title: "Conhecimento Salva Vidas",
    category: "fundamentos",
    summary:
      "As cinco habilidades que realmente importam: bushcraft, fogo, água, primeiros socorros e orientação.",
    image: conhecimentoSalvaVidasImg,
    imageAlt:
      "Pôster do Centro de Sobrevivência com mochila tática, bússola e mapa sobre a rocha ao pôr do sol, listando as cinco habilidades: bushcraft, fogo, água, primeiros socorros e orientação",
    body: `## Por que a ordem importa

No Centro de Sobrevivência você aprende as habilidades que realmente importam — e elas formam uma pilha: cada uma sustenta a próxima. Quem sabe fazer fogo consegue purificar água; quem sabe orientar-se não precisa de resgate; quem sabe socorrer mantém o grupo de pé enquanto o plano anda. Prepare-se hoje para o amanhã: conhecimento é o único equipamento que não pesa na mochila e não pode ser confiscado pela chuva.

## As cinco habilidades (e o primeiro passo de cada)

1. **Bushcraft** — técnicas práticas para se virar na natureza: amarrar nós, montar abrigo, usar faca e corda com segurança. Primeiro passo: os cinco nós essenciais deste manual, praticados até saírem de olhos fechados.
2. **Fogo** — do zero ao fogo, com métodos confiáveis: ferro rod, iscas naturais, estruturas de fogueira. Primeiro passo: acender uma fogueira em dia seco com apenas um ferro rod e isca coletada por você.
3. **Água** — encontre, trate e armazene com segurança. Primeiro passo: fervura completa (1 minuto de rolamento, 3 acima de 2000 m) com o recipiente que você carrega.
4. **Primeiros socorros** — cuide de você e de quem está com você. Primeiro passo: controle de sangramento por pressão direta e um torniquete improvisado com lenço e bastão.
5. **Orientação** — navegue e encontre o seu caminho com mapa, bússola, Sol e estrelas. Primeiro passo: orientar o mapa com bússola e caminhar um azimute de 500 m com contagem de passos.

## Mais do que cursos: preparação real

Preparação real é medida em repetição, não em certificados. Treine cada habilidade em condições fáceis, depois em chuva, à noite e cansado. Registre o que falhou. O dia em que você precisar de verdade não pode ser o primeiro dia de prática.`,
    checklist: [
      "Cinco nós essenciais praticados nesta semana",
      "Fogueira acendida com ferro rod e isca própria",
      "Água fervida no recipiente de campo",
      "Torniquete improvisado treinado",
      "Azimute de 500 m caminhado com passos contados",
      "Uma prática refeita em chuva ou à noite",
    ],
  },
  {
    slug: "agua-e-vida",
    title: "Água é Vida",
    category: "water",
    summary:
      "Encontrar, avaliar, tratar, armazenar e economizar água — o ciclo completo que mantém você de pé.",
    image: aguaEVidaImg,
    imageAlt:
      "Pôster do Centro de Sobrevivência com filtro de bomba enchendo uma caneca de metal em riacho de montanha, ao lado de garrafas, com o título Água é Vida",
    body: `## Sem água você não vai longe

O corpo aguarda semanas sem comida, mas poucos dias sem água — menos ainda em calor, esforço ou altitude. Em uma situação de sobrevivência, saber encontrar, avaliar, tratar e armazenar água pode ser fundamental. Conhecimento básico pode fazer uma grande diferença. Aprenda antes de precisar.

## Encontre fontes seguras

Siga os sinais para baixo: vales, vegetação densa e verde, voos de aves ao amanhecer, pedra úmida em paredões. Prefira água corrente e clara a poças paradas; nascente é melhor que rio; rio acima de trilha e pasto é melhor que rio abaixo. Evite água com espuma, odor, coloração estranha ou proximidade de acampamentos e mineração.

## Trate sempre — clareza não é pureza

- **Fervura** (padrão-ouro): 1 minuto de rolamento vigoroso; 3 minutos acima de 2000 m.
- **Filtro de 0,2 mícron**: elimina bactérias e protozoários; combine com químico para vírus.
- **Dióxido de cloro**: 30 minutos de espera (4 horas contra *Cryptosporidium*; dobro em água fria).
- Pré-filtre com bandana e deixe decantar: tratamento funciona muito melhor em água limpa.

## Armazene com segurança

Esterilize a rosca e o bico com um pouco da água já tratada, marque o que está tratado para não confundir, e proteja do sol em recipiente opaco. Reserve um litro que você NÃO toca: é a reserva de emergência do dia seguinte.

## Economize cada gota

Trabalhe ao amanhecer e ao entardecer, respire pelo nariz, fique à sombra, não coma sem beber (digerir consome água), e beba em goles distribuídos em vez de um litro de uma vez. Se a fonte é distante, carregue o recipiente cheio até o acampamento em vez de ir até a água duas vezes.`,
    checklist: [
      "Fonte avaliada (corrente, clara, limpa de origem)",
      "Pré-filtragem e decantação feitas",
      "Tratamento aplicado com o tempo de espera cumprido",
      "Rosca e bico esterilizados",
      "Recipiente tratado marcado",
      "Reserva de 1 litro intocada",
    ],
  },
  {
    slug: "cinco-pilares",
    title: "Os Cinco Pilares da Sobrevivência",
    category: "fundamentos",
    summary:
      "Bushcraft, kit pronto, fogo, abrigo e orientação — os cinco pilares que sustentam qualquer imprevisto.",
    image: cincoPilaresImg,
    imageAlt:
      "Painel com cinco pôsteres do Centro de Sobrevivência: Sobrevivência não é sorte, Esteja pronto antes da emergência, Fogo primeiro recurso, Abrigo proteção é prioridade e Não se perca no caminho",
    body: `## Sobrevivência não é sorte

É conhecimento, preparo e prática. Aprenda as técnicas básicas de bushcraft e construa sua independência na natureza: corda e faca resolvem abrigo, fogo, carga e resgate quando sobra conhecimento. Comece pelos nós, pelo uso seguro da faca e pela leitura do terreno ao seu redor.

## Pilar 1 — Esteja pronto antes da emergência

Ter um kit de sobrevivência pode fazer toda a diferença quando o inesperado acontece: planeje, prepare-se, proteja-se. O kit vive na mochila, não no armário — conferido, seco e completo. O mínimo: abrigo (lona ou saco), água e tratamento, fogo em duas fontes, luz, faca, primeiros socorros, alimentação de 24 h e apito.

## Pilar 2 — Fogo: primeiro recurso

Aquece, ilumina, cozinha, afasta perigos e traz segurança. Saiba como acender e manter o fogo com segurança: ferro rod + isca que funciona úmida (casca de bétula, fatwood, algodão com vaselina), combustível em quatro classes e área limpa de 1 m até o solo mineral. Fogo sem plano de apagar é incêndio.

## Pilar 3 — Abrigo: proteção é prioridade

Um bom abrigo protege do frio, da chuva, do vento e de muitos outros riscos. Use o que a natureza oferece e construa seu refúgio: A-frame com lona, meia-água voltada contra o vento, cama isolante de 20 cm — o frio vem de baixo, não de cima. Monte o abrigo ANTES de escurecer e antes de molhar.

## Pilar 4 — Não se perca no caminho

Saber se orientar pode salvar sua vida: use a bússola, leia o terreno e entenda o ambiente. Anote o azimute de saída, conte passos, marque feições de contenção que avisam quando você passou do ponto — e, sem bússola, use a sombra do sol ou o Cruzeiro do Sul.

## Como treinar os pilares

Um pilar por semana, em ciclos: semana do kit (inventário e pesos), semana do fogo (três acendimentos), semana do abrigo (um pernoite), semana da orientação (rota com azimutes), semana do bushcraft (nós + faca). Depois, o teste final: 24 h usando só o kit.`,
    checklist: [
      "Kit de sobrevivência conferido na mochila",
      "Ferro rod + isca alternativa testados",
      "Abrigo montado antes de escurecer",
      "Azimute de saída e contra-azimute anotados",
      "Área de fogo limpa com água por perto",
      "Cama isolante de 20 cm feita",
    ],
  },
  {
    slug: "seu-futuro-e-preparacao",
    title: "Seu Futuro é Preparação",
    category: "mentalidade",
    summary:
      "A vida é imprevisível; a capacidade de se adaptar é o seu maior recurso. Aprenda, equipe-se, pratique.",
    image: seuFuturoImg,
    imageAlt:
      "Pôster do Centro de Sobrevivência com homem de mochila olhando o vale ao amanhecer e os quatro passos: aprenda, equipe-se, pratique e esteja pronto",
    body: `## A vida é imprevisível

Mas a sua capacidade de se adaptar pode ser o seu maior recurso. Hoje você aprende; amanhã você agradece. Preparação não é medo do futuro — é respeito por ele: um plano para quando a trilha fechar, o tempo virar, o sinal cair.

## Os quatro passos do pôster

1. **Aprenda** — habilidades que fazem a diferença. Estude um verbete deste manual por semana e vá a campo com ele: conhecimento só vira habilidade com as mãos sujas.
2. **Equipe-se** — os equipamentos certos trazem mais segurança. Não é a mochila mais cara, é a mais completa para o seu cenário: água, abrigo, fogo, luz, socorro.
3. **Pratique** — a prática transforma conhecimento em confiança. Repita cada técnica até ela sair sem pensar: nó com luvas, fogo com vento, azimute à noite.
4. **Esteja pronto** — porque o inesperado não avisa. Kit na mochila, tanque cheio, remédios em dia, ponto de encontro combinado com a família.

## Prepare-se antes de precisar

Monte o seu ciclo de preparação em três camadas: o EDC (o que está com você: faca, isqueira, apito, lenço), o kit de 24 h (a mochila que vive pronta) e o plano de casa (água estocada, documentos, rota de evacuação). Revise cada camada a cada estação.

## A régua da adaptação

Adaptação se treina mudando uma variável por vez: mesma rota com chuva, mesmo acampamento sem fogueira, mesmo trecho sem GPS. Quem já se virou sob controle ganha calma quando não há controle — e é essa calma que salva.`,
    checklist: [
      "Um verbete novo estudado e praticado na semana",
      "Kit de 24 h conferido e seco",
      "EDC no bolso antes de sair de casa",
      "Uma prática feita sob chuva ou vento",
      "Plano de casa revisado nesta estação",
      "Ponto de encontro combinado com o grupo",
    ],
  },
  {
    slug: "preparacao-e-liberdade",
    title: "Preparação é Liberdade",
    category: "mentalidade",
    summary:
      "Quanto mais preparado você está, menos depende da sorte — e mais controle tem sobre o próprio destino.",
    image: preparacaoLiberdadeImg,
    imageAlt:
      "Pôster do Centro de Sobrevivência com mochila tática, garrafa, lanterna, faca e bússola sobre um mapa ao pôr do sol, com o título Preparação é Liberdade",
    body: `## Quanto mais preparado, menos sorte

Quanto mais preparado você está, menos depende da sorte. Conhecimento, equipamentos e prática não servem apenas para situações extremas: eles aumentam sua autonomia quando o inesperado acontece — na estrada, no trabalho, em casa, no meio do nada. Prepare-se antes de precisar.

## As três moedas da autonomia

- **Conhecimento**: saber o que fazer e, principalmente, o que NÃO fazer. Custo zero, peso zero, ninguém tira de você.
- **Equipamento**: as ferramentas certas multiplicam o que você consegue resolver sozinho. Pouco, bom, conhecido — cada peça deve ser dominada antes de entrar na mochila.
- **Prática**: a ponte entre os dois. É ela que transforma o ferro rod em fogo de verdade e o mapa em caminho de verdade.

## O que liberdade significa aqui

Liberdade é escolher: ficar ou voltar, ajudar ou pedir ajuda, esperar ou evacuar — sem paralisia. Quem tem água tratada não compete pela poça; quem tem fogo não teme a noite; quem sabe orientar-se não aceita ficar perdido. A preparação devolve decisões às suas mãos.

## Comece pelo mais frágil

Faça um inventário honesto das três moedas e reforce a mais fraca primeiro: sem conhecimento, equipamento é peso; sem prática, conhecimento é teoria; sem equipamento mínimo, a prática tropeça. Um mês focado na fraqueza vale mais que um ano reforçando o que já é forte.`,
    checklist: [
      "Inventário de conhecimento/prática/equipamento feito",
      "Ponto mais fraco identificado e treinado",
      "Cada peça do kit dominada em campo",
      "Água e fogo resolvidos sem apoio",
      "Rota de saída conhecida sem GPS",
      "Revisão mensal agendada",
    ],
  },
  {
    slug: "mente-forte-sobrevive",
    title: "Mente Forte Sobrevive",
    category: "mentalidade",
    summary:
      "O maior desafio nem sempre é o ambiente: é a própria mente. Foco, calma, decisão e resiliência se treinam.",
    image: menteForteImg,
    imageAlt:
      "Pôster do Centro de Sobrevivência com homem sentado diante de fogueira na floresta ao entardecer e as quatro forças da mente: foco, calma, decisão e resiliência",
    body: `## Nem todo desafio está no ambiente

O maior desafio nem sempre é o terreno — é a sua própria mente. Manter a calma, observar, pensar com clareza e tomar decisões conscientes são habilidades que também precisam ser treinadas. Controle o medo; foque no próximo passo.

## O protocolo STOP (pare e pense)

1. **S — Sente-se**: interrompa o impulso de correr. Andar sem plano multiplica o erro.
2. **T — Pense**: onde estou? desde quando? o que eu SABIA antes de perder o rumo?
3. **O — Observe**: terreno, clima, luz restante, água, o que há na mochila de verdade.
4. **P — Planeje**: uma ação por vez, começando pela mais reversível. Decisão consciente vale mais que decisão rápida.

## As quatro forças

- **Foco**: um problema por vez. Água agora, abrigo depois, resgate em seguida — a pilha inteira assusta; o próximo passo não.
- **Calma**: respiração 4-4-4 (inspira, segura, solta) por três ciclos antes de qualquer decisão importante. O cérebro oxigenado pensa; o apavorado só reage.
- **Decisão**: decisão boa agora vence decisão perfeita nunca. Defina um prazo mental (60 segundos) e comprometa-se.
- **Resiliência**: recaída não é fracasso — é dado. Ajuste o plano e siga. Sobrevivência é média das decisões, não a perfeição de uma.

## Treino mental de campo

Treine de propósito: perca-se de mentira num lugar seguro e aplique o STOP; acampe sozinho uma noite; caminhe no escuro com luz fraca. O medo que você domina em treino é o medo que não te domina de verdade.`,
    checklist: [
      "STOP aplicado antes de qualquer movimento",
      "Respiração 4-4-4 feita em três ciclos",
      "Um problema por vez definido",
      "Decisão tomada dentro do prazo mental",
      "Plano ajustado após cada erro",
      "Um treino de estresse controlado no mês",
    ],
  },
  {
    slug: "disciplina-gera-resultados",
    title: "Disciplina Gera Resultados",
    category: "mentalidade",
    summary:
      "Disciplina transforma conhecimento em habilidade e habilidade em segurança: foco, consistência, prática, preparação.",
    image: disciplinaImg,
    imageAlt:
      "Pôster do Centro de Sobrevivência com homem de boné sentado diante de fogueira com mapa, bússola e faca, listando foco, consistência, prática e preparação",
    body: `## Disciplina transforma conhecimento em habilidade

No Centro de Sobrevivência você aprende que a disciplina é o que transforma conhecimento em habilidade e habilidade em segurança. Não é talento: é foco, consistência, prática e preparação repetidos até virarem caráter. Disciplina hoje, liberdade amanhã.

## Os quatro engrenagens

1. **Foco** — mantém sua mente no que realmente importa. Uma habilidade por ciclo, um critério de sucesso por treino: acendeu ou não acendeu; achou o azimute ou não achou.
2. **Consistência** — pequenos hábitos criam grandes resultados. Quinze minutos diários de nó, faca e leitura de mapa vencem a maratona mensal que nunca acontece.
3. **Prática** — é no treino que a confiança se constrói. Treine pior cenário primeiro: chuva, vento, luvas, escuridão. Fácil demais não ensina.
4. **Preparação** — te coloca à frente do inesperado. Kit conferido, lâmina afiada, bateria carregada, água reposta: a manutenção é a prática invisível da disciplina.

## O ritual semanal

Escolha um dia fixo e crie o ritual: conferir a mochila (15 min), afiar a faca (5 min), treinar um nó até acertar dez seguidos (10 min), ler um verbete do manual (10 min), registrar no caderno o que falhou (5 min). Quarenta e cinco minutos, uma vez por semana, mudam o patamar em um ano.

## Disciplina é sobrevivência

Em campo, a disciplina aparece como checklist: antes de sair (kit completo), antes de dormir (fogo apagado, água tratada, abrigo firme), antes de mover (azimute anotado, grupo combinado). O sobrevivente disciplinado não é o mais forte — é o que não esquece o básico.`,
    checklist: [
      "Ritual semanal cumprido no dia fixo",
      "Mochila conferida item por item",
      "Faca afiada e ferramenta seca",
      "Dez repetições seguidas do nó da semana",
      "Caderno de erros atualizado",
      "Checklist de saída/pernoite/movimento usado",
    ],
  },
  {
    slug: "sobreviver-e-uma-escolha",
    title: "Sobreviver é uma Escolha",
    category: "fundamentos",
    summary:
      "Não espere o momento certo: comece hoje. Os cinco lembretes que separam a decisão da sorte.",
    image: sobreviverEscolhaImg,
    imageAlt:
      "Painel com cinco pôsteres do Centro de Sobrevivência: Preparação é liberdade, Água é vida, Mente forte sobrevive, Equipamento certo faz toda a diferença e Sobreviver é uma escolha",
    body: `## Não espere o momento certo

Comece hoje a se preparar para o inesperado — seu futuro eu agradece. Sobreviver é uma escolha que se faz ANTES da emergência, em cinco decisões pequenas repetidas. Este painel reúne os cinco lembretes que fazem a diferença entre reagir e estar pronto.

## Lembrete 1 — Preparação é liberdade

Quanto mais você se prepara, menos depende da sorte e mais controle tem sobre o seu destino: aprenda habilidades, tenha equipamentos, fortaleça a mente e cuide da sua saúde. Cada hora de treino compra um grau de liberdade para o dia difícil.

## Lembrete 2 — Água é vida

Sem água você não vai longe: saiba onde encontrar fontes seguras, como tratar sempre (fervura, filtro, químico) e como armazenar com segurança. Economize cada gota — beba em goles, trabalhe na sombra e mantenha uma reserva que você não toca.

## Lembrete 3 — Mente forte sobrevive

O maior desafio nem sempre é o ambiente, mas a sua própria mente: mantenha a calma, controle o medo, foque no presente e lembre-se do seu objetivo. O protocolo STOP (sente-se, pense, observe, planeje) vale mais que qualquer equipamento.

## Lembrete 4 — Equipamento certo faz toda a diferença

Não é sobre ter tudo, mas sobre ter o que realmente importa: escolha com inteligência, conheça o seu equipamento, mantenha em boas condições e tenha sempre o essencial. Peça desconhecida é peso; peça dominada é solução.

## Lembrete 5 — Comece pequeno, comece agora

A escolha acontece no cotidiano: a garrafa cheia na mochila, a isqueira no bolso, o ponto de encontro combinado, o verbete lido da noite. Trinta dias de decisões pequenas constroem o hábito que não falha quando tudo o mais falha.`,
    checklist: [
      "Água tratada e reserva intocada",
      "Kit essencial conferido e dominado",
      "Mente treinada com o STOP nesta semana",
      "Uma habilidade nova praticada hoje",
      "Ponto de encontro e plano revisados",
      "Decisão pequena de preparação feita hoje",
    ],
  },
  {
    slug: "equipamento-e-vida",
    title: "Equipamento é Vida",
    category: "equipamento",
    summary:
      "Mochila, barraca, lanterna, canivete e sistema de água: escolha, conheça e mantenha o que o mantém vivo.",
    image: equipamentoVidaImg,
    imageAlt:
      "Pôster do Centro de Sobrevivência com homem de mochila ao pôr do sol ao lado de garrafa térmica, lanterna a óleo, corda e facas sobre um mapa, listando mochila, barraca, lanterna, canivete multiuso e sistema de água",
    body: `## Equipamento certo não é luxo, é necessidade

Ter o equipamento certo pode garantir sua segurança, seu conforto e aumentar suas chances de sobrevivência. O equipamento certo faz toda a diferença: leve o essencial, conheça o seu equipamento e use com sabedoria. Prepare-se, equipe-se, viva mais.

## Os cinco itens do pôster

- **Mochila** — organização e praticidade para a sua jornada. Regra prática: 20–30 L para o dia, 40–60 L para pernoite. Peso total com água: até 20% do seu corpo. Compartimentos rotulados valem mais que capacidade extra.
- **Barraca** — proteção contra o clima e os perigos da natureza. Estique-a em casa uma vez antes da trilha; confira estacas, varões e teto de chuva a cada saída.
- **Lanterna** — luz no escuro e segurança em qualquer situação. Duas fontes (headlamp + backup), pilhas de reposição e o hábito de conferir carga ANTES de sair.
- **Canivete multiuso** — versatilidade para resolver imprevistos. A lâmina que você já conhece vale mais que a faca nova: use, limpe, seque, afie.
- **Sistema de água** — hidratação é vida, sempre com você: recipiente cheio + filtro ou pastilhas + recipiente de fervura. Três peças que se completam.

## Escolha com inteligência

Prioridade não é marca, é adequação: clima do seu cenário, duração da saída, distância de socorro. Escolha o equipamento que resolve a pior noite provável, não a melhor foto. Duas fontes para o crítico (fogo, luz, água) — nunca uma só.

## Manutenção é sobrevivência

Equipe-se e mantenha: seque tudo antes de guardar, areje a barraca, lubrifique zíperes, teste o filtro, rode as pilhas, confira o kit a cada estação. Equipamento negligenciado falha no pior momento — a manutenção é o treino invisível que nunca falha.`,
    checklist: [
      "Mochila conferida e dentro do peso",
      "Barraca esticada e teto de chuva OK",
      "Duas fontes de luz com pilhas novas",
      "Lâmina limpa, seca e afiada",
      "Sistema de água completo (cheio + filtro + fervura)",
      "Manutenção da estação feita",
    ],
  },
  {
    slug: "sobrevivencia-nao-e-sorte",
    title: "Sobrevivência não é Sorte",
    category: "fundamentos",
    summary:
      "É conhecimento, preparo e prática — o método do ferro rod para virar dependência em autonomia.",
    image: sobrevivenciaNaoSorteImg,
    imageAlt:
      "Pôster do Centro de Sobrevivência com corda, ferro rod (silex) e isca de fibra seca sobre tronco na floresta, com o título Sobrevivência não é sorte: é conhecimento, preparo e prática",
    body: `## É conhecimento, preparo e prática

Sorte não acende fogo na chuva; método acende. O ferro rod da foto não é amuleto — é o resultado de três coisas somadas: você SABER como usar, TER o item no kit e TER ACERTADO antes, de propósito, em condições ruins. Repita a tríade em cada habilidade.

## Conhecimento: o que estudar primeiro

Fogo é o primeiro recurso porque destrava os outros: purifica água, aquece, sinaliza, cozinha. Estude iscas que funcionam úmidas (casca de bétula, fatwood, algodão com vaselina, pano carbonizado), a estrutura teepee para acender e a vala para vento. Depois vá para água, abrigo e orientação — cada um com um verbete deste manual.

## Preparo: o kit mínimo que nunca falta

Ferro rod + isca em recipiente estanque + faca confiável + recipiente de metal. Trata-se de pouco peso (menos de 300 g) que resolve a necessidade número um da noite: calor e água segura. O preparo é transportável — o kit vive NA mochila, não em casa.

## Prática: o padrão das três vezes

Nenhuma habilidade está "pronta" antes de três acertos em três dias diferentes, incluindo um com vento ou chuva. Protocolo do ferro rod: colete três tamanhos de isca, monte o ninho na plataforma seca, puxe o raspador em SUA direção, sopre longo e suave na base da brasa. De olhos fechados, com luvas: esse é o padrão.

## Da dependência à autonomia

Cada repetição troca uma dose de sorte por um grau de autonomia: a isqueira acaba, a bateria morre, o fósforo molha — a técnica fica. Sobrevivência não é sorte: é o acúmulo silencioso de práticas que você esperou nunca precisar, mas levou sempre.`,
    checklist: [
      "Ferro rod + isca estanque no kit",
      "Três acendimentos em três dias feitos",
      "Um acendimento com chuva ou vento",
      "Iscas naturais identificadas na sua região",
      "Facão/faca afiada e segura",
      "Verbete de fogo (condições úmidas) estudado",
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
  fundamentos: "Fundamentos",
  mentalidade: "Mentalidade",
  equipamento: "Equipamento",
};

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
import sinalizacaoResgateImg from "@/assets/manual/sinalizacao-resgate.svg";
import aguaNaturezaImg from "@/assets/manual/agua-natureza.svg";
import fogoLocalImg from "@/assets/manual/fogo-local.svg";
import abrigoLocalImg from "@/assets/manual/abrigo-local.svg";
import forrageamentoImg from "@/assets/manual/forrageamento.svg";
import edc72hImg from "@/assets/manual/edc-72h.svg";
import enchenteImg from "@/assets/manual/enchente.svg";
import incendioFlorestalImg from "@/assets/manual/incendio-florestal.svg";
import terremotoImg from "@/assets/manual/terremoto.svg";
import radioEmergenciaImg from "@/assets/manual/radio-emergencia.svg";
import higieneCampoImg from "@/assets/manual/higiene-campo.svg";
import apagaoUrbanoImg from "@/assets/manual/apagao-urbano.svg";

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
    | "equipamento"
    | "sinalizacao"
    | "alimentos"
    | "desastres"
    | "comunicacao"
    | "higiene"
    | "urbano";
  summary: string;
  image: string;
  imageAlt: string;
  body: string;
  /** Passo a passo de execução — a sequência operacional do verbete. */
  passos?: string[];
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
    passos: [
      "Avalie a segurança da cena e proteja-se (luvas ou plástico)",
      "Aplique pressão direta firme por 5–10 min sem espiar",
      "Eleve o membro (se sem fratura suspeita)",
      "Fixe curativo compressivo e confira pulso/cor abaixo",
      "Irrigue com água limpa e remova detritos visíveis",
      "Cubra com curativo estéril e registre o horário",
      "Torniquete só em hemorragia grave de membro — anote a hora",
    ],
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
    passos: [
      "Retire a vítima do vento, chuva e contato com o solo",
      "Remova TODA roupa molhada (corte se preciso)",
      "Monte o envelope: plástico → isolante seco → camada externa",
      "Cubra cabeça e pescoço",
      "Calor suave no tronco: garrafas mornas em axilas/virilha",
      "Líquidos quentes açucarados SÓ se alerta e engolindo bem",
      "Manuseio suave sempre — brusquidão provoca parada",
    ],
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
    passos: [
      "Colete três tamanhos de isca e mantenha secos",
      "Monte ninho de isca em plataforma protegida do solo",
      "Prepare gravetos e lenha ANTES de acender",
      "Puxe a faísca do ferro rod EM DIREÇÃO a você",
      "Sopro longo e suave na base da brasa",
      "Alimente por tamanho crescente até a chama sustentar",
      "Apague com água + mexer + água; confira ao toque",
    ],
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
    passos: [
      "Filtre o grosso (pano/coffee filter) antes de tudo",
      "Ferva 1 min (3 min acima de 2.000 m) OU",
      "Trate com pastilha de cloro seguindo o tempo do rótulo",
      "Alternativa: filtro de cerâmica/bomba de campo",
      "Guarde o purificado em recipiente LIMPO e rotulado",
      "Separe sempre suja e limpa (duas garrafas)",
      "Repurifique qualquer água armazenada há dias",
    ],
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
    passos: [
      "Estique a corda entre dois pontos firmes (A-frame)",
      "Fixe a lona com a abertura contra o vento dominante",
      "Deixe um lado baixo para bloquear vento e chuva",
      "Instale o isolamento do solo (folhagem/manta) antes de deitar",
      "Cave micro-dreno lateral se o solo estiver úmido",
      "Confira ângulo: chuva escorre, não acumula",
      "Teste à noite: deite e verifique cobertura e ventilação",
    ],
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
    passos: [
      "Bowline: faça o coelho sair do buraco, contornar a árvore e voltar",
      "Treine bowline 10× com um olho fechado",
      "Taut-line hitch: laços de ajuste — teste puxando a corda",
      "Prussik: laço duplo no cabo — teste a subida",
      "Clove hitch: fixação rápida em poste/tronco",
      "Confira cada nó puxando antes de carregar peso",
      "Regra: nó que não confia, refaz — nó nunca é 'quase'",
    ],
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
    passos: [
      "Oriente o mapa: norte do mapa alinhado com o norte real",
      "Compense a declinação magnética da região no rumo",
      "Identifique 3 referências visíveis (crista, rio, estrada)",
      "Rume com azimute: bússola apontada, ponto à frente, caminhe até ele",
      "Repita o azimute a cada referência alcançada",
      "Meça passos (contagem dupla) para estimar distância",
      "Em área fechada: azimute + contagem de passos vence o 'achismo'",
    ],
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
    passos: [
      "Escolha UMA habilidade da lista por semana",
      "Leia o verbete completo antes de tentar",
      "Treine em casa/terreno seguro 3×",
      "Treine a 4ª vez em condição adversa (noite, chuva)",
      "Anote no caderno o que falhou e o ajuste",
      "Ensaie o roteiro de verificação com o kit real",
      "Repita o ciclo com a próxima habilidade",
    ],
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
    passos: [
      "Calcule a necessidade: 3 L/pessoa/dia (mais em calor)",
      "Confira as três peças: recipiente cheio, filtro, fervura",
      "Defina rotação de stock a cada 6 meses",
      "Treine a purificação uma vez por estação",
      "Monte dois pontos de água: casa e mochila",
      "Sinalize data em cada recipiente",
      "Refaça o cálculo quando a família mudar",
    ],
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
    passos: [
      "Avalie cada pilar (água, comida, abrigo, energia, segurança) com nota 0–5",
      "Comece pelo pilar com MENOR nota",
      "Compre/organize em três estágios: 72 h, 2 semanas, 1 mês",
      "Teste um pilar por mês com apagão simulado de 12 h",
      "Documente o que faltou no teste",
      "Reponha e rode o estoque (primeiro que entra, primeiro que sai)",
      "Refaça a avaliação a cada trimestre",
    ],
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
    passos: [
      "Liste os 5 riscos reais da sua região (enchente, seca, apagão…)",
      "Priorize o risco mais provável e mais impactante",
      "Monte plano escrito para cada um dos 3 primeiros",
      "Compartilhe o plano com quem mora com você",
      "Marque data anual de revisão do plano",
      "Exercite a evacuação uma vez por ano",
      "Guarde cópia dos documentos no plano",
    ],
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
    passos: [
      "Mapeie dependências críticas: energia, água, comida, comunicação",
      "Escolha UMA dependência para reduzir este mês",
      "Implante a redução (ex.: filtro em vez de galão)",
      "Meça o custo e a autonomia ganha",
      "Ensine alguém da casa a operar a solução",
      "Registre o progresso no caderno",
      "Repita com a próxima dependência",
    ],
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
    passos: [
      "Treine a regra do PARAR: pare, respire, observe, planeje",
      "Ensaie a respiração 4-4-6 em situações de stress leve",
      "Divida o problema grande em três passos pequenos",
      "Defina meta da próxima hora (não da semana)",
      "Mantenha rotina mínima: hidratação, comida, anotações",
      "Fale alto o plano — a voz organiza o pensamento",
      "Reveja decisões só em paradas planejadas",
    ],
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
    passos: [
      "Escolha o hábito de preparação mais pequeno possível",
      "Fixe horário fixo (ex.: domingo, 10 min de kit)",
      "Use checklist impresso na porta",
      "Registre em sequência (não quebre a corrente)",
      "Recompense a corrente, não o episódio",
      "Quando falhar, retome no dia seguinte sem drama",
      "Suba o grau só após 30 dias de corrente",
    ],
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
    passos: [
      "Reconheça o momento de decisão e nomeie-o alto",
      "Avalie: água, abrigo, sinal — em 60 segundos",
      "Escolha UMA ação e execute",
      "Reavalie após cada ação executada",
      "Registre a decisão e o resultado no caderno",
      "Ensaie decisões em treino (a cabeça repete o que treinou)",
      "Compartilhe o caso com o grupo — decisão ensina",
    ],
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
    passos: [
      "Confira os cinco itens: mochila, barraca, lanterna, canivete, água",
      "Teste cada um em uso real (não na prateleira)",
      "Seque tudo antes de guardar",
      "Rode pilhas e confira carga antes de sair",
      "Lubrifique zíperes e afie lâminas por estação",
      "Verifique peso total (≤20% do corpo)",
      "Anote o que faltou na última saída",
    ],
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
    passos: [
      "Estude o verbete da habilidade alvo",
      "Monte o kit mínimo da tríade (conhecimento, item, prática)",
      "Acerte a habilidade 3× em 3 dias diferentes",
      "Faça uma execução em condição adversa",
      "Registre os 3 acertos no caderno",
      "Ensine alguém — ensinar fixa",
      "Programe a revisão em 90 dias",
    ],
    checklist: [
      "Ferro rod + isca estanque no kit",
      "Três acendimentos em três dias feitos",
      "Um acendimento com chuva ou vento",
      "Iscas naturais identificadas na sua região",
      "Facão/faca afiada e segura",
      "Verbete de fogo (condições úmidas) estudado",
    ],
  },
  {
    slug: "sinalizacao-resgate",
    title: "Sinalização e Chamada de Resgate",
    category: "sinalizacao",
    summary:
      "Faça quem procura você achar: espelho, fumaça, SOS no chão e os três toques do apito.",
    image: sinalizacaoResgateImg,
    imageAlt:
      "Ilustração tática de sinalização de resgate: espelho refletindo sol, três símbolos SOS desenhados no chão e colunas de fumaça",
    body: `## A lógica de ser encontrado

Resgate é um problema de probabilidade: quanto mais você sinaliza, por mais meios e por mais tempo, maior a chance de alguém perceber. A regra dos três (três toques, três fumaças, três marcas) é o idioma universal de socorro — qualquer equipage de busca entende. Sinalize em Local aberto e ALTO: crista, clareira, margem. Sinal que ninguém vê vale zero.

## Os meios, em ordem de alcance

- **Apito**: três toques longos, pausa, repetição. Vai mais longe que a voz e não cansa o operador. Traga no cordão do zíper — é o item de melhor custo-benefício do kit.
- **Espelho de sinalização** (ou tela de celular): um clarão refletido visível a dezenas de quilômetros em dia claro. Aponte pelo "V" dos dedos: um dedo para o alvo, o reflexo no outro.
- **Fumaça**: fogueira preparada com galhada verde para fumaça branca de dia; chama alta e gasolina controlada para luz de noite. Três colunas em linha são reconhecidas como socorro.
- **SOS no chão**: pedras, galhos ou raspar o solo. Cada letra com no mínimo 6 metros de altura — legível de avião. Longe de árvores que escondam a marca.
- **Cor**: poncho laranja, capa de emergência, bandeja invertida — contraste com a mata é avistado por helicóptero.

## Radioescuta e previsão

Sinalize PERTO de onde você está, não onde "achou que seria melhor": quem busca volta ao último ponto conhecido. Deixe marcas de progresso (flechas de fita) na direção real do movimento. Se ouvir aeronave, economize o espelho para o momento em que ela vem à sua direção — o clarão perde força contra o sol baixo.`,
    passos: [
      "1. Escolha o ponto de sinalização: local aberto, alto e visível de vários ângulos",
      "2. Monte a fogueira de fumaça com galhada verde ao lado, pronta para acender rápido",
      "3. Desenhe SOS no chão com material contrastante, letras de 6 m ou mais",
      "4. Toque o apito: 3 toques longos, pause 30 s, repita — sempre no mesmo ritmo",
      "5. No avistamento de aeronave, use o espelho: reflexo estável e direcionado",
      "6. Deixe fita/flecha indicando a direção real do seu deslocamento",
      "7. Repita todo o ciclo de sinalização a cada mudança de luz (manhã/tarde)",
    ],
    checklist: [
      "Apito no corpo (não na mochila)",
      "Espelho ou tela de celular funcional",
      "Fogueira de fumaça preparada",
      "SOS no chão com 6 m de letra",
      "Local alto e aberto escolhido",
      "Marcas de direção deixadas na trilha",
    ],
  },
  {
    slug: "agua-natureza",
    title: "Encontrar e Coletar Água na Natureza",
    category: "water",
    summary:
      "Onde procurar, como coletar com saco de transpiração e destilador solar — e por que TODA água de campo é purificada.",
    image: aguaNaturezaImg,
    imageAlt:
      "Ilustração tática de coleta de água: saco de transpiração em galho, destilador solar no solo e rio com barras de fluxo",
    body: `## Onde a água se esconde

Comece pelo relevo: água escorre para baixo e se acumula onde o terreno aperta. Vales com vegetação densa, leitos de rio secos (cave na curva externa, lado oposto à corrente), rochas côncavas ao amanhecer e a base de falésias sombrias guardam água. Animais apontam: trilhas convergindo ao anoitecer, abelhas a menos de 1 km, aves voando baixo e direto ao entardecer. Cactos e bambus guardam água potável na polpa — o bambu oco cheio é o achado mais seguro da mata tropical.

## Coleta sem fonte visível

- **Saco de transpiração**: saco plástico bem fechado em galho folhado e ensolarado. A planta transpira água limpa — 200 a 500 ml por dia por saco, sem filtro, sem fervura.
- **Destilador solar**: buraco no solo, recipiente no centro, plástico selado com pedra no meio. Sol destila água do solo (e purifica a suja que você despeja ao redor) — lento, mas funciona em areia úmida.
- **Condensação da manhã**: pano embebido no orvalho da vegetação alta antes do sol; esprema em recipientes.
- **Chuva**: qualquer superfície limpa é telhado — poncho esticado em vale, capa de emergência.

## Purificação não é opcional

Giardia, E. coli e hepatite A não dão aviso. Fervura por 1 minuto (3 min acima de 2.000 m) é o método infalível; filtro de cerâmica/sarjeta com pastilha de cloro cobre o dia a dia. Água de aparência cristalina mata tanto quanto a turva — o critério é o TRATAMENTO, não o visual.`,
    passos: [
      "1. Leia o terreno: procure vales fechados, leitos secos e curvas de rio (cave na curva externa)",
      "2. Procure indicadores de vida: trilhas de animais convergindo, abelhas, aves ao entardecer",
      "3. Colete de imediato: monte 2 a 4 sacos de transpiração em galhos ensolarados",
      "4. Monte o destilador solar no solo úmido antes do meio-dia (sol alto = mais produção)",
      "5. Recolha orvalho com pano na vegetação alta ao amanhecer",
      "6. Purifique TUDO que coletar de fonte natural: fervura 1 min ou filtro + pastilha",
      "7. Estoque o purificado em recipiente fechado e identifique qual é o limpo",
    ],
    checklist: [
      "Fonte encontrada ou coletores instalados",
      "Fervura/filtro/pastilha disponíveis",
      "Recipientes limpos e tampados",
      "Sacos de transpiração rodando ao sol",
      "Destilador solar montado em solo úmido",
      "Água suja e limpa separadas",
    ],
  },
  {
    slug: "fogo-local",
    title: "Escolher o Local e Montar a Fogueira",
    category: "fire",
    summary:
      "Local seguro, três arranjos de fogueira e a ordem dos três tamanhos de combustível — a anatomia do fogo que não falha.",
    image: fogoLocalImg,
    imageAlt:
      "Ilustração tática dos três arranjos de fogueira (teepee, cabana, estrela), três tamanhos de lenha e parede de vento",
    body: `## O local decide metade do resultado

Escolha chão plano, a 2 m ou mais de rochas que possam estourar, longe de galhos secos pendurados e de raízes (o fogo corre por raiz). Limpe um círculo de 1 m até a terra nua; em vento, cave a fogueira levemente ou monte parede de pedra/madeira no lado do vento. Em solo úmido ou nevado, plataforma de troncos evita que o fogo afunde e morra.

## Os três arranjos e o que cada um faz

- **Teepee (conico)**: isca no centro, gravetos em cone ao redor. Chama vertical rápida — é o arranjo para ACENDER, e o primeiro estágio de qualquer fogueira.
- **Cabana (log cabin)**: gravetos empilhados em quadrado sobre as brasas do teepee. Brasas abundantes para cozinhar — o arranjo de trabalho.
- **Estrela**: troncos longos empurrados para o centro. Queima lenta, dura a noite, gasta pouco — o arranjo de pernoite; empurre conforme precise.

## A ordem que nunca falha

Três tamanhos preparados ANTES de acender: isca (que pega de faísca), gravetos finos (groselha de fósforo), e lenha crescente. Acenda contra o vento, de baixo, e adicione tamanho só quando a camada anterior sustenta chama. Na chuva: isca debaixo do poncho, gravetos do interior de troncos caídos, e paciência — um fogo de chuva se constrói em camadas pequenas e persistentes. Apagar é técnica: água, mexer, água de novo, mão no chão fria antes de sair.`,
    passos: [
      "1. Escolha o local: chão plano, longe de galhos secos, raízes e rochas soltas",
      "2. Limpe círculo de 1 m até a terra nua; monte parede de vento se necessário",
      "3. Prepare os três tamanhos: isca, gravetos finos e lenha crescente (mão no kit, não na mata)",
      "4. Monte o teepee com a isca no centro e acenda contra o vento, de baixo para cima",
      "5. Sopre longo e suave na base da brasa — nunca de perto nem rápido",
      "6. Transite para cabana (cozinhar) ou estrela (pernoite) conforme a necessidade",
      "7. Para apagar: água, mexa as brasas, água de novo — só saia com tudo frio ao toque",
    ],
    checklist: [
      "Círculo de segurança de 1 m limpo",
      "Isca seca em recipiente estanque",
      "Três tamanhos de lenha separados",
      "Parede de vento (se vento)",
      "Água/areia para apagar ao alcance",
      "Fogo morto confirmado ao toque",
    ],
  },
  {
    slug: "abrigo-local",
    title: "Escolher o Local do Abrigo",
    category: "shelter",
    summary:
      "As cinco regras do terreno que valem antes de qualquer técnica de construção — onde você dorme decide como você acorda.",
    image: abrigoLocalImg,
    imageAlt:
      "Ilustração tática de escolha de local de abrigo: abrigo baixo protegido do vento, checagem de leito de rio e árvores mortas",
    body: `## O terreno vem antes da técnica

Um abrigo mal localizado falha mesmo bem construído. As cinco regras de campo: **1)** leito de rio é proibido — a enxurrada não avisa; **2)** nunca embaixo de árvore morta ou galho pendurado ("widow makers" derrubam sem vento); **3)** longe de cristas expostas (vento e frio) e do fundo de vales (poço de ar frio e umidade); **4)** perto de água, não EM cima dela — 30 a 60 m de distância evita insetos, animais e subida repentina de nível; **5)** meio de ladeira, terreno plano e drenável, com o rabo do abrigo contra o vento dominante.

## Ler o que o local conta

Solo que afunda sob o calcanhar retém chuva — teste com o pé, não com o olho. Cheque o teto: o que cai de árvore à noite (galho, fruto, seiva) vira problema. Procure sinais de água parada recente (lama seca, folhas aderidas em troncos) — linha de chegada da última chuva. Conte folhas caídas ao redor: material de isolamento abundante no local vale mais que abrigo bonito longe dele.

## Orientação e microclima

Nas latitudes do Brasil, orientar a abertura para leste pega o sol cedo e escapa do sol da tarde; no calor extremo, a prioridade inverte — sombra o dia inteiro. Em campo aberto, o abrigo baixo (60–90 cm de altura) vence o vento; na mata, o deformado de folhagem esconde e isola. Faça a cama antes do teto: o solo rouba calor 25× mais rápido que o ar — 20 cm de isolamento abaixo do corpo não é luxo, é o próprio abrigo.`,
    passos: [
      "1. Aplique as cinco regras: fora de leito, longe de árvore morta, meio de ladeira, 30–60 m de água, plano",
      "2. Teste o solo com o calcanhar: firme e drenável, sem depressão que acumule água",
      "3. Cheque o teto contra galhos pendurados e colmeias",
      "4. Identifique a direção do vento dominante e planeje o abrigo com o rabo contra ele",
      "5. Conte o material de isolamento ao redor (folhagem seca, folhas de palmeira)",
      "6. Monte primeiro o isolamento do solo (20 cm), depois o teto",
      "7. Antes de dormir, confirme rota de saída rápida e sinal de emergência à mão",
    ],
    checklist: [
      "Fora de leito de rio e de vaso de enxurrada",
      "Nenhum galho morto sobre o local",
      "Meio de ladeira, terreno plano",
      "30–60 m da fonte de água",
      "Isolamento do solo de 20 cm",
      "Ventilação mantida (CO não acumula)",
    ],
  },
  {
    slug: "forrageamento-basico",
    title: "Forrageamento Seguro e Alimentos de Campo",
    category: "alimentos",
    summary:
      "O teste universal de comestibilidade, as plantas brasileiras mais confiáveis e as regras que mantêm o intestino fechado.",
    image: forrageamentoImg,
    imageAlt:
      "Ilustração tática de forrageamento: três plantas identificadas, etapas do teste universal de comestibilidade e avisos",
    body: `## A regra que primeiro protege

Ninguém morre de fome em uma semana; morre de intoxicação em um prato. Forrageamento suplementa — não substitui — a reserva de comida. A prioridade real em emergência curta é água e abrigo; coma da mata com MARGEM de segurança: identifique 100% da planta (folha, caule, flor, raiz), e em caso de dúvida, a dúvida é não.

## O teste universal (uma planta por vez)

1. Separe uma parte jovem e sadia; cozinhe se possível (cozinhar neutraliza muitos compostos).
2. Esfregue o suco no antebraço e espere 8 horas: ardência, vermelhidão ou coceira eliminam a planta.
3. Toque nos lábios 15 minutos; depois mastigue uma porção mínima sem engolir — queimação, amargor agressivo ou dormência eliminam.
4. Engula uma porção pequena e aguarde 8 horas. Só então coma uma porção normal, da MESMA parte preparada do MESMO jeito.

## Os mais confiáveis no Brasil

Bananeira-brava (fruto e coração, cozidos), taiá/taro (folha e rizoma SEMPRE cozidos — cru arde), pinhão na serra, araçá, jabuticaba, guabiroba, romã (casca e sementes), capim-limão (chá), pequiá e piqui (cuidado com espinhos). **Regras duras**: cogumelos ficam FORA do cardápio de campo (nem com teste — sem antídoto, erro é fatal); plantas de seiva leitosa branca geralmente irritam; frutos de mimeira-de-pecado não existem — se todo animal come, avalie; se nenhum come, desconfie.`,
    passos: [
      "1. Identifique a planta com absoluta certeza (folha, caule, flor, fruto e habitat conferidos)",
      "2. Separe apenas uma parte jovem; prefira cozida a crua",
      "3. Aplique o teste no antebraço e espere 8 horas",
      "4. Toque nos lábios (15 min) e mastigue sem engolir — rejeite amargor agressivo",
      "5. Engule porção mínima e espere outras 8 horas",
      "6. Coma porção normal só da mesma parte, mesmo preparo",
      "7. Registre no caderno a planta testada e o resultado — o conhecimento acumula",
    ],
    checklist: [
      "Identificação 100% confirmada",
      "Teste de 8 h no braço feito",
      "Teste de lábios e mastigação feito",
      "Porção mínima engolida sem reação",
      "Cozimento aplicado quando indicado",
      "Cogumelos descartados por padrão",
    ],
  },
  {
    slug: "mochila-72h",
    title: "Mochila 72 Horas e EDC — o que Carregar",
    category: "equipamento",
    summary:
      "A arquitetura da mochila de emergência: camadas, pesos, os seis sistemas e a regra das duas fontes para tudo que é crítico.",
    image: edc72hImg,
    imageAlt:
      "Ilustração tática de mochila 72h com camadas de organização (topo: socorro e chuva; meio: água, fogo, luz; base: abrigo e comida) e limite de peso",
    body: `## Filosofia: sistemas, não itens

A mochila 72 h carrega os seis sistemas de sobrevivência, em camadas que refletem a urgência de acesso: **água** (3 L por pessoa/dia + filtro + pastilhas), **abrigo** (tarp/poncho + manta térmica + corda), **fogo** (duas fontes: isqueira + ferro rod), **luz** (headlamp + backup), **primeiros socorros** (trauma básico + remédios pessoais) e **comida** (3 dias de itens que não precisam de fogo). EDC (everyday carry) é o núcleo que anda no bolso: canivete, apito, isqueira, lanterna pequena, dinheiro e cópia de documento.

## Organização que funciona sob estresse

Topo da mochila: o que você usa PRIMEIRO no problema — socorro, capa de chuva, lanterna. Meio: água e cozinha. Base: abrigo e reserva de comida — o que você abre uma vez por dia. Bolsos externos: mapas, documentos, kit de higiene compacto. Nada crítico dentro de compartimento duplo: sob estresse, você não vai desmontar a mochila para achar o torniquete. Etiquete por cor ou posição e treine pegar às cegas.

## Peso e manutenção

Limite clássico: 20% do peso corporal com água — acima disso a mobilidade cai e o risco de lesão sobe. Para 72 h urbanas, 8–12 kg bem divididos vencem 6 kg mal distribuídos. Rode o estoque a cada 6 meses (comida, pilhas, remédios) e use a manutenção como treino: abrir, conferir, recolocar é o ensaio que faz a mochila responder quando a cabeça não responde.`,
    passos: [
      "1. Liste os seis sistemas: água, abrigo, fogo, luz, socorro, comida",
      "2. Duplique as fontes críticas: duas de fogo, duas de luz, duas de purificação",
      "3. Organize por urgência de acesso: topo (socorro/chuva), meio (água/fogo), base (abrigo/comida)",
      "4. Monte o EDC de bolso: canivete, apito, isqueira, lanterna, documento, dinheiro",
      "5. Pese a mochila completa: ajuste até 20% do peso corporal",
      "6. Faça o teste das cegas: ache socorro e lanterna sem olhar",
      "7. Agende a revisão semestral: comida, pilhas, remédios e roupas",
    ],
    checklist: [
      "Seis sistemas presentes e completos",
      "Fontes críticas duplicadas",
      "Peso dentro dos 20%",
      "Itens de urgência no topo",
      "Documentos e dinheiro em bolsos",
      "Revisão semestral agendada",
    ],
  },
  {
    slug: "enchente",
    title: "Enchente: Antes, Durante e Depois",
    category: "desastres",
    summary:
      "A água viva derruba adulto em 15 cm — leia os níveis, evacue no tempo certo e volte só com a alça desligada.",
    image: enchenteImg,
    imageAlt:
      "Ilustração tática de enchente: níveis de água marcados, pessoa subindo ao telhado com seta e aviso de correnteza",
    body: `## Antes: o aviso existe

Enchente tem palestrantes de plantão: chuva forte e contínua por horas, rio turvo e subindo, cheiro de terra lavada. Quem mora em área de risco já sabe qual é o ponto de corte do bairro — defina em família o nível que dispara a saída, e o ponto alto de encontro. Kit de mão pronto: documentos em saco plástico, água, remédios, lanterna, rádio a pilha, dinheiro trocado e carregador externo. Desligue a chave geral ANTES da água chegar à instalação.

## Durante: subir, não atravessar

15 cm de água em movimento derrubam um adulto; 60 cm levam um carro — "atravessar rapidinho" é a causa clássica de vítima fatal. Suba em vez de fugir: telhado, laje, morro. Nunca use elevador. Na água, ande de lado, com vara à frente testando o piso; buracos de bocas de lobo são invisíveis. Sinalize do alto com pano colorido e apito — 3 toques. Se estiver em veículo e a água subir, saia pelo vidro/porta IMEDIATAMENTE: o carro flutua e vira.

## Depois: a água que fica

Volte só com aviso da defesa civil. A energia só religa após eletricista conferir a instalação — água e fiação matam por contato dias depois. Água de poço e da torneira só depois de ferver/desinfetar; descarte alimento que tocou a lama (não confie em "só a embalagem"). Fotografe os danos para o seguro/defesa civil, limpe com água e sabão + solução desinfetante, e cuide da leptospirose: luvas e botas em qualquer contato com lama, e febre nos 14 dias seguintes pede médico e a menção EXPLÍCITA de contato com enchente.`,
    passos: [
      "1. Defina em família o nível de disparo da evacuação e o ponto alto de encontro",
      "2. Monte o kit de mão: documentos em plástico, água, remédios, lanterna, rádio, dinheiro",
      "3. Com chuva contínua, acompanhe o nível do rio e a previsão — saia DE DIA e a seco",
      "4. Desligue chave geral e gás antes da água chegar",
      "5. Na água viva: não atravesse a pé nem de carro — suba (telhado, laje, morro)",
      "6. Do ponto alto, sinalize com pano colorido e apito (3 toques)",
      "7. Volte só com liberação; elétrica conferida, água fervida, alimentos tocados descartados",
    ],
    checklist: [
      "Ponto de corte e encontro definidos",
      "Documentos embalados em plástico",
      "Energia e gás desligados (antes da água)",
      "Nenhuma travessia de água viva",
      "Sinalização do ponto alto ativa",
      "Retorno só após liberação oficial",
    ],
  },
  {
    slug: "incendio-florestal",
    title: "Incêndio Florestal: Escape e Proteção",
    category: "desastres",
    summary:
      "O fogo sobe morro mais rápido que você corre — leia o vento, busque o queimado e proteja as vias aéreas.",
    image: incendioFlorestalImg,
    imageAlt:
      "Ilustração tática de incêndio florestal: frentes de fogo, área queimada como refúgio, seta de fuga a favor do vento e aviso de subida",
    body: `## Física que decide a fuga

O fogo corre 2 a 3× mais rápido morro acima; cristas e canhões (vales estreitos) funcionam como chaminas e são proibidos como rota. A frente principal avança A FAVOR do vento — fuga é na direção oposta à inclinação da fumaça e para LADO, não para cima. Observe a fumaça: vertical = fogo calmo; deitada e escura = fogo acelerando com vento.

## Onde se refugiar

A área JÁ QUEIMADA é o refúgio clássico: não há combustível à frente. Rios, lagos, estradas de terra larga, clareiras e plantações verdes (baixo combustível) são alternativas. Se o fogo fechar: deite no queimado ou em clareira baixa, proteja vias aéreas com pano úmido, cubra o corpo, e espere a frente passar — ela passa em minutos onde já queimou. NUNCA tente vencer a frente em descida livre por mata fechada.

## Proteção e prevenção

Roupas de algodão/lã (sintético derrete na pele), mangas compridas, óculos, lenço no nariz. Molhe roupas e cabeça se houver água. Em casa: limpe faixa de 10 m sem material seco, mangueira pronta, e evacue ANTES do aviso — o pânico da saída mata tanto quanto a chama. Nada de fogueira em dia de vento e seca; vidro e estilhaço de vidro também acendem.`,
    passos: [
      "1. Leia a fumaça: direção e cor indicam vento e velocidade do fogo",
      "2. Rota de fuga LATERAL e morro abaixo — nunca crista, canhão ou subida em mata fechada",
      "3. Vá para área queimada, rio, estrada larga ou clareira (pouco combustível)",
      "4. Vista algodão/lã, cubra cabeça; molhe roupa e pano de vias aéreas se possível",
      "5. Se a frente fechar: deite no queimado/clareira, proteja respiração, espere passar",
      "6. Em casa, evacue antes do aviso com kit e documentos; deixe portas fechadas (segura chama)",
      "7. Avise o 193 com ponto de referência visível — informação cedo vale brigada cedo",
    ],
    checklist: [
      "Direção do vento confirmada",
      "Rota lateral e baixa definida",
      "Refúgio de baixo combustível escolhido",
      "Vias aéreas protegidas com pano úmido",
      "Sintéticos fora do corpo",
      "Bombeiros avisados (193)",
    ],
  },
  {
    slug: "terremoto",
    title: "Terremoto: Agachar, Cobrir, Esperar",
    category: "desastres",
    summary:
      "Os três verbos que valem no mundo inteiro, os lugares que matam e o protocolo dos três mergulhos depois que para.",
    image: terremotoImg,
    imageAlt:
      "Ilustração tática de terremoto: três figuras demonstrando agachar, cobrir com mesa e esperar em local seguro",
    body: `## Os três verbos, sem exceção

Tremendo: AGACHAR (joelhos no chão, centro de massa baixo), COBRIR (sob mesa firme ou contra parede estrutural interna, protegendo cabeça e nuca com braços), ESPERAR (até o tremor parar — não tente correr nem sair de escada/elevador em movimento). Quem corre durante o tremor é atingido por vidro, fachada e objetos — o lugar mais seguro do prédio é DENTRO dele, agachado. Longe de: janelas, espelhos, armários altos, luminárias penduradas.

## Depois que para

Aguarde os AFTERSHOCKS: o primeiro mergulho é o aviso, os seguintes derrubam o que ficou solto. Cheque gás (cheiro = feche o registro e saia), eletricidade e rachaduras estruturais. Saia pelas ESCADAS com calma, levando calçados e kit. Fique longe de fachadas, vidros e fiação ao ar livre. Telefones: prefira mensagens (SMS/WhatsApp) — chamadas lotam a rede; reserve ligações para emergência real. Pontos de encontro e o nome de contato fora da cidade devem estar combinados ANTES.

## Preparação antecipada

Prenda à parede estantes, água quente e armários altos (o que cai mata mais que o prédio). Identifique a mesa firme de cada cômodo. Kit de mão e sapatos firmes ao lado da cama — vidro no chão é o primeiro ferimento da noite. Quem vive em prédio: conheça as duas rotas de escada e o ponto de encontro do condomínio.`,
    passos: [
      "1. Durante o tremor: agache, cubra sob mesa firme, espere — longe de vidro e armários",
      "2. Proteja cabeça e nuca com os braços em qualquer posição",
      "3. Não use escada nem elevador DURANTE o tremor",
      "4. Parado: calce sapatos, cheque gás (cheiro = feche registro), luz e rachaduras",
      "5. Desça por escada com kit; fique longe de fachadas e fiação na rua",
      "6. Comunique por mensagem, não por chamada; reservas 190/193/199 para urgência",
      "7. Espere aftershocks longe do prédio; volte só com vistoria",
    ],
    checklist: [
      "Mesa firme identificada em cada cômodo",
      "Móveis altos presos à parede",
      "Sapatos e lanterna ao lado da cama",
      "Gás e eletricidade conferidos após tremor",
      "Rotas de escada conhecidas",
      "Contato fora da cidade combinado",
    ],
  },
  {
    slug: "radio-emergencia",
    title: "Rádio de Emergência e Comunicação",
    category: "comunicacao",
    summary:
      "Frequências que salvam, disciplina de mensagem e o rádio a pilha que vale mais que cem teorias quando a rede cai.",
    image: radioEmergenciaImg,
    imageAlt:
      "Ilustração tática de rádio de emergência com antenas, faixas AM/FM/VHF anotadas e disciplina de mensagem",
    body: `## O rádio é o último offline

Celular depende de torre e energia — exatamente o que falta em desastre. Um rádio AM/FM a pilha ou manivela mantém o operador informado com avisos oficiais (defesa civil e rádios públicas transmitem em AM/FM) e é item obrigatório da mochila 72 h. Ouça nos horários de boletim; anote instruções num caderno — memória sob estresse falha.

## Frequências que valem memorizar

- **VHF marítimo canal 16 (156,8 MHz)**: socorro marítimo internacional — monitorado por guardas e embarcações; funciona de costa e barco.
- **Aviação 121,5 MHz**: emergência aeronáutica; qualquer rádio VHF sintonizável capta e reporta.
- **AM 520–1710 kHz e FM 87,5–108 MHz**: boletins civis.
- **Rádio amador (HF/VHF)**: redes de emergência organizadas por radioamadores operam em desastre com prioridade de tráfego — se um rádio amador estiver no grupo, você tem canal direto com o mundo.

## Disciplina de mensagem

Mensagem de socorro tem formato: **QUEM** (nome/grupo), **ONDE** (referência e coordenadas), **O QUÊ** (número de pessoas, estado, necessidade), **QUANTOS** (quanto tempo aguenta). Fale devagar, soletração clara, repita 3×, aguarde resposta (radioescuta 30 s antes de transmitir para não pisar em tráfego de terceiros). Em grupo, defina um operador — rádio é fila única: quem fala em cima não é ouvido.`,
    passos: [
      "1. Monte o rádio da mochila: pilhas novas + manivela/carregador solar de backup",
      "2. Anote as frequências-chave no corpo do rádio ou no caderno do kit",
      "3. Ouça boletins nos horários fixos e anote instruções",
      "4. Para chamar socorro: QUEM, ONDE, O QUÊ, QUANTOS — nessa ordem, sem pressa",
      "5. Repita a mensagem 3× e faça radioescuta de 30 s entre transmissões",
      "6. Em grupo, um único operador mantém a fila organizada",
      "7. Combine horário de radioescuta familiar (ex.: 12 h e 18 h) quando separados",
    ],
    checklist: [
      "Rádio a pilha/manivela no kit",
      "Pilhas de reserva rodadas",
      "Frequências anotadas",
      "Caderno e lápis junto",
      "Horário de escuta combinado",
      "Formato QUEM-ONDE-O QUÊ-QUANTOS treinado",
    ],
  },
  {
    slug: "higiene-campo",
    title: "Higiene e Saúde em Campo",
    category: "higiene",
    summary:
      "A sanitária que evita o hospital: banheiro, mãos, água, pés e o lixo — oitenta por cento das doenças de campo vêm daqui.",
    image: higieneCampoImg,
    imageAlt:
      "Ilustração tática de higiene em campo: buraco sanitário a 60 m da água, lavagem de mãos e cuidados com os pés",
    body: `## O banheiro decide a saúde do acampamento

Fezes contêm a bactéria que envenena o acampamento inteiro via lençol e mosca. Buraco sanitário: 20 cm de diâmetro, 20 cm de profundidade, NO MÍNIMO 60 m de qualquer água, trilha e acampamento; tampe com terra a cada uso e RECOLHA o local ao final (tampa de terra compacta + marcador). Papel vai no buraco ou volta com você — nunca enterrado superficial. Urina longe do banheiro e da água. Em grupo, banheiro único e definido: banheiro disperso é contaminação dispersa.

## Mãos e água

Lavar as mãos com sabão (20 s) antes de comer, depois do banheiro e após manusear animal — sabão compacto ou álcool gel 70% no bolso resolve. A água para beber, escovar e lavar louça é a MESMA purificada; água "só para escovar" é a porta da diarreia. Louça: raspe, lave com água quente, enxágue purificada, seque ao ar. Comida coberta em todas as refeições — a mosca é o garçom da disenteria.

## Pés, lixo e dentes

Pé de campo que não falha: meia limpa e seca ao fim do dia, bolha tratada na hora (furado no chão com agulha esterilizada, mantida limpa), sapato seco à noite. Lixo: embalagens voltam com o grupo; cinzas de fogueira frias se espalham; restos de comida NUNCA enterrados (animal desenterra e aprende a procurar acampamento). Dentes e boca não tiram férias — a escovação com água purificada previne problema que imobiliza em trilha.`,
    passos: [
      "1. Escolha o banheiro único: 60 m de água/trilha/campamento, solo firme",
      "2. Cave buraco de 20 cm por uso; tampe sempre e recolha ao fim",
      "3. Lave as mãos (20 s, sabão) antes de comer, após o banheiro e após animal",
      "4. Use a MESMA água purificada para beber, escovar e lavar louça",
      "5. Trate bolha imediatamente e troque meia seca ao fim do dia",
      "6. Todo lixo volta; restos de comida nunca enterrados",
      "7. Ao sair: nada visível do acampamento além de folhas alisadas",
    ],
    checklist: [
      "Banheiro único a 60 m da água",
      "Buracos tampados e recolhidos",
      "Sabão/álcool no bolso",
      "Água purificada para tudo",
      "Meia seca trocada à noite",
      "Lixo embalado para levar",
    ],
  },
  {
    slug: "apagao-urbano",
    title: "Apagão Urbano: Sem Luz, Sem Água, Sem Elevador",
    category: "urbano",
    summary:
      "Blackout residencial com método: luz por cômodo, água estocada, comida fria segura e o rádio que mantém a família informada.",
    image: apagaoUrbanoImg,
    imageAlt:
      "Ilustração tática de apagão urbano: prédio escuro com um ponto de luz, estoque de água e geladeira fechada",
    body: `## Primeiros 10 minutos

Confirme se o apagão é do prédio ou da rua (olhe a janela, a rua, chame a companhia). Desligue aparelhos e a chave geral dos circuitos de uso pesado — a Onda de retorno quando a luz volta queima eletrônicos e reinicia incêndio. Uma fonte de luz por cômodo (lanterna de cabeça vence celular: mão livre). Velas só com supervisão e longe de cortina; fósforos à prova de vento no kit.

## Água e comida

Torre e bomba morrem com a luz: estanque uma panela grande nos primeiros minutos (a água do encanamento de cima ainda vem) e feche o registro se houver suspeita de contaminação. Regra de estoca: 4 L por pessoa por dia (beber + cozinhar + higiene mínima). Geladeira fechada aguenta 4 h; freezer cheio 48 h — coma primeiro os perecíveis, e nada de testar "se ainda está bom": em dúvida, fora. Cozinha de apagão: fogão a gás ou de campismo FORA do ambiente fechado (CO mata silenciosamente).

## Confinamento e informação

Rádio a pilha nas horas de boletim — o apagão pode ser regional e a informação oficial chega por ele. Eleve o ponto de luz para iluminar o corredor; marque degraus de escada com fita refletiva. Chegue os vizinhos de idade e quem mora sozinho — prédio que se organiza em apagão é o que dura. Elevador: proibido por definição; escada com lanterna e companhia.`,
    passos: [
      "1. Confirme a extensão do apagão (prédio × rua × cidade) e acione a companhia",
      "2. Desligue aparelhos e circuitos pesados — protege contra a onda de retorno",
      "3. Distribua uma luz por cômodo; headlamp para as mãos",
      "4. Estoque água imediato (panela/balde fechado) e confira o estoque de 4 L/pessoa/dia",
      "5. Geladeira/freezer fechados; coma perecíveis primeiro, descarte na dúvida",
      "6. Cozinhe com gás/campismo FORA de ambiente fechado",
      "7. Rádio a pilha nos boletins; cheque vizinhos de idade e marque escada",
    ],
    checklist: [
      "Onda de retorno neutralizada (aparelhos desligados)",
      "Uma luz por cômodo funcionando",
      "Água de consumo garantida",
      "Geladeira fechada e ordem de consumo definida",
      "Rádio a pilha no ar",
      "Vizinhos vulneráveis conferidos",
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
  sinalizacao: "Sinalização e Resgate",
  alimentos: "Alimentos e Forrageamento",
  desastres: "Desastres Naturais",
  comunicacao: "Comunicação",
  higiene: "Higiene e Saúde",
  urbano: "Meio Urbano",
};

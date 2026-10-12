/**
 * Material de divulgação do lançamento — fonte única da aba "Divulgação"
 * do painel administrativo.
 *
 * Conteúdo operacional (pt-BR, uso do dono do projeto): links da campanha,
 * passo a passo do Search Console/Bing, plano da semana 2 (D1–D7), posts
 * prontos para copiar, criativos servidos de /divulgacao/ e metas de medição.
 *
 * Os criativos e o guia em PDF vivem em public/divulgacao/ e são servidos
 * como arquivos estáticos — o painel apenas aponta para eles.
 */

/** Base canônica do app (mesma constante conceitual do sitemap e do seo.ts). */
export const BASE_DIVULGACAO = "https://manualdosobrevivente.vercel.app";

/** Endereço do sitemap dinâmico anunciado no robots.txt. */
export const URL_SITEMAP = `${BASE_DIVULGACAO}/api/sitemap`;

/** Monta o endereço completo de um caminho da campanha. */
export function linkCompleto(caminho: string): string {
  return `${BASE_DIVULGACAO}${caminho}`;
}

/* ------------------------------------------------------------------ */
/* Fundação da semana 1 (o que já está no ar)                          */
/* ------------------------------------------------------------------ */

export interface Fundacao {
  texto: string;
}

export const FUNDACAO_SEMANA1: Fundacao[] = [
  {
    texto:
      "robots.txt no ar — vitrine aberta para os buscadores, núcleo do app trancado (/admin, /dashboard, /inventory…).",
  },
  {
    texto:
      "Sitemap dinâmico em /api/sitemap — 6 páginas de vitrine + todos os verbetes do Manual; cada verbete novo entra sozinho no próximo deploy.",
  },
  {
    texto:
      "Vitrine sem portão: /manual, /tutorial, /colaboradores, /apoiar e /parceiros abrem sem login — a campanha tem para onde apontar.",
  },
  {
    texto:
      "Canonical e og:url corretas em toda a vitrine — uma declaração por página, sem vazamento da raiz.",
  },
];

/* ------------------------------------------------------------------ */
/* Links da campanha                                                   */
/* ------------------------------------------------------------------ */

export interface LinkCampanha {
  rotulo: string;
  caminho: string;
  descricao: string;
}

export const LINKS_CAMPANHA: LinkCampanha[] = [
  {
    rotulo: "Manual (página principal)",
    caminho: "/manual",
    descricao:
      "O coração da vitrine: abertura, busca e todos os verbetes. Use este link na maior parte da campanha.",
  },
  {
    rotulo: "Verbere destaque — purificar água",
    caminho: "/manual/water-purification",
    descricao:
      "A página mais concreta para iniciar conversa: um problema real com solução passo a passo.",
  },
  {
    rotulo: "Tutorial",
    caminho: "/tutorial",
    descricao: "Para quem quer ver como o aplicativo funciona antes de instalar.",
  },
  {
    rotulo: "Colaboradores",
    caminho: "/colaboradores",
    descricao: "Prova social: mostra quem já contribui — convence quem está na cerca.",
  },
  {
    rotulo: "Apoiar o projeto",
    caminho: "/apoiar",
    descricao: "Para o público engajado: PIX, apoiadores e como o dinheiro é usado.",
  },
  {
    rotulo: "Parceiros",
    caminho: "/parceiros",
    descricao: "Para marcas, escolas de outdoor e canais que querem entrar no mural.",
  },
];

/* ------------------------------------------------------------------ */
/* Search Console + Bing                                               */
/* ------------------------------------------------------------------ */

export const URL_GSC = "https://search.google.com/search-console";
export const URL_BING = "https://www.bing.com/webmasters";

export interface PassoGSC {
  titulo: string;
  detalhe: string;
  /** Endereço que o passo abre (botão). */
  link?: string;
  /** Texto que o passo copia (botão copiar). */
  copiar?: string;
}

export const PASSOS_GSC: PassoGSC[] = [
  {
    titulo: "Passo 1 — Criar a propriedade (2 min)",
    detalhe:
      'Abra o Search Console com a conta Google do projeto e clique em "Adicionar propriedade". Escolha o tipo "Prefixo de URL" e cole o endereço abaixo. O tipo "Domínio" exige DNS próprio — o endereço vercel.app não permite; prefixo cobre a indexação normalmente.',
    link: URL_GSC,
    copiar: `${BASE_DIVULGACAO}/`,
  },
  {
    titulo: "Passo 2 — Verificar a propriedade (3 min)",
    detalhe:
      'No método recomendado "Arquivo HTML", baixe o arquivo googleXXXX.html e me envie para eu publicar na raiz do aplicativo (um commit). Alternativa imediata: escolha "Tag HTML" e copie a meta tag google-site-verification para eu colocar no head da raiz. Depois volte ao Search Console e clique em "Verificar".',
  },
  {
    titulo: "Passo 3 — Enviar o sitemap (1 min)",
    detalhe:
      'No menu "Sitemaps", cole apenas "api/sitemap" depois do domínio e clique em Enviar. O sitemap é dinâmico: a cada verbete novo publicado, os buscadores são avisados sozinhos no próximo deploy — não precisa reenviar nada.',
    copiar: URL_SITEMAP,
  },
  {
    titulo: "Passo 4 — Solicitar indexação das páginas-chave (5 min)",
    detalhe:
      'Na barra superior, cole a home e clique em "Solicitar indexação"; repita para /manual, /colaboradores, /apoiar e dois verbetes de sua escolha (ex.: /manual/water-purification). Isso coloca as páginas na fila em horas em vez de semanas.',
    copiar: `${BASE_DIVULGACAO}/manual`,
  },
  {
    titulo: "Passo 5 — Bing Webmaster por importação (2 min)",
    detalhe:
      "Entre no Bing Webmaster com a mesma conta Google e aceite importar do Search Console: propriedade, verificação e sitemap vêm juntos. O Bing alimenta também Yahoo, DuckDuckGo e Ecosia — três buscadores de brinde.",
    link: URL_BING,
  },
  {
    titulo: "Passo 6 — Rotina semanal de 10 minutos (segunda-feira)",
    detalhe:
      "Abra o Search Console e leia três telas: Desempenho (cliques e impressões da semana), Páginas (quantas URLs indexadas) e Correções (erros apontados). Anote os números no bloco do D6 — as metas estão nesta aba, mais abaixo.",
  },
];

/* ------------------------------------------------------------------ */
/* Plano da semana 2 (D1–D7)                                           */
/* ------------------------------------------------------------------ */

export interface DiaPlano {
  dia: string;
  foco: string;
  acao: string;
  canal: string;
}

export const PLANO_SEMANA2: DiaPlano[] = [
  {
    dia: "D1",
    foco: "Buscadores",
    acao: "Executar os 6 passos do Search Console acima e importar no Bing.",
    canal: "Google e Bing",
  },
  {
    dia: "D2",
    foco: "Círculo próximo",
    acao: "Disparar a mensagem curta para 10 contatos e 3 grupos de que você já participa.",
    canal: "WhatsApp",
  },
  {
    dia: "D3",
    foco: "Feed visual",
    acao: "Publicar o criativo de feed com a legenda pronta e gravar o vídeo de 15 s com o roteiro.",
    canal: "Instagram",
  },
  {
    dia: "D4",
    foco: "Comunidades",
    acao: "Enviar a mensagem de comunidade em grupos de trilha, camping e preparo (respeitando as regras de cada grupo).",
    canal: "Telegram e fóruns",
  },
  {
    dia: "D5",
    foco: "Rede profissional",
    acao: "Publicar os dois tuítes prontos e a história do projeto no LinkedIn.",
    canal: "X e LinkedIn",
  },
  {
    dia: "D6",
    foco: "Medição",
    acao: "Conferir as metas mais abaixo: impressões no Search Console, operadores novos na Visão geral e resposta por canal.",
    canal: "Painel",
  },
  {
    dia: "D7",
    foco: "Iteração",
    acao: "Dobrar o canal de melhor resultado, cortar o pior e pedir 3 indicações diretas.",
    canal: "O campeão da semana",
  },
];

/* ------------------------------------------------------------------ */
/* Posts prontos                                                       */
/* ------------------------------------------------------------------ */

export interface PostPronto {
  canal: string;
  titulo: string;
  corpo: string;
  dica?: string;
}

export const POSTS_DIVULGACAO: PostPronto[] = [
  {
    canal: "WhatsApp · contato",
    titulo: "Mensagem curta para conversas individuais",
    corpo:
      "Oi! Construí um aplicativo gratuito de sobrevivência que funciona 100% offline no celular: mapa tático, bússola, mochila de 72 horas e um manual com técnicas validadas. Sem cadastro e sem anúncio. Dá uma olhada: https://manualdosobrevivente.vercel.app/manual — se curtir, manda para alguém que viaja, acampa ou mora em área de risco.",
    dica: "Envie em conversas individuais, nunca em massa: 10 conversas rendem mais que 1 disparo em grupo.",
  },
  {
    canal: "WhatsApp · grupo",
    titulo: "Mensagem para grupos que você já participa",
    corpo:
      "Pessoal, projeto aberto que venho construindo: Manual do Sobrevivente — aplicativo offline de emergência com mapa tático, radar de chuva, ciclones ao vivo, mochila de 72 h e SOS por morse. Instala como aplicativo direto pelo navegador e funciona sem sinal. Gratuito: https://manualdosobrevivente.vercel.app/manual",
    dica: "Só envie em grupos cujas regras permitam; indicação bem recebida é a que chega de quem o grupo já confia.",
  },
  {
    canal: "Instagram · legenda",
    titulo: "Legenda do post de feed (use o criativo ao lado)",
    corpo:
      "Sem sinal? Sem problema. O Manual do Sobrevivente é um aplicativo gratuito que funciona 100% offline: mapa tático com GPS, bússola, mochila de 72 horas, manual com técnicas validadas e alerta de tempestades.\nInstala direto pelo navegador, sem loja de aplicativos → link na bio.\n#sobrevivencialismo #bushcraft #camping #trilha #preparo #offgrid #sobrevivencia #aventura",
    dica: "Publique com o criativo de feed 1080×1080 e responda todo comentário na primeira hora.",
  },
  {
    canal: "Instagram · Reels 15 s",
    titulo: "Roteiro do vídeo curto",
    corpo:
      "0–3 s: celular na trilha, sem sinal — “perdido?”\n3–8 s: abre o aplicativo: mapa tático + bússola (legenda: funciona OFFLINE)\n8–12 s: manual na tela: purificar água / SOS por morse\n12–15 s: “grátis, instala pelo navegador — link na bio”",
    dica: "Grave na vertical e use o criativo de story como capa; o endereço é https://manualdosobrevivente.vercel.app/manual",
  },
  {
    canal: "Telegram · comunidades",
    titulo: "Mensagem para grupos de trilha, camping e preparo",
    corpo:
      "[projeto aberto] Construí um aplicativo de sobrevivência offline (PWA gratuito): mapa tático, radar de chuva, ciclones ao vivo, mochila de emergência e manual com técnicas validadas. Sem cadastro, sem anúncio: https://manualdosobrevivente.vercel.app/manual — feedback de vocês é bem-vindo!",
    dica: "Apresente-se antes do link; comunidade perdoa divulgação, nunca spam seco.",
  },
  {
    canal: "X · curto",
    titulo: "Publicação principal",
    corpo:
      "App gratuito de sobrevivência que funciona sem sinal: mapa tático, bússola, mochila de 72 h e SOS por morse. Instala pelo navegador: https://manualdosobrevivente.vercel.app/manual",
  },
  {
    canal: "X · alternativa",
    titulo: "Variação para o segundo dia",
    corpo:
      "Seu celular sem sinal na trilha deixa de ser problema: manual de sobrevivência offline com técnicas validadas, mapa e clima ao vivo quando há rede. Gratuito e aberto: https://manualdosobrevivente.vercel.app/manual",
  },
  {
    canal: "LinkedIn · história",
    titulo: "Post narrativo para a rede profissional",
    corpo:
      "Publicar software de emergência é um ato de cuidado. Liberei o Manual do Sobrevivente: um aplicativo offline-first para situações reais — mapa tático, clima ao vivo, mochila de 72 horas e manual prático de 29 técnicas. Funciona sem internet, é gratuito e aberto. A ideia nasceu de um problema simples: em enchente, apagão ou trilha remota, o celular continua no bolso — a internet, não. Se você conhece quem atua em resgate, Defesa Civil, escotismo ou turismo de outdoor, apresente o projeto: https://manualdosobrevivente.vercel.app/manual",
  },
  {
    canal: "Fóruns · pedido de apoio",
    titulo: "Pedido de indicação direta",
    corpo:
      "Preciso de uma ajuda: estou divulgando o Manual do Sobrevivente (aplicativo offline de emergência, gratuito). O melhor apoio agora não é dinheiro — é indicação: mande para 1 pessoa que acampa, viaja de trilha ou mora em área de risco. Link: https://manualdosobrevivente.vercel.app/manual",
  },
];

/* ------------------------------------------------------------------ */
/* Criativos e guia                                                    */
/* ------------------------------------------------------------------ */

export interface Criativo {
  rotulo: string;
  /** Caminho público do arquivo (servido de public/divulgacao/). */
  arquivo: string;
  uso: string;
  /** Verdadeiro quando é imagem e pode ser mostrada em miniatura. */
  miniatura: boolean;
}

export const CRIATIVOS: Criativo[] = [
  {
    rotulo: "Criativo de feed (1080×1080)",
    arquivo: "/divulgacao/criativo-feed-1080.png",
    uso: "Post no Instagram/Facebook — publique com a legenda pronta da lista acima.",
    miniatura: true,
  },
  {
    rotulo: "Criativo de story (1080×1920)",
    arquivo: "/divulgacao/criativo-story-1080x1920.png",
    uso: "Story e capa do Reels de 15 s.",
    miniatura: true,
  },
  {
    rotulo: "Guia completo (PDF, 12 páginas)",
    arquivo: "/divulgacao/guia-semana2-search-console.pdf",
    uso: "O passo a passo inteiro do Search Console + plano da semana em PDF para ler em qualquer lugar.",
    miniatura: false,
  },
];

/* ------------------------------------------------------------------ */
/* Metas de medição (D6)                                               */
/* ------------------------------------------------------------------ */

export interface Meta {
  alvo: string;
  como: string;
}

export const METAS_SEMANA2: Meta[] = [
  {
    alvo: "30–50 operadores novos",
    como: "Painel → Visão geral: contas criadas durante a semana.",
  },
  {
    alvo: "10 URLs indexadas",
    como: "Search Console → Páginas: até 2 semanas após o D1.",
  },
  {
    alvo: "Impressões crescentes",
    como: "Search Console → Desempenho: a linha de impressões sobe quando a indexação começa.",
  },
  {
    alvo: "1 canal campeão",
    como: "Compare a resposta por canal no D6 e dobre a aposta no vencedor no D7.",
  },
];

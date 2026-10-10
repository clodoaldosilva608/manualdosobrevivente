/**
 * Cérebro do assistente — decide COMO responder e EXECUTA ações do app.
 *
 * Ordem de raciocínio (a IA "se atualiza e fica mais inteligente" aqui):
 *   1. INTENÇÃO de ação (rota, camada, base, limpar, boletim…): executa no
 *      mapa via barramento de habilidades e responde o que fez;
 *   2. NOTÍCIAS (GDELT ao vivo) e PREVISÃO (Open-Meteo do centro do mapa);
 *   3. MEMÓRIA do operador (pares pergunta→resposta aprendidos com o uso —
 *      inclusive de respostas antigas do provedor: funciona offline);
 *   4. CONHECIMENTO GLOBAL curado pelo admin (manual_ia_conhecimento);
 *   5. BASE LOCAL de fábrica (sobrevivência + app);
 *   6. PROVEDOR com chave (Google/HF/compat) — e a resposta volta para a
 *      memória, alimentando o passo 3 para sempre;
 *   7. CAIR CÁTIMO: admitir o limite e sugerir o que dá para fazer.
 */
import { executarHabilidade } from "@/lib/assistente/habilidades";
import { configTemChave, type ConfigIA } from "@/lib/assistente/config";
import { buscarBaseLocal, normalizar, type EntradaLocal } from "@/lib/assistente/conhecimento";
import { buscarNaMemoria, contarUso, registrarPar, topoMemoria } from "@/lib/assistente/memoria";
import {
  chamarProvedor,
  ErroProvedor,
  extrairComando,
  type MensagemChat,
} from "@/lib/assistente/provedor";
import { geoBuscar } from "@/lib/assistente/geocode.functions";
import type { EntradaConhecimento } from "@/lib/ia-conhecimento";

export interface ContextoPergunta {
  /** Centro atual do mapa (para previsão do tempo). */
  centro?: { lat: number; lng: number };
}

export interface RespostaIA {
  texto: string;
  origem: "acao" | "memoria" | "global" | "local" | "provedor" | "sem-resposta";
  /** Descrição curta da ação executada (para o toast do mapa). */
  acao?: string;
}

/* ------------------------------------------------------------------ */
/* Mapeamentos de vocabulário → recursos do app                       */
/* ------------------------------------------------------------------ */

/** Camada de inteligência por palavras que o operador costuma usar. */
const VOCAB_CAMADAS: Array<{ id: string; termos: string[] }> = [
  { id: "radar", termos: ["radar", "chuva", "precipitacao"] },
  {
    id: "ciclones",
    termos: ["ciclone", "ciclones", "furacao", "tempestade tropical", "hurricane"],
  },
  { id: "nuvens", termos: ["nuvem", "nuvens", "satelite goes", "goes"] },
  { id: "vento", termos: ["vento", "ventos", "particulas"] },
  { id: "temperatura", termos: ["temperatura", "termica", "calor camada"] },
  { id: "sismos", termos: ["terremoto", "terremotos", "sismo", "sismos", "abalo"] },
  { id: "incendios", termos: ["incendio", "incendios", "foco de calor", "focos", "queimada"] },
  { id: "conflitos", termos: ["conflito", "conflitos", "guerra", "zona de guerra"] },
  { id: "voos", termos: ["voo", "voos", "aviao", "avioes", "aereo"] },
  { id: "satelites", termos: ["satelite", "satelites", "iss"] },
  { id: "alertas", termos: ["alerta", "alertas", "gdacs", "desastre"] },
  { id: "nuclear", termos: ["nuclear", "central nuclear", "reatores"] },
  { id: "maritimo", termos: ["maritimo", "portos", "estreitos", "rota maritima"] },
  { id: "navios", termos: ["navio", "navios", "ais", "barcos"] },
  { id: "cameras", termos: ["camera", "cameras", "webcam", "webcams"] },
  { id: "cabos", termos: ["cabo", "cabos", "submarino"] },
  { id: "noticias", termos: ["noticia geolocalizada", "manchetes no mapa"] },
  { id: "noite", termos: ["noite", "terminador", "dia e noite"] },
  { id: "eventos", termos: ["evento", "eventos naturais", "eonet"] },
];

const VOCAB_BASES: Array<{ id: "satellite" | "topo" | "streets" | "dark"; termos: string[] }> = [
  { id: "satellite", termos: ["satelite", "imagem de satelite", "aerea"] },
  { id: "topo", termos: ["topografico", "topografica", "topo", "curvas de nivel"] },
  { id: "streets", termos: ["ruas", "osm", "openstreetmap"] },
  { id: "dark", termos: ["escuro", "escura", "tatico escuro", "dark"] },
];

export function mapearCamada(texto: string): string | null {
  const t = normalizar(texto);
  // Borda de palavra: "principais" NÃO pode acionar a camada AIS ("ais") —
  // termos são casados inteiros, não substrings soltas.
  for (const c of VOCAB_CAMADAS) {
    if (
      c.termos.some((termo) => new RegExp(`(^|[^a-z0-9])${normalizar(termo)}([^a-z0-9]|$)`).test(t))
    )
      return c.id;
  }
  return null;
}

export function mapearBase(texto: string): "satellite" | "topo" | "streets" | "dark" | null {
  const t = normalizar(texto);
  if (!/(base|camada base|mapa base|vista)/.test(t)) return null;
  for (const b of VOCAB_BASES) {
    if (
      b.termos.some((termo) => new RegExp(`(^|[^a-z0-9])${normalizar(termo)}([^a-z0-9]|$)`).test(t))
    )
      return b.id;
  }
  return null;
}

/** Intenção detectada (função pura — testável). */
export interface Intent {
  tipo:
    | "rota"
    | "irpara"
    | "camada"
    | "base"
    | "limpar"
    | "boletim"
    | "medir"
    | "marcador"
    | "posicao"
    | "noticias"
    | "previsao"
    | null;
  destino?: string;
  camada?: string;
  ligar?: boolean;
  base?: string;
}

const RE_ROTA =
  /(?:trace|traçar|tracar|faça|faca|crie|criar|abrir?|fazer)\s+(?:uma\s+|a\s+)?rota\s+(?:para|até|ate|pro|ao|a)\s+(.{3,120})/i;
const RE_ROTA_CURTA = /rota\s+(?:para|até|ate|pro|ao)\s+(.{3,120})/i;
const RE_LEVAR =
  /(?:me\s+leve|levar|me\s+leva|va\s+de\s+carro|dirija)\s+(?:para|até|ate|pro|ao)\s+(.{3,120})/i;
const RE_IRPARA =
  /(?:^|\s)(?:vá|va|vai|ir|navegue|voar|voa|centralizar?|mostre-me|mostre)\s+(?:para|até|ate|no|na|pro|em|pelo|pela)\s+(.{3,120})/i;
const RE_LIMPAR =
  /(?:limp[ae]r?|tire|saia|esconda)\s+(?:tudo\s+)?(?:da\s+|do\s+|a\s+|o\s+)?(?:tela|mapa|interface|hud)|tela\s+limpa|modo\s+limpo/i;
const RE_BOLETIM = /boletim(?:\s+de\s+inteligencia)?/i;
const RE_MEDIR = /\bmed(?:ir|a|icao)\b|\bmeasure\b/i;
const RE_MARCADOR = /\bmarcador\b|\bwaypoint\b|\bmarque\b/i;
const RE_POSICAO = /minha\s+posicao|onde\s+(?:eu\s+)?estou|posicao\s+atual/i;
const RE_NOTICIAS = /not[ií]cia|manchete|principais\s+not|últimas\s+not|ultimas\s+not|news/i;
const RE_PREVISAO =
  /previs|clima|tempo\s+(?:de\s+)?(?:hoje|agora|amanha)|vai\s+chover|temperatura\s+hoje|vai\s+esquentar/i;
const RE_DESLIGAR = /(?:desative|desativar|desligue|desligar|esconda|remova|tire)/i;

export function detectarIntent(pergunta: string): Intent {
  const p = normalizar(pergunta);

  const rota = RE_ROTA.exec(pergunta) ?? RE_ROTA_CURTA.exec(pergunta) ?? RE_LEVAR.exec(pergunta);
  if (rota) return { tipo: "rota", destino: rota[1].trim() };

  const ir = RE_IRPARA.exec(pergunta);
  if (ir && !RE_NOTICIAS.test(p)) return { tipo: "irpara", destino: ir[1].trim() };

  if (RE_LIMPAR.test(p)) return { tipo: "limpar" };
  if (RE_BOLETIM.test(p)) return { tipo: "boletim" };
  if (RE_MEDIR.test(p)) return { tipo: "medir" };
  if (RE_MARCADOR.test(p)) return { tipo: "marcador" };
  if (RE_POSICAO.test(p)) return { tipo: "posicao" };

  const camada = mapearCamada(p);
  if (camada) {
    const base = mapearBase(p);
    if (!base) return { tipo: "camada", camada, ligar: !RE_DESLIGAR.test(p) };
  }
  const base = mapearBase(p);
  if (base) return { tipo: "base", base };

  if (RE_NOTICIAS.test(p)) return { tipo: "noticias" };
  if (RE_PREVISAO.test(p)) return { tipo: "previsao" };

  return { tipo: null };
}

/* ------------------------------------------------------------------ */
/* Resposta                                                           */
/* ------------------------------------------------------------------ */

export interface DependenciasCerebro {
  buscarNoticias: () => Promise<Array<{ titulo: string; url: string; fonte: string }>>;
  buscarClima: (centro: { lat: number; lng: number }) => Promise<{
    temperatura: number | null;
    condicao: string;
    vento: number | null;
    umidade: number | null;
  } | null>;
}

export async function responder(params: {
  pergunta: string;
  config: ConfigIA;
  contexto?: ContextoPergunta;
  historico: MensagemChat[];
  global: EntradaConhecimento[];
  deps: DependenciasCerebro;
}): Promise<RespostaIA> {
  const { pergunta, config, contexto, global, deps } = params;
  const intent = detectarIntent(pergunta);

  // ---------- 1) Ações do app ----------
  switch (intent.tipo) {
    case "rota":
    case "irpara": {
      const destino = intent.destino ?? "";
      const ehRota = intent.tipo === "rota";
      if (!destino) break;
      let lugar: { nome: string; lat: number; lng: number } | null = null;
      try {
        lugar = await geoBuscar({ data: { busca: destino } });
      } catch {
        lugar = null;
      }
      if (!lugar) {
        const coord = extrairCoordenada(destino);
        if (coord) {
          lugar = { nome: destino, lat: coord.lat, lng: coord.lng };
        } else {
          return {
            texto: `Não encontrei "${destino}" no mapa de nomes. Tente o formato "cidade, estado" ou cole uma coordenada (DD ou MGRS).`,
            origem: "acao",
          };
        }
      }
      const ok = await executarHabilidade(ehRota ? "rota" : "centralizar", {
        ponto: { lat: lugar.lat, lng: lugar.lng },
        nomeDestino: lugar.nome,
      });
      if (!ok) {
        return {
          texto: `Encontrei ${lugar.nome}, mas preciso do mapa aberto para ${ehRota ? "traçar a rota" : "voar até lá"}. Abra o mapa e repita o pedido.`,
          origem: "acao",
        };
      }
      return {
        texto: ehRota
          ? `Rota traçada para ${lugar.nome}. A bússola mostra distância, rumo e correção a cada ponto — bom caminho!`
          : `Centralizando em ${lugar.nome}.`,
        origem: "acao",
        acao: ehRota ? "rota" : "centralizar",
      };
    }
    case "camada": {
      if (!intent.camada) break;
      const ok = await executarHabilidade("camada", {
        camada: intent.camada,
        ligar: intent.ligar ?? true,
      });
      if (!ok) {
        return {
          texto: "Preciso do mapa aberto para mexer nas camadas — abra o mapa e repita.",
          origem: "acao",
        };
      }
      const nomeBonito = nomeCamada(intent.camada);
      return {
        texto:
          intent.ligar === false
            ? `Camada ${nomeBonito} desligada.`
            : `Camada ${nomeBonito} ativada — confira no mapa.`,
        origem: "acao",
        acao: "camada",
      };
    }
    case "base": {
      if (!intent.base) break;
      const ok = await executarHabilidade("base", { base: intent.base });
      if (!ok) {
        return { texto: "Preciso do mapa aberto para trocar a camada base.", origem: "acao" };
      }
      return {
        texto: `Camada base alterada para ${nomeBase(intent.base)}.`,
        origem: "acao",
        acao: "base",
      };
    }
    case "limpar": {
      const ok = await executarHabilidade("limpar");
      if (!ok)
        return {
          texto: "Abra o mapa e peça de novo — a tela limpa só funciona lá.",
          origem: "acao",
        };
      return {
        texto:
          "Tela limpa ativada: só o mapa à vista. Toque no botão do olho (ou me peça de novo) para trazer tudo de volta.",
        origem: "acao",
        acao: "limpar",
      };
    }
    case "boletim": {
      const ok = await executarHabilidade("boletim");
      if (!ok)
        return {
          texto: "O boletim vive no mapa — abra o mapa e peça o boletim de inteligência.",
          origem: "acao",
        };
      return {
        texto:
          "Boletim de inteligência aberto: sismos, alertas oficiais, clima, ar e notícias do centro do mapa.",
        origem: "acao",
        acao: "boletim",
      };
    }
    case "medir": {
      const ok = await executarHabilidade("medir");
      if (!ok)
        return { texto: "A medição roda no mapa — abra o mapa e peça para medir.", origem: "acao" };
      return {
        texto:
          "Modo de medição aberto: distância linear ou área do polígono — toque nos pontos no mapa.",
        origem: "acao",
        acao: "medir",
      };
    }
    case "marcador": {
      const ok = await executarHabilidade("marcador");
      if (!ok) return { texto: "Preciso do mapa aberto para marcar waypoints.", origem: "acao" };
      return {
        texto:
          "Modo marcador ativo: toque no mapa para criar o waypoint com título, categoria e cor.",
        origem: "acao",
        acao: "marcador",
      };
    }
    case "posicao": {
      const ok = await executarHabilidade("posicao");
      if (!ok)
        return {
          texto: "Minha posição é um painel do mapa — abra o mapa e ative 'Minha posição'.",
          origem: "acao",
        };
      return {
        texto: "Centralizando na sua posição GPS (painel Minha posição mostra lat/lng/altitude).",
        origem: "acao",
        acao: "posicao",
      };
    }
    case "noticias": {
      try {
        const noticias = await deps.buscarNoticias();
        if (noticias.length > 0) {
          const lista = noticias
            .slice(0, 6)
            .map((n, i) => `${i + 1}. ${n.titulo} (${n.fonte})`)
            .join("\n");
          const texto =
            `Principais notícias de emergência agora (GDELT, em português):\n${lista}\n` +
            "Detalhes completos no Boletim (Ferramentas › Boletim) e camada de notícias no mapa.";
          return { texto, origem: "acao", acao: "noticias" };
        }
      } catch {
        /* segue para as demais fontes */
      }
      break;
    }
    case "previsao": {
      if (contexto?.centro) {
        try {
          const c = await deps.buscarClima(contexto.centro);
          if (c) {
            const partes = [`${c.condicao}`];
            if (c.temperatura != null) partes.push(`${c.temperatura.toFixed(0)} °C`);
            if (c.vento != null) partes.push(`vento ${(c.vento * 3.6).toFixed(0)} km/h`);
            if (c.umidade != null) partes.push(`umidade ${c.umidade.toFixed(0)}%`);
            return {
              texto: `Previsão do centro do mapa: ${partes.join(" · ")}. Radar de chuva e temperatura em cores ficam em Ferramentas › Camadas.`,
              origem: "acao",
              acao: "previsao",
            };
          }
        } catch {
          /* segue */
        }
      }
      return {
        texto:
          "Para a previsão eu uso o centro do mapa: mova o mapa para o lugar desejado e pergunte de novo (ou ative Camadas › Temperatura/Vento para ver a grade inteira).",
        origem: "acao",
      };
    }
    default:
      break;
  }

  // ---------- 2) Memória do operador ----------
  const acheMem = buscarNaMemoria(pergunta);
  if (acheMem) {
    contarUso(acheMem.par.id);
    return {
      texto: `${acheMem.par.resposta}\n\n(da minha memória — aprendido com você)`,
      origem: "memoria",
    };
  }

  // ---------- 3) Conhecimento global (admin) ----------
  const acheGlobal = buscarConhecimentoGlobal(pergunta, global);
  if (acheGlobal) {
    return { texto: acheGlobal.resposta, origem: "global" };
  }

  // ---------- 4) Base local de fábrica ----------
  const acheLocal = buscarBaseLocal(pergunta);
  if (acheLocal) {
    return { texto: acheLocal.entrada.resposta, origem: "local" };
  }

  // ---------- 5) Provedor com chave ----------
  if (configTemChave(config)) {
    try {
      const bruta = await chamarProvedor({
        config,
        historico: params.historico,
        pergunta,
        anexos: [],
        global,
      });
      const { texto, comando } = extrairComando(bruta);
      let extra = "";
      if (comando) {
        const executado = await executarComandoProvedor(comando);
        extra = executado ? "" : "\n(não consegui executar a ação — abra o mapa e tente de novo)";
      }
      const final = `${texto}${extra}`;
      if (config.aprender)
        registrarPar(pergunta, final.replace(/\n\n\(da minha memória.*\)/, ""), "provedor");
      return { texto: final, origem: "provedor" };
    } catch (e) {
      const mensagem = e instanceof ErroProvedor ? e.message : "Falha inesperada do provedor.";
      const socorro = buscarNaMemoria(pergunta);
      return {
        texto: `${mensagem}${socorro ? `\n\nEnquanto isso, o que tenho na memória:\n${socorro.par.resposta}` : ""}`,
        origem: "sem-resposta",
      };
    }
  }

  // ---------- 6) Cair cátimo ----------
  const dicas = [
    "Experimente: “trace uma rota até o centro do Recife”, “ative o radar de chuva”, “quais as principais notícias?”, “previsão para hoje”.",
    "Sobre sobrevivência eu respondo sem internet: água, fogo, abrigo, socorros, orientação, mochila 72h…",
    "Para respostas abertas (qualquer assunto), cadastre uma chave API em Ajustes › Assistente IA — as instruções com link direto estão lá.",
  ];
  return {
    texto:
      "Essa eu não sei responder com o que tenho aqui dentro — mas estou aprendendo: quando você me ensinar (ou usar mais), eu melhoro.\n\n" +
      dicas[Math.floor(Math.random() * dicas.length)],
    origem: "sem-resposta",
  };
}

/** Executa o comando <<EXECUTAR:…>> gerado pelo provedor. */
async function executarComandoProvedor(comando: string): Promise<boolean> {
  const [parte, ...resto] = comando.split(":");
  const arg = resto.join(":").trim();
  switch (parte.trim().toLowerCase()) {
    case "rota": {
      if (!arg) return false;
      try {
        const lugar = await geoBuscar({ data: { busca: arg } });
        if (!lugar) return false;
        return await executarHabilidade("rota", {
          ponto: { lat: lugar.lat, lng: lugar.lng },
          nomeDestino: lugar.nome,
        });
      } catch {
        return false;
      }
    }
    case "camada": {
      const [id, estado] = arg.split(":");
      return await executarHabilidade("camada", {
        camada: id.trim(),
        ligar: (estado ?? "on").trim().toLowerCase() !== "off",
      });
    }
    case "base":
      return await executarHabilidade("base", { base: arg.trim() });
    case "limpar":
      return await executarHabilidade("limpar");
    case "boletim":
      return await executarHabilidade("boletim");
    case "medir":
      return await executarHabilidade("medir");
    case "marcador":
      return await executarHabilidade("marcador");
    case "posicao":
      return await executarHabilidade("posicao");
    default:
      return false;
  }
}

/** Extrai coordenada de um destino (DD "lat, lng" ou MGRS simples). */
function extrairCoordenada(texto: string): { lat: number; lng: number } | null {
  const m = /(-?\d{1,3}(?:[.,]\d+)?)\s*[;,°\s]\s*(-?\d{1,3}(?:[.,]\d+)?)/.exec(texto);
  if (!m) return null;
  const a = Number(m[1].replace(",", "."));
  const b = Number(m[2].replace(",", "."));
  const lat = Math.abs(a) <= 90 ? a : b;
  const lng = Math.abs(a) <= 90 ? b : a;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function nomeCamada(id: string): string {
  const achado = VOCAB_CAMADAS.find((c) => c.id === id);
  if (achado) return achado.termos[0];
  return id;
}

function nomeBase(id: string): string {
  switch (id) {
    case "satellite":
      return "Satélite";
    case "topo":
      return "Topográfico";
    case "streets":
      return "Ruas";
    case "dark":
      return "Tático Escuro";
    default:
      return id;
  }
}

/** Busca no conhecimento global por palavras-chave (mesma mecânica da local). */
export function buscarConhecimentoGlobal(
  pergunta: string,
  global: EntradaConhecimento[],
): { pergunta: string; resposta: string } | null {
  if (global.length === 0) return null;
  const ts = normalizar(pergunta)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length > 2);
  if (ts.length === 0) return null;
  let melhor: { score: number; item: EntradaConhecimento } | null = null;
  for (const item of global) {
    const chaves = item.palavras_chave
      .split(",")
      .map((c) => normalizar(c.trim()))
      .filter(Boolean);
    let hits = 0;
    for (const t of ts) {
      if (chaves.some((c) => c === t || t.includes(c) || c.includes(t))) hits += 1;
      else if (normalizar(item.pergunta).includes(t)) hits += 1;
    }
    const score = hits / ts.length;
    if (score >= 0.25 && (!melhor || score > melhor.score)) melhor = { score, item };
  }
  return melhor ? { pergunta: melhor.item.pergunta, resposta: melhor.item.resposta } : null;
}

/** Lista as memórias para a UI de configuração. */
export function memoriaResumo(): number {
  return topoMemoria(999).length;
}

export type { EntradaLocal };

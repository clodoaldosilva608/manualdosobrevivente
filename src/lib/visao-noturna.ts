/**
 * Modo Noturno (visão noturna) — aplicação global fora do React.
 *
 * Padrão de campo real (militar/aviação): à noite o olho leva ~20 minutos
 * para se adaptar ao escuro, e luz branca destrói essa adaptação em
 * segundos. A luz monocromática afeta pouco os bastonetes e permite ler o
 * aparelho sem "cegar" o operador.
 *
 * Quatro tintas disponíveis, cada uma com seu uso de campo:
 *  - VERMELHO (padrão, ~620–680 nm): o clássico militar — o que menos
 *    quebra a adaptação ao escuro e o que menos denuncia a posição.
 *  - ÂMBAR (~590 nm): melhor contraste para texto e mapas impressos;
 *    menos "espreme" o detalhe fino que o vermelho profundo.
 *  - VERDE (~530 nm): o olho humano enxerga mais detalhe em verde —
 *    leitura de gráficos de elevação e linhas finas no mapa.
 *  - CIANO (~490 nm): retém mais detalhe de telas/imagens de satélite;
 *    usado em quiosques de vigilância noturna.
 *
 * Implementação em duas camadas, sem tocar no layout:
 * 1. Tokens: a classe .modo-noturno no <html> troca as variáveis do design
 *    system para tons monocromáticos (matiz via data-noturno-cor).
 * 2. Tinta: dois overlays FIXOS e NÃO-INTERATIVOS convertem o que os tokens
 *    não alcançam — mapa MapLibre, marcadores, gráficos — na tinta escolhida
 *    (multiply) e escurecem a tela (dimmer), ambos ajustáveis.
 *
 * O espelho em localStorage permite aplicar a classe ANTES da hidratação
 * (script inline no __root) — sem flash de tela clara para quem usa o modo.
 */

const CHAVE_ESPELHO = "tgis:visao-noturna";
const ID_VERMELHO = "tgis-noturno-vermelho";
const ID_DIMMER = "tgis-noturno-dimmer";

/** Tintas de visão noturna disponíveis em Ajustes. */
export type CorNoturna = "vermelho" | "ambar" | "verde" | "ciano";

export interface EstadoNoturno {
  ativa: boolean;
  /** Tinta monocromática da visão noturna (padrão: vermelho). */
  cor: CorNoturna;
  /** Intensidade da tinta (0–1; 0,85 padrão). */
  vermelho: number;
  /** Escurecimento adicional da tela (0–0,75; 0,2 padrão). */
  escurecer: number;
}

export const NOTURNO_PADRAO: EstadoNoturno = {
  ativa: false,
  cor: "vermelho",
  vermelho: 0.85,
  escurecer: 0.2,
};

/** Cor da tinta multiply para cada opção (mesma matiz dos tokens CSS). */
const TINTA: Record<CorNoturna, string> = {
  vermelho: "#ff2b18",
  ambar: "#ffb21b",
  verde: "#2bff6f",
  ciano: "#2bd8ff",
};

/** Matiz oklch usada pelos tokens CSS (src/styles.css). */
export const MATIZ: Record<CorNoturna, number> = {
  vermelho: 27,
  ambar: 70,
  verde: 145,
  ciano: 200,
};

/** Normaliza qualquer valor vindo do banco/localStorage para uma tinta válida. */
export function corNoturnaValida(v: string | null | undefined): CorNoturna {
  return v === "ambar" || v === "verde" || v === "ciano" || v === "vermelho" ? v : "vermelho";
}

function garantirOverlay(id: string, blend: boolean): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${
      blend ? 9999 : 9998
    };${blend ? "mix-blend-mode:multiply;" : ""}background:#000;opacity:0;`;
    document.body.appendChild(el);
  }
  return el;
}

/** Aplica/remove o modo noturno e ajusta tinta, matiz e intensidade. */
export function aplicarVisaoNoturna(e: EstadoNoturno): void {
  if (typeof document === "undefined") return;
  const cor = corNoturnaValida(e.cor);
  document.documentElement.classList.toggle("modo-noturno", e.ativa);
  document.documentElement.dataset.noturnoCor = cor;

  const vermelho = garantirOverlay(ID_VERMELHO, true);
  const dimmer = garantirOverlay(ID_DIMMER, false);
  if (vermelho) {
    vermelho.style.background = TINTA[cor];
    vermelho.style.opacity = e.ativa ? String(clamp01(e.vermelho)) : "0";
  }
  if (dimmer) dimmer.style.opacity = e.ativa ? String(clamp01(e.escurecer)) : "0";

  try {
    localStorage.setItem(CHAVE_ESPELHO, JSON.stringify({ ...e, cor }));
  } catch {
    /* armazenamento indisponível — vale só nesta sessão */
  }
}

/** Leitura síncrona do espelho (usada pelo script inline pré-hidratação). */
export function espelhoNoturno(): EstadoNoturno {
  try {
    const raw = localStorage.getItem(CHAVE_ESPELHO);
    if (!raw) return NOTURNO_PADRAO;
    const v = JSON.parse(raw) as Partial<EstadoNoturno>;
    return {
      ...NOTURNO_PADRAO,
      ...v,
      cor: corNoturnaValida(v.cor),
    };
  } catch {
    return NOTURNO_PADRAO;
  }
}

/** Script mínimo embutido no HTML: aplica classe e matiz antes da hidratação. */
export const SCRIPT_PRE_HIDRATACAO = `(function(){try{var e=JSON.parse(localStorage.getItem("${CHAVE_ESPELHO}")||"{}");if(e.ativa){document.documentElement.classList.add("modo-noturno");var c=e.cor;if(c!=="ambar"&&c!=="verde"&&c!=="ciano")c="vermelho";document.documentElement.dataset.noturnoCor=c;}}catch(_){}})();`;

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

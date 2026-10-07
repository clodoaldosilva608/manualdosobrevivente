/**
 * Modo Noturno (visão noturna vermelha) — aplicação global fora do React.
 *
 * Padrão de campo real (militar/aviação): à noite o olho leva ~20 minutos
 * para se adaptar ao escuro, e luz branca destrói essa adaptação em
 * segundos. A luz vermelha (~620–680 nm) afeta pouco os bastonetes e
 * permite ler o aparelho sem "cegar" o operador.
 *
 * Implementação em duas camadas, sem tocar no layout:
 * 1. Tokens: a classe .modo-noturno no <html> troca as variáveis do design
 *    system para tons de vermelho (hierarquia preservada).
 * 2. Tinta: dois overlays FIXOS e NÃO-INTERATIVOS convertem o que os tokens
 *    não alcançam — mapa MapLibre, marcadores, gráficos — em vermelho
 *    (multiply) e escurecem a tela (dimmer), ambos ajustáveis.
 *
 * O espelho em localStorage permite aplicar a classe ANTES da hidratação
 * (script inline no __root) — sem flash de tela clara para quem usa o modo.
 */

const CHAVE_ESPELHO = "tgis:visao-noturna";
const ID_VERMELHO = "tgis-noturno-vermelho";
const ID_DIMMER = "tgis-noturno-dimmer";

export interface EstadoNoturno {
  ativa: boolean;
  /** Intensidade da tinta vermelha (0–1; 0,85 padrão). */
  vermelho: number;
  /** Escurecimento adicional da tela (0–0,75; 0,2 padrão). */
  escurecer: number;
}

export const NOTURNO_PADRAO: EstadoNoturno = {
  ativa: false,
  vermelho: 0.85,
  escurecer: 0.2,
};

function garantirOverlay(id: string, blend: boolean): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:${
      blend ? 9999 : 9998
    };${blend ? "mix-blend-mode:multiply;" : ""}background:${blend ? "#ff2b18" : "#000"};opacity:0;`;
    document.body.appendChild(el);
  }
  return el;
}

/** Aplica/remove o modo noturno e ajusta a intensidade das camadas. */
export function aplicarVisaoNoturna(e: EstadoNoturno): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("modo-noturno", e.ativa);

  const vermelho = garantirOverlay(ID_VERMELHO, true);
  const dimmer = garantirOverlay(ID_DIMMER, false);
  if (vermelho) vermelho.style.opacity = e.ativa ? String(clamp01(e.vermelho)) : "0";
  if (dimmer) dimmer.style.opacity = e.ativa ? String(clamp01(e.escurecer)) : "0";

  try {
    localStorage.setItem(CHAVE_ESPELHO, JSON.stringify(e));
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
    return { ...NOTURNO_PADRAO, ...v };
  } catch {
    return NOTURNO_PADRAO;
  }
}

/** Script mínimo embutido no HTML: aplica a classe antes da hidratação. */
export const SCRIPT_PRE_HIDRATACAO = `(function(){try{var e=JSON.parse(localStorage.getItem("${CHAVE_ESPELHO}")||"{}");if(e.ativa){document.documentElement.classList.add("modo-noturno");}}catch(_){}})();`;

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/**
 * Assistente IA flutuante — o orbe minimizado é FUNCIONAL como a bússola:
 * anel girando com o rumo real do aparelho (sensor de orientação), ponto
 * na cor do provedor ativo (local = verde da IA local, laranja = nuvem).
 *
 * Ao toque, expande o chat completo: texto, áudio (microfone), imagem e
 * vídeo como entrada; texto sempre e áudio (TTS do aparelho) como saída.
 * Executa funcionalidades do app ("trace uma rota até X", "ative o radar"),
 * responde clima/notícias e aprende com cada conversa (memória local).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  Bot,
  Camera,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Settings2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/hooks/usePreferences";
import { useSensorBussola } from "@/lib/bussola-sensor";
import {
  CONFIG_PADRAO_IA,
  configTemChave,
  lerConfigIA,
  salvarConfigIA,
  type ConfigIA,
} from "@/lib/assistente/config";
import { registrarPar, type ParMemoria } from "@/lib/assistente/memoria";
import { responder, type RespostaIA } from "@/lib/assistente/cerebro";
import {
  apresentacaoPersona,
  carregarPersonas,
  nomeIAEfetivo,
  personaAtiva,
} from "@/lib/assistente/persona";
import type { Personagem } from "@/lib/personagens";
import type { AnexoMensagem, MensagemChat } from "@/lib/assistente/provedor";
import { listarConhecimentoPublico, type EntradaConhecimento } from "@/lib/ia-conhecimento";
import { fetchWeather } from "@/lib/weather.functions";
import { buscarNoticiasNavegador } from "@/lib/noticias-gdelt";

const CHAVE_CHAT = "manual:ia-chat";

interface MensagemTela extends MensagemChat {
  id: string;
  origem?: RespostaIA["origem"];
  /** Anexos da mensagem do usuário (para exibir na bolha). */
  anexos?: AnexoMensagem[];
}

function novoId(): string {
  return `m${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
}

function carregarChat(): MensagemTela[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CHAT) ?? "[]") as MensagemTela[];
  } catch {
    return [];
  }
}

function salvarChat(mensagens: MensagemTela[]): void {
  try {
    localStorage.setItem(CHAVE_CHAT, JSON.stringify(mensagens.slice(-30)));
  } catch {
    /* armazenamento indisponível */
  }
}

/** Comprime imagem para data URL leve (máx. 1024 px, JPEG 0.8). */
async function comprimirImagem(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

function lerDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("leitura falhou"));
    r.readAsDataURL(arquivo);
  });
}

/** Tamanho do orbe (h-14 w-14 = 56 px). */
const TAMANHO_ORBE = 56;
/** Posição gravada do orbe — o operador arrasta e o app lembra. */
const CHAVE_POS_ORBE = "tgis:ia-orbe-pos";

/** Elemento interativo sob o ponto — o orbe não pode cobrir nada disso. */
function pontoOcupado(cx: number, cy: number): boolean {
  const el = document.elementFromPoint(cx, cy);
  if (!el || el.closest('[data-test="assistente-orbe"]')) return false;
  return !!el.closest(
    'button, a, input, select, textarea, label, [role="button"], [role="switch"], [role="option"]',
  );
}

/** Limita a posição à viewport. */
function prenderOrbe(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(Math.max(8, x), window.innerWidth - TAMANHO_ORBE - 8),
    y: Math.min(Math.max(8, y), window.innerHeight - TAMANHO_ORBE - 8),
  };
}

/** Desvio automático: se qualquer ponto da área cobrir elemento interativo,
 * procura o ponto livre mais próximo (subindo, depois descendo). */
function desviarOrbe(x: number, y: number): { x: number; y: number } {
  const livre = (px: number, py: number) => {
    const pontos: Array<[number, number]> = [
      [px + TAMANHO_ORBE / 2, py + TAMANHO_ORBE / 2],
      [px + 10, py + 10],
      [px + TAMANHO_ORBE - 10, py + 10],
      [px + 10, py + TAMANHO_ORBE - 10],
      [px + TAMANHO_ORBE - 10, py + TAMANHO_ORBE - 10],
    ];
    return pontos.every(([cx, cy]) => !pontoOcupado(cx, cy));
  };
  if (livre(x, y)) return { x, y };
  for (let py = y - 28; py >= 8; py -= 28) if (livre(x, py)) return { x, y: py };
  const limiteInferior = window.innerHeight - TAMANHO_ORBE - 8;
  for (let py = y + 28; py <= limiteInferior; py += 28) if (livre(x, py)) return { x, y: py };
  return { x, y };
}

/** Posição gravada pelo operador (ou null — usa o padrão do app). */
function carregarPosOrbe(): { x: number; y: number } | null {
  try {
    const bruto = localStorage.getItem(CHAVE_POS_ORBE);
    if (!bruto) return null;
    const v = JSON.parse(bruto) as { x: number; y: number };
    return prenderOrbe(v.x, v.y);
  } catch {
    return null;
  }
}

/** Posição padrão do orbe (o canto que o app sempre usou), em px. */
function posicaoPadraoOrbe(bussolaMiniNoMapa: boolean): { x: number; y: number } {
  const desktop = window.innerWidth >= 768;
  const margemDireita = desktop ? 24 : 12;
  const fundoBase = desktop ? 40 : 76; // md:bottom-10 · bottom-[4.75rem+safe]
  const fundo = bussolaMiniNoMapa ? 184 : fundoBase; // 11.5rem ≈ 184 px
  return prenderOrbe(
    window.innerWidth - TAMANHO_ORBE - margemDireita,
    window.innerHeight - TAMANHO_ORBE - fundo,
  );
}

export default function AssistenteFlutuante() {
  const { t } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { prefs } = usePreferences();
  const sensor = useSensorBussola();

  const [config, setConfig] = useState<ConfigIA>(CONFIG_PADRAO_IA);
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemTela[]>([]);
  const [texto, setTexto] = useState("");
  const [anexos, setAnexos] = useState<AnexoMensagem[]>([]);
  const [pensando, setPensando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [falando, setFalando] = useState(false);
  const [global, setGlobal] = useState<EntradaConhecimento[]>([]);
  const [personas, setPersonas] = useState<Personagem[]>([]);
  const [modoBussola, setModoBussola] = useState<"mini" | "panel" | "full">("mini");
  // Arraste do orbe: posição livre escolhida pelo operador (persistida) e
  // desvio automático de colisão — o orbe nunca cobre um botão/link/formulário.
  const [posOrbe, setPosOrbe] = useState<{ x: number; y: number } | null>(null);
  const origemArraste = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const moveuOrbe = useRef(false);
  const fimRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);

  // A bússola mini do mapa mora no mesmo canto inferior direito que o orbe.
  // Para NUNCA cobrir um ao outro, o orbe empilha ACIMA dela quando a bússola
  // mini está à vista (mesma condição do MapShell). O modo da bússola muda
  // dentro do próprio mapa — acompanhamos pelo evento que o MapShell dispara
  // (storage event não dispara na mesma aba) e ao voltar para o mapa.
  useEffect(() => {
    const ler = () => {
      try {
        const salvo = localStorage.getItem("tgis:compass-mode");
        setModoBussola(salvo === "panel" || salvo === "full" ? salvo : "mini");
      } catch {
        setModoBussola("mini");
      }
    };
    ler();
    window.addEventListener("tgis:compass-mode", ler);
    return () => window.removeEventListener("tgis:compass-mode", ler);
  }, []);

  // Estado inicial: chat da sessão anterior (contexto persiste no reload)
  // e a configuração mais recente (localStorage só existe no navegador).
  useEffect(() => {
    setConfig(lerConfigIA());
    setMensagens(carregarChat());
    setPosOrbe(carregarPosOrbe());
  }, []);

  const bussolaMiniNoMapa =
    path === "/" &&
    !prefs.telaLimpa &&
    prefs.mapMode === "tatico" &&
    prefs.telaVis?.bussola !== false &&
    modoBussola === "mini";

  // Sem posição escolhida pelo operador: usa o padrão do app (canto com a
  // coluna da bússola) e desvia se estiver cobrindo algo interativo.
  useEffect(() => {
    if (posOrbe) return;
    const id = window.setTimeout(() => {
      const padrao = posicaoPadraoOrbe(bussolaMiniNoMapa);
      setPosOrbe(desviarOrbe(padrao.x, padrao.y));
    }, 60);
    return () => window.clearTimeout(id);
  }, [bussolaMiniNoMapa, posOrbe]);

  // Desvio contínuo (1,2 s): conteúdo novo (lista, folha, botão) também é
  // respeitado — o orbe escorrega quando algo interativo fica embaixo dele.
  useEffect(() => {
    const desviar = () => setPosOrbe((p) => (p ? desviarOrbe(p.x, p.y) : p));
    const id = window.setInterval(desviar, 1200);
    const aoRedimensionar = () => setPosOrbe((p) => (p ? prenderOrbe(p.x, p.y) : p));
    window.addEventListener("resize", aoRedimensionar);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", aoRedimensionar);
    };
  }, []);

  /** Arraste (pointer) — toque curto continua abrindo o chat. */
  const orbePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const base = posOrbe ?? posicaoPadraoOrbe(bussolaMiniNoMapa);
    origemArraste.current = { x: e.clientX, y: e.clientY, px: base.x, py: base.y };
    moveuOrbe.current = false;
  };
  const orbePointerMove = (e: React.PointerEvent) => {
    if (!origemArraste.current) return;
    const dx = e.clientX - origemArraste.current.x;
    const dy = e.clientY - origemArraste.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moveuOrbe.current = true;
    if (moveuOrbe.current) {
      setPosOrbe(prenderOrbe(origemArraste.current.px + dx, origemArraste.current.py + dy));
    }
  };
  const orbePointerUp = () => {
    if (!origemArraste.current) return;
    origemArraste.current = null;
    if (moveuOrbe.current) {
      setPosOrbe((p) => {
        if (p) {
          try {
            localStorage.setItem(CHAVE_POS_ORBE, JSON.stringify(p));
          } catch {
            /* sem armazenamento — vale só na sessão */
          }
        }
        return p;
      });
    }
  };

  // Conhecimento global curado pelo admin (cache offline de 6 h) e o
  // catálogo de personagens (qual um deles pode encarnar a IA).
  useEffect(() => {
    void listarConhecimentoPublico().then(setGlobal);
    void carregarPersonas().then(setPersonas);
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, aberto, pensando]);

  const provedorNuvem = configTemChave(config);
  const status = provedorNuvem ? config.provider : "local";
  const persona = useMemo(() => personaAtiva(config, personas), [config, personas]);
  const nomeIA = nomeIAEfetivo(config, persona);

  /** Fala um texto com a voz do aparelho (pt-BR preferida). */
  const falar = useCallback(
    (texto: string) => {
      try {
        if (!("speechSynthesis" in window)) {
          toast.error(t("Este aparelho não suporta resposta falada"));
          return;
        }
        window.speechSynthesis.cancel();
        const fala = new SpeechSynthesisUtterance(texto.slice(0, 600));
        fala.lang = "pt-BR";
        fala.onend = () => setFalando(false);
        fala.onerror = () => setFalando(false);
        setFalando(true);
        window.speechSynthesis.speak(fala);
      } catch {
        setFalando(false);
      }
    },
    [t],
  );

  const silenciar = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* nada falando */
    }
    setFalando(false);
  }, []);

  const enviar = useCallback(
    async (pergunta: string, anexosMsg: AnexoMensagem[]) => {
      const perguntaLimpa = pergunta.trim();
      if ((!perguntaLimpa && anexosMsg.length === 0) || pensando) return;
      setPensando(true);
      setTexto("");
      setAnexos([]);

      const minha: MensagemTela = {
        id: novoId(),
        papel: "usuario",
        texto: perguntaLimpa || t("(anexo enviado)"),
        anexos: anexosMsg,
      };
      setMensagens((ms) => {
        const proximas = [...ms, minha];
        salvarChat(proximas);
        return proximas;
      });

      try {
        const resposta = await responder({
          pergunta: perguntaLimpa || t("Descreva o anexo que enviei"),
          config,
          persona,
          contexto: {
            centro: (() => {
              try {
                const bruto = localStorage.getItem("tgis:last-position");
                if (bruto) return JSON.parse(bruto) as { lat: number; lng: number };
              } catch {
                /* sem posição salva */
              }
              return undefined;
            })(),
          },
          historico: mensagens.map((m) => ({ papel: m.papel, texto: m.texto })),
          global,
          deps: {
            buscarNoticias: async () => {
              const ns = await buscarNoticiasNavegador();
              return ns.map((n) => ({ titulo: n.titulo, url: n.url, fonte: n.fonte }));
            },
            buscarClima: async (centro) => {
              const w = await fetchWeather({ data: centro });
              if (!w) return null;
              return {
                temperatura: w.temperature,
                condicao: w.condition,
                vento: w.windSpeed,
                umidade: w.humidity,
              };
            },
          },
        });

        const ia: MensagemTela = {
          id: novoId(),
          papel: "ia",
          texto: resposta.texto,
          origem: resposta.origem,
        };
        setMensagens((ms) => {
          const proximas = [...ms, ia];
          salvarChat(proximas);
          return proximas;
        });
        if (config.falarRespostas) falar(resposta.texto);
      } catch {
        const erro: MensagemTela = {
          id: novoId(),
          papel: "ia",
          texto: t("Tive um problema para responder. Tente de novo."),
          origem: "sem-resposta",
        };
        setMensagens((ms) => {
          const proximas = [...ms, erro];
          salvarChat(proximas);
          return proximas;
        });
      } finally {
        setPensando(false);
      }
    },
    [pensando, config, mensagens, global, falar, t, persona],
  );

  /* ---------------- Anexos (imagem, vídeo) ---------------- */
  const anexarArquivo = useCallback(
    async (arquivo: File) => {
      try {
        if (arquivo.type.startsWith("image/")) {
          const dataUrl = await comprimirImagem(arquivo);
          setAnexos((a) => [...a, { tipo: "imagem", dataUrl }]);
        } else if (arquivo.type.startsWith("video/")) {
          if (arquivo.size > 12 * 1024 * 1024) {
            toast.error(t("Vídeo muito grande para anexar (máx. 12 MB)"));
            return;
          }
          const dataUrl = await lerDataUrl(arquivo);
          setAnexos((a) => [...a, { tipo: "video", dataUrl }]);
        } else if (arquivo.type.startsWith("audio/")) {
          const dataUrl = await lerDataUrl(arquivo);
          setAnexos((a) => [...a, { tipo: "audio", dataUrl }]);
        } else {
          toast.error(t("Formato não suportado — use imagem, áudio ou vídeo"));
        }
      } catch {
        toast.error(t("Não consegui ler o arquivo"));
      }
    },
    [t],
  );

  /* ---------------- Microfone (MediaRecorder) ---------------- */
  const alternarGravacao = useCallback(async () => {
    if (gravando) {
      gravadorRef.current?.stop();
      return;
    }
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const gravador = new MediaRecorder(fluxo);
      pedacosRef.current = [];
      gravador.ondataavailable = (e) => {
        if (e.data.size > 0) pedacosRef.current.push(e.data);
      };
      gravador.onstop = async () => {
        fluxo.getTracks().forEach((tr) => tr.stop());
        setGravando(false);
        const blob = new Blob(pedacosRef.current, { type: gravador.mimeType || "audio/webm" });
        if (blob.size < 800) return; // toque acidental
        const dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.readAsDataURL(blob);
        });
        // Áudio: com provedor de nuvem vai como input_audio; no modo local,
        // registra como nota de voz na memória (transcrição é da nuvem).
        if (configTemChave(config)) {
          await enviar("", [{ tipo: "audio", dataUrl }]);
        } else {
          toast.message(t("Áudio gravado"), {
            description: t(
              "A transcrição de áudio precisa de uma chave API (Google AI Studio) — vou guardar como nota de voz.",
            ),
          });
          const nota: ParMemoria["origem"] = "operador";
          registrarPar(
            t("Nota de voz"),
            t("O operador gravou um áudio de {n} segundos nesta conversa.", {
              n: String(Math.max(1, Math.round(blob.size / 16000))),
            }),
            nota,
          );
          await enviar(t("Como usar a minha nota de voz?"), []);
        }
      };
      gravador.start();
      gravadorRef.current = gravador;
      setGravando(true);
    } catch {
      toast.error(t("Sem permissão de microfone"));
    }
  }, [gravando, config, enviar, t]);

  /* ---------------- Orbe: rumo real do aparelho ---------------- */
  const rumo = sensor.rumoAparelho;
  const corProvedor = useMemo(() => (provedorNuvem ? "#FF6B35" : "#34D399"), [provedorNuvem]);

  // Bússola mini à vista no mapa tático? O orbe sobe para a própria coluna
  // dela (tab bar → bússola → orbe) — nada sobrepõe nada. Sem bússola, o
  // orbe volta para o canto junto à barra. No desktop a bússola fica à
  // ESQUERDA: orbe permanece à direita, um pouco acima da atribuição.
  // Modo mapa limpo: o orbe some junto com todo o HUD.
  if (prefs.telaLimpa && path === "/") return null;

  return (
    <>
      {/* Orbe minimizado — anel funcional com o rumo do aparelho */}
      {!aberto && posOrbe && (
        <button
          type="button"
          data-test="assistente-orbe"
          onClick={() => {
            if (moveuOrbe.current) {
              moveuOrbe.current = false;
              return;
            }
            setAberto(true);
          }}
          onPointerDown={orbePointerDown}
          onPointerMove={orbePointerMove}
          onPointerUp={orbePointerUp}
          onPointerCancel={orbePointerUp}
          aria-label={t("Abrir assistente IA") + " — " + t("arraste para mover")}
          title={t("Arraste para mover o assistente")}
          style={{ left: posOrbe.x, top: posOrbe.y, touchAction: "none" }}
          className={`glove-tap fixed z-40 flex h-14 w-14 select-none items-center justify-center rounded-full border-2 border-border bg-card shadow-lg ${
            moveuOrbe.current ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full">
            {/* Anel externo: roda com o rumo do aparelho (como a mini bússola) */}
            <g
              style={{
                transform: `rotate(${-(rumo ?? 0)}deg)`,
                transformOrigin: "28px 28px",
                transition: "transform 120ms linear",
              }}
            >
              <circle cx="28" cy="6" r="2.6" fill={corProvedor} />
              <circle cx="28" cy="50" r="1.6" fill="#888" />
              <circle cx="6" cy="28" r="1.6" fill="#888" />
              <circle cx="50" cy="28" r="1.6" fill="#888" />
            </g>
            <circle
              cx="28"
              cy="28"
              r="20"
              fill="none"
              stroke={corProvedor}
              strokeOpacity="0.55"
              strokeWidth="1.4"
              strokeDasharray="3 4"
            />
          </svg>
          {persona?.url_imagem ? (
            <img
              src={persona.url_imagem}
              alt={persona.nome}
              data-test="assistente-orbe-persona"
              className="h-11 w-11 rounded-full bg-card object-cover object-top"
            />
          ) : (
            <Bot className="text-tactical-orange h-6 w-6" />
          )}
          <span className="mono absolute -bottom-1 rounded-full bg-background px-1 text-[8px] uppercase tracking-wider text-muted-foreground">
            {status === "local"
              ? "IA local"
              : config.provider === "google"
                ? "Gemini"
                : config.provider === "huggingface"
                  ? "HF"
                  : "API"}
          </span>
        </button>
      )}

      {/* Painel do chat */}
      {aberto && (
        <div
          data-test="assistente-painel"
          className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-2 left-2 z-40 flex h-[min(70dvh,560px)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl md:bottom-6 md:left-auto md:right-6 md:w-[380px]"
        >
          {/* Cabeçalho */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            {persona?.url_imagem ? (
              <img
                src={persona.url_imagem}
                alt={persona.nome}
                className="h-8 w-8 shrink-0 rounded-full bg-card object-cover object-top"
              />
            ) : (
              <span className="bg-tactical-orange/15 text-tactical-orange flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <Bot className="h-4.5 w-4.5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="mono truncate text-sm font-bold">{nomeIA}</p>
              <p className="text-muted-foreground truncate text-[10px] uppercase tracking-wider">
                {persona?.perfil?.trim() ||
                  (provedorNuvem
                    ? t("Conectada · memória local ativa")
                    : t("IA local · sem chave, funciona offline"))}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const proxima = !config.falarRespostas;
                const nova = { ...config, falarRespostas: proxima };
                setConfig(nova);
                salvarConfigIA(nova);
                if (proxima && mensagens.length > 0) {
                  const ultima = [...mensagens].reverse().find((m) => m.papel === "ia");
                  if (ultima) falar(ultima.texto);
                } else silenciar();
              }}
              aria-label={t("Resposta falada")}
              title={t("Resposta falada")}
              className={`p-1.5 ${config.falarRespostas ? "text-tactical-orange" : "text-muted-foreground hover:text-foreground"}`}
            >
              {falando ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <a
              href="/settings#assistente-ia"
              aria-label={t("Configurar assistente")}
              className="text-muted-foreground p-1.5 hover:text-foreground"
            >
              <Settings2 className="h-4 w-4" />
            </a>
            <button
              type="button"
              data-test="assistente-fechar"
              onClick={() => {
                silenciar();
                setAberto(false);
              }}
              aria-label={t("Minimizar assistente")}
              className="text-muted-foreground p-1.5 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mensagens */}
          <div
            className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3"
            data-test="assistente-mensagens"
          >
            {mensagens.length === 0 && (
              <div className="text-muted-foreground space-y-2 text-xs leading-relaxed">
                <p className="text-tactical-orange mono text-[11px] font-bold uppercase tracking-widest">
                  {t("{n} à sua disposição", { n: nomeIA })}
                </p>
                {persona && (
                  <p className="whitespace-pre-wrap text-foreground/90">
                    {apresentacaoPersona(persona)}
                  </p>
                )}
                <p>
                  {t(
                    "Peça ações do app, sobrevivência, clima e notícias — eu executo e respondo, e aprendo com cada conversa.",
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    t("Trace uma rota até o centro de Recife"),
                    t("Ative o radar de chuva"),
                    t("Quais as principais notícias?"),
                    t("Previsão para hoje"),
                    t("Como purificar água?"),
                  ].map((sugestao) => (
                    <button
                      key={sugestao}
                      type="button"
                      onClick={() => void enviar(sugestao, [])}
                      className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:border-tactical-orange/60 hover:text-tactical-orange"
                    >
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mensagens.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.papel === "usuario" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] space-y-1.5 rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    m.papel === "usuario"
                      ? "bg-tactical-orange/15 text-foreground"
                      : "bg-background/70 border border-border"
                  }`}
                >
                  {m.anexos?.map((a, i) =>
                    a.tipo === "imagem" ? (
                      <img key={i} src={a.dataUrl} alt="" className="max-h-32 rounded" />
                    ) : (
                      <span key={i} className="text-muted-foreground mono text-[10px] uppercase">
                        {a.tipo}
                      </span>
                    ),
                  )}
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                  {m.papel === "ia" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => (falando ? silenciar() : falar(m.texto))}
                        className="text-muted-foreground flex items-center gap-1 text-[10px] hover:text-foreground"
                      >
                        {falando ? (
                          <VolumeX className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        {t("Ouvir")}
                      </button>
                      {m.origem && m.origem !== "provedor" && (
                        <span className="text-muted-foreground/70 mono text-[9px] uppercase">
                          {m.origem === "memoria"
                            ? t("memória")
                            : m.origem === "global"
                              ? t("conhecimento oficial")
                              : m.origem === "local"
                                ? t("base local")
                                : m.origem === "acao"
                                  ? t("executado no app")
                                  : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {pensando && (
              <div className="flex justify-start">
                <div className="bg-background/70 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                  <Loader2 className="text-tactical-orange h-3.5 w-3.5 animate-spin" />
                  {t("Pensando…")}
                </div>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {/* Anexos pendentes */}
          {anexos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 pt-2">
              {anexos.map((a, i) => (
                <span
                  key={i}
                  className="text-muted-foreground flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px]"
                >
                  {a.tipo === "imagem" ? (
                    <img src={a.dataUrl} alt="" className="h-6 w-6 rounded object-cover" />
                  ) : (
                    <Paperclip className="h-3 w-3" />
                  )}
                  {a.tipo}
                  <button
                    type="button"
                    onClick={() => setAnexos((arr) => arr.filter((_, j) => j !== i))}
                    aria-label={t("Remover anexo")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Entrada: texto + mídia + voz */}
          <div className="flex items-end gap-1.5 border-t border-border p-2">
            <input
              ref={arquivoRef}
              type="file"
              accept="image/*,video/*,audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void anexarArquivo(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => arquivoRef.current?.click()}
              aria-label={t("Anexar imagem, áudio ou vídeo")}
              className="text-muted-foreground hover:text-foreground p-2"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-test="assistente-mic"
              onClick={() => void alternarGravacao()}
              aria-label={t("Gravar áudio")}
              className={`p-2 ${gravando ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Mic className="h-4 w-4" />
            </button>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void enviar(texto, anexos);
                }
              }}
              rows={1}
              placeholder={t("Pergunte ou peça uma ação…")}
              className="bg-input text-foreground max-h-24 min-h-10 flex-1 resize-none rounded-md border border-border px-3 py-2 text-sm"
              data-test="assistente-input"
            />
            <button
              type="button"
              data-test="assistente-enviar"
              onClick={() => void enviar(texto, anexos)}
              disabled={pensando || (!texto.trim() && anexos.length === 0)}
              aria-label={t("Enviar")}
              className="glove-tap bg-tactical-orange text-background flex h-10 w-10 items-center justify-center rounded-md disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-muted-foreground/60 pb-1.5 text-center text-[9px]">
            <Camera className="mr-1 inline h-2.5 w-2.5" />
            {t("Imagem, áudio e vídeo entram aqui · a chave API fica só no seu aparelho")}
          </p>
        </div>
      )}
    </>
  );
}
